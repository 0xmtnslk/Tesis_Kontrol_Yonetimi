import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/departments
router.get('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { creator: { select: { fullName: true } } },
    });
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
});

// GET /api/departments/:id
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { creator: { select: { fullName: true } } },
    });
    if (!dept) throw new AppError('Departman bulunamadı', 404, 'NOT_FOUND');
    res.json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
});

// POST /api/departments — Admin only
router.post(
  '/',
  verifyToken,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Departman adı gereklidir'),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Geçersiz veri', errors: errors.array(), code: 'VALIDATION_ERROR' });
      }

      const { name, description } = req.body;
      const existing = await prisma.department.findUnique({ where: { name } });
      if (existing) throw new AppError('Bu departman adı zaten mevcut', 409, 'DUPLICATE');

      const dept = await prisma.department.create({
        data: { name, description, createdBy: req.user!.id },
      });

      res.status(201).json({ success: true, message: 'Departman oluşturuldu', data: dept });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/departments/:id — Admin only
router.patch('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, isActive } = req.body;
    const dept = await prisma.department.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ success: true, message: 'Departman güncellendi', data: dept });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/departments/:id — Admin only
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.department.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Departman devre dışı bırakıldı' });
  } catch (error) {
    next(error);
  }
});

export default router;
