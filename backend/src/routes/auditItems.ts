import { Router, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuditStatus, Priority } from '@prisma/client';

const router = Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `audit-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Sadece resim dosyaları yüklenebilir (JPEG, PNG, GIF, WebP)', 400, 'INVALID_FILE_TYPE'));
    }
  },
});

// Helper: auto-mark overdue items
const checkAndMarkOverdue = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.auditItem.updateMany({
    where: {
      deadline: { lt: today },
      status: { in: [AuditStatus.beklemede, AuditStatus.devam_ediyor] },
      isDeleted: false,
    },
    data: { status: AuditStatus.gecikti },
  });
};

// GET /api/audit-items
router.get('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await checkAndMarkOverdue();

    const {
      location_id,
      department_id,
      status,
      assigned_user_id,
      deadline_from,
      deadline_to,
      priority,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { isDeleted: false };
    if (location_id) where['locationId'] = location_id;
    if (department_id) where['responsibleDeptId'] = department_id;
    if (status) where['status'] = status as AuditStatus;
    if (assigned_user_id) where['assignedUserId'] = assigned_user_id;
    if (priority) where['priority'] = priority as Priority;
    if (deadline_from || deadline_to) {
      where['deadline'] = {
        ...(deadline_from && { gte: new Date(deadline_from) }),
        ...(deadline_to && { lte: new Date(deadline_to) }),
      };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      prisma.auditItem.findMany({
        where,
        include: {
          location: { select: { id: true, name: true } },
          responsibleDepartment: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, fullName: true, username: true } },
          createdBy: { select: { id: true, fullName: true } },
          photos: { select: { id: true, fileName: true, filePath: true, fileSize: true } },
          _count: { select: { photos: true } },
        },
        orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
        skip,
        take: limitNum,
      }),
      prisma.auditItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/audit-items/stats — Dashboard statistics
router.get('/stats', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await checkAndMarkOverdue();

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [total, beklemede, devamEdiyor, tamamlandi, gecikti, iptal, buAyTamamlanan] = await Promise.all([
      prisma.auditItem.count({ where: { isDeleted: false } }),
      prisma.auditItem.count({ where: { isDeleted: false, status: AuditStatus.beklemede } }),
      prisma.auditItem.count({ where: { isDeleted: false, status: AuditStatus.devam_ediyor } }),
      prisma.auditItem.count({ where: { isDeleted: false, status: AuditStatus.tamamlandi } }),
      prisma.auditItem.count({ where: { isDeleted: false, status: AuditStatus.gecikti } }),
      prisma.auditItem.count({ where: { isDeleted: false, status: AuditStatus.iptal } }),
      prisma.auditItem.count({
        where: {
          isDeleted: false,
          status: AuditStatus.tamamlandi,
          completionDate: { gte: startOfMonth },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        beklemede,
        devamEdiyor,
        tamamlandi,
        gecikti,
        iptal,
        buAyTamamlanan,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/audit-items/:id
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.auditItem.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: {
        location: true,
        responsibleDepartment: true,
        assignedUser: { select: { id: true, fullName: true, username: true } },
        createdBy: { select: { id: true, fullName: true } },
        photos: true,
        logs: {
          include: { changedBy: { select: { fullName: true } } },
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!item) throw new AppError('Denetim kaydı bulunamadı', 404, 'NOT_FOUND');
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/audit-items
router.post(
  '/',
  verifyToken,
  [
    body('title').trim().notEmpty().withMessage('Başlık gereklidir'),
    body('currentStatusDescription').trim().notEmpty().withMessage('Mevcut durum açıklaması gereklidir'),
    body('actionRequired').trim().notEmpty().withMessage('Yapılacaklar gereklidir'),
    body('locationId').notEmpty().withMessage('Konum seçimi gereklidir'),
    body('responsibleDeptId').notEmpty().withMessage('Sorumlu departman seçimi gereklidir'),
    body('deadline').isISO8601().withMessage('Geçerli bir termin tarihi giriniz'),
    body('priority').isIn(['dusuk', 'orta', 'yuksek', 'kritik']).withMessage('Geçerli bir öncelik seçiniz'),
    body('status').optional().isIn(['beklemede', 'devam_ediyor', 'tamamlandi', 'gecikti', 'iptal']),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Geçersiz veri', errors: errors.array(), code: 'VALIDATION_ERROR' });
      }

      const {
        title,
        currentStatusDescription,
        actionRequired,
        locationId,
        responsibleDeptId,
        assignedUserId,
        deadline,
        priority,
        status = 'beklemede',
      } = req.body;

      const item = await prisma.auditItem.create({
        data: {
          title,
          currentStatusDescription,
          actionRequired,
          locationId,
          responsibleDeptId,
          assignedUserId: assignedUserId || null,
          deadline: new Date(deadline),
          priority,
          status,
          createdById: req.user!.id,
        },
        include: {
          location: { select: { id: true, name: true } },
          responsibleDepartment: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, fullName: true } },
        },
      });

      res.status(201).json({ success: true, message: 'Denetim kaydı oluşturuldu', data: item });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/audit-items/:id
router.patch('/:id', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.auditItem.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new AppError('Denetim kaydı bulunamadı', 404, 'NOT_FOUND');

    const {
      title,
      currentStatusDescription,
      actionRequired,
      locationId,
      responsibleDeptId,
      assignedUserId,
      deadline,
      priority,
      status,
      completionDate,
    } = req.body;

    // Log changes
    const logEntries: { fieldChanged: string; oldValue: string | null; newValue: string | null }[] = [];
    const trackField = (field: string, oldVal: unknown, newVal: unknown) => {
      if (newVal !== undefined && String(oldVal) !== String(newVal)) {
        logEntries.push({
          fieldChanged: field,
          oldValue: oldVal ? String(oldVal) : null,
          newValue: newVal ? String(newVal) : null,
        });
      }
    };

    if (status) trackField('status', existing.status, status);
    if (priority) trackField('priority', existing.priority, priority);
    if (deadline) trackField('deadline', existing.deadline?.toISOString(), deadline);

    const updatedItem = await prisma.auditItem.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(currentStatusDescription && { currentStatusDescription }),
        ...(actionRequired && { actionRequired }),
        ...(locationId && { locationId }),
        ...(responsibleDeptId && { responsibleDeptId }),
        ...(assignedUserId !== undefined && { assignedUserId: assignedUserId || null }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(priority && { priority }),
        ...(status && {
          status,
          ...(status === 'tamamlandi' && !existing.completionDate && { completionDate: new Date() }),
        }),
        ...(completionDate !== undefined && { completionDate: completionDate ? new Date(completionDate) : null }),
      },
      include: {
        location: { select: { id: true, name: true } },
        responsibleDepartment: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, fullName: true } },
      },
    });

    // Create audit logs
    if (logEntries.length > 0) {
      await prisma.auditLog.createMany({
        data: logEntries.map((entry) => ({
          ...entry,
          auditItemId: id,
          changedById: req.user!.id,
        })),
      });
    }

    res.json({ success: true, message: 'Denetim kaydı güncellendi', data: updatedItem });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/audit-items/:id — Soft delete, admin only
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.auditItem.update({
      where: { id: req.params.id },
      data: { isDeleted: true },
    });
    res.json({ success: true, message: 'Denetim kaydı silindi' });
  } catch (error) {
    next(error);
  }
});

// POST /api/audit-items/:id/photos
router.post(
  '/:id/photos',
  verifyToken,
  upload.single('photo'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const item = await prisma.auditItem.findFirst({
        where: { id, isDeleted: false },
        include: { _count: { select: { photos: true } } },
      });

      if (!item) throw new AppError('Denetim kaydı bulunamadı', 404, 'NOT_FOUND');

      const maxPhotos = parseInt(process.env.MAX_PHOTOS_PER_ITEM || '3');
      if (item._count.photos >= maxPhotos) {
        if (req.file) fs.unlinkSync(req.file.path);
        throw new AppError(`Her kayda en fazla ${maxPhotos} fotoğraf yüklenebilir`, 400, 'MAX_PHOTOS_EXCEEDED');
      }

      if (!req.file) throw new AppError('Fotoğraf dosyası gereklidir', 400, 'NO_FILE');

      const photo = await prisma.auditPhoto.create({
        data: {
          auditItemId: id,
          fileName: req.file.originalname,
          filePath: `/uploads/${req.file.filename}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedById: req.user!.id,
        },
      });

      res.status(201).json({ success: true, message: 'Fotoğraf yüklendi', data: photo });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/audit-items/:id/photos/:photoId
router.delete('/:id/photos/:photoId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const photo = await prisma.auditPhoto.findUnique({
      where: { id: req.params.photoId },
    });

    if (!photo) throw new AppError('Fotoğraf bulunamadı', 404, 'NOT_FOUND');

    // Delete file from disk
    const fullPath = path.join(process.env.UPLOAD_DIR || '/app/uploads', path.basename(photo.filePath));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await prisma.auditPhoto.delete({ where: { id: req.params.photoId } });
    res.json({ success: true, message: 'Fotoğraf silindi' });
  } catch (error) {
    next(error);
  }
});

export default router;
