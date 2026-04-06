import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    fullName: string;
  };
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Yetkilendirme token\'ı gerekli', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT secret yapılandırılmamış', 500, 'CONFIG_ERROR');

    const decoded = jwt.verify(token, secret) as { id: string; username: string; role: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
      select: { id: true, username: true, role: true, fullName: true },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı veya aktif değil', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Geçersiz token', 401, 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Bu işlem için admin yetkisi gereklidir', 403, 'FORBIDDEN'));
  }
  next();
};

export const requireManagerOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!['admin', 'manager'].includes(req.user?.role || '')) {
    return next(new AppError('Bu işlem için yetki gereklidir', 403, 'FORBIDDEN'));
  }
  next();
};
