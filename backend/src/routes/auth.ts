import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Kullanıcı adı gereklidir')
      .isLength({ min: 3, max: 50 })
      .withMessage('Kullanıcı adı 3-50 karakter arasında olmalıdır'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz giriş bilgisi',
          errors: errors.array(),
          code: 'VALIDATION_ERROR',
        });
      }

      const { username } = req.body;

      const user = await prisma.user.findUnique({
        where: { username, isActive: true },
        select: { id: true, username: true, fullName: true, role: true },
      });

      if (!user) {
        throw new AppError('Kullanıcı bulunamadı veya hesap pasif', 401, 'USER_NOT_FOUND');
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new AppError('JWT yapılandırma hatası', 500, 'CONFIG_ERROR');

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        secret,
        { expiresIn: '8h' }
      );

      res.json({
        success: true,
        message: 'Giriş başarılı',
        data: {
          token,
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Token gerekli', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
      select: { id: true, username: true, fullName: true, role: true, createdAt: true },
    });

    if (!user) throw new AppError('Kullanıcı bulunamadı', 404, 'NOT_FOUND');

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
