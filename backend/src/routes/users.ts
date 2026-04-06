import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/users — Admin only
router.get('/', verifyToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users — Admin only
router.post(
  '/',
  verifyToken,
  requireAdmin,
  [
    body('username').trim().notEmpty().withMessage('Kullanıcı adı gereklidir').isLength({ min: 3, max: 50 }),
    body('fullName').trim().notEmpty().withMessage('Ad soyad gereklidir'),
    body('role').isIn(['admin', 'manager']).withMessage('Rol admin veya manager olmalıdır'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Geçersiz veri', errors: errors.array(), code: 'VALIDATION_ERROR' });
      }

      const { username, fullName, role } = req.body;

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        throw new AppError('Bu kullanıcı adı zaten kullanılıyor', 409, 'DUPLICATE_USERNAME');
      }

      const user = await prisma.user.create({
        data: { username, fullName, role },
        select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
      });

      res.status(201).json({ success: true, message: 'Kullanıcı oluşturuldu', data: user });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/users/:id — Admin only
router.patch(
  '/:id',
  verifyToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { fullName, role, isActive } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(fullName && { fullName }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
        },
        select: { id: true, username: true, fullName: true, role: true, isActive: true },
      });

      res.json({ success: true, message: 'Kullanıcı güncellendi', data: user });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/users/:id — Admin only (deactivate)
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (id === req.user?.id) {
      throw new AppError('Kendi hesabınızı devre dışı bırakamazsınız', 400, 'SELF_DELETE');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Kullanıcı devre dışı bırakıldı' });
  } catch (error) {
    next(error);
  }
});

export default router;
