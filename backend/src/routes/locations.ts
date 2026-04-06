import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/locations
router.get('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
});

// GET /api/locations/:id
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const location = await prisma.location.findUnique({ where: { id: req.params.id } });
    if (!location) throw new AppError('Konum bulunamadı', 404, 'NOT_FOUND');
    res.json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
});

// POST /api/locations — Admin only
router.post(
  '/',
  verifyToken,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Konum adı gereklidir'),
    body('description').optional().trim(),
    body('floor').optional().trim(),
    body('building').optional().trim(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Geçersiz veri', errors: errors.array(), code: 'VALIDATION_ERROR' });
      }

      const { name, description, floor, building } = req.body;
      const existing = await prisma.location.findUnique({ where: { name } });
      if (existing) throw new AppError('Bu konum adı zaten mevcut', 409, 'DUPLICATE');

      const location = await prisma.location.create({
        data: { name, description, floor, building },
      });

      res.status(201).json({ success: true, message: 'Konum oluşturuldu', data: location });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/locations/:id — Admin only
router.patch('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, floor, building, isActive } = req.body;
    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(floor !== undefined && { floor }),
        ...(building !== undefined && { building }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ success: true, message: 'Konum güncellendi', data: location });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/locations/:id — Admin only
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.location.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Konum devre dışı bırakıldı' });
  } catch (error) {
    next(error);
  }
});

export default router;
