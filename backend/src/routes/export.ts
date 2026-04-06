import { Router, Response, NextFunction } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { ExcelExportService } from '../services/excelExport';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const excelService = new ExcelExportService();

const sendExcel = (res: Response, buffer: Buffer, filename: string) => {
  const encodedFilename = encodeURIComponent(filename);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
};

// GET /api/export/by-location
router.get('/by-location', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location_id } = req.query;
    if (!location_id) throw new AppError('location_id parametresi gereklidir', 400, 'MISSING_PARAM');

    const { buffer, filename } = await excelService.exportByLocation(location_id as string);
    sendExcel(res, buffer, filename);
  } catch (error) {
    next(error);
  }
});

// GET /api/export/by-department
router.get('/by-department', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { department_id } = req.query;
    if (!department_id) throw new AppError('department_id parametresi gereklidir', 400, 'MISSING_PARAM');

    const { buffer, filename } = await excelService.exportByDepartment(department_id as string);
    sendExcel(res, buffer, filename);
  } catch (error) {
    next(error);
  }
});

// GET /api/export/by-user
router.get('/by-user', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.query;
    if (!user_id) throw new AppError('user_id parametresi gereklidir', 400, 'MISSING_PARAM');

    const { buffer, filename } = await excelService.exportByUser(user_id as string);
    sendExcel(res, buffer, filename);
  } catch (error) {
    next(error);
  }
});

// GET /api/export/by-deadline
router.get('/by-deadline', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to, overdue } = req.query;
    const { buffer, filename } = await excelService.exportByDeadline(
      from as string,
      to as string,
      overdue === 'true'
    );
    sendExcel(res, buffer, filename);
  } catch (error) {
    next(error);
  }
});

// GET /api/export/all
router.get('/all', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location_id, department_id, status, priority } = req.query;
    const filters: Record<string, unknown> = {};
    if (location_id) filters['locationId'] = location_id;
    if (department_id) filters['responsibleDeptId'] = department_id;
    if (status) filters['status'] = status;
    if (priority) filters['priority'] = priority;

    const { buffer, filename } = await excelService.exportAll(filters);
    sendExcel(res, buffer, filename);
  } catch (error) {
    next(error);
  }
});

export default router;
