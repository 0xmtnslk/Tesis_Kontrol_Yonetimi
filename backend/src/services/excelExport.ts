import ExcelJS from 'exceljs';
import { prisma } from '../utils/prisma';
import { AuditItem, Location, Department, User, AuditPhoto } from '@prisma/client';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import fs from 'fs';
import path from 'path';

type AuditItemWithRelations = AuditItem & {
  location: Location;
  responsibleDepartment: Department;
  assignedUser: User | null;
  createdBy: User;
  photos: AuditPhoto[];
};

const STATUS_LABELS: Record<string, string> = {
  beklemede: 'Beklemede',
  devam_ediyor: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  gecikti: 'Gecikmiş',
  iptal: 'İptal',
};

const PRIORITY_LABELS: Record<string, string> = {
  dusuk: 'Düşük',
  orta: 'Orta',
  yuksek: 'Yüksek',
  kritik: 'Kritik',
};

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return '-';
  return format(date, 'dd.MM.yyyy', { locale: tr });
};

const HEADER_COLOR = '1F4E79';
const EVEN_ROW_COLOR = 'EBF3FB';
const OVERDUE_ROW_COLOR = 'FFE0E0';
const BORDER_COLOR = 'BDD7EE';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

// Dimensions provided by user
// 133 pixels translates to ~100 points for row height
// 280 pixels translates to ~35 for column width (ExcelJS units)
const PHOTO_COL_WIDTH = 37;    // Adjusted for ~280-300 pixels
const ROW_HEIGHT_PX = 100;     // 133 pixels -> ~100 points
const PHOTO_SIZE_PX = 133;     // 3.5cm -> ~133 pixels

/**
 * Load image as base64 and determine extension
 */
const loadImageBase64 = (filePath: string): { base64: string; extension: 'jpeg' | 'png' | 'gif' } | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const imgBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeToExt: Record<string, 'jpeg' | 'png' | 'gif'> = {
      jpg: 'jpeg',
      jpeg: 'jpeg',
      png: 'png',
      gif: 'gif',
      webp: 'jpeg', // fallback
    };
    return {
      base64: imgBuffer.toString('base64'),
      extension: mimeToExt[ext] || 'jpeg',
    };
  } catch {
    return null;
  }
};

/**
 * Main data sheet with embedded photos in a dedicated column.
 */
const addDataSheet = async (
  workbook: ExcelJS.Workbook,
  items: AuditItemWithRelations[],
  title: string,
  filterInfo: string
) => {
  const sheet = workbook.addWorksheet('Denetim Listesi', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    properties: { tabColor: { argb: 'FF1F4E79' } },
  });

  // ── Column layout ──────────────────────────────────────
  // Col 1-12: Data
  // Col 13: Fotolar
  const COL_WIDTHS = [6, 18, 40, 40, 22, 18, 12, 14, 13, 16, 16, 18, PHOTO_COL_WIDTH];
  const COL_COUNT = COL_WIDTHS.length;

  COL_WIDTHS.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  const lastColLetter = String.fromCharCode(64 + COL_COUNT); // M

  // ── Title row ──────────────────────────────────────────
  sheet.mergeCells(`A1:${lastColLetter}1`);
  sheet.getRow(1).height = 35;
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E79' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Info row ───────────────────────────────────────────
  sheet.mergeCells(`A2:${lastColLetter}2`);
  sheet.getRow(2).height = 20;
  const infoCell = sheet.getCell('A2');
  infoCell.value = `Rapor Tarihi: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: tr })}   ${filterInfo}`;
  infoCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Header row ─────────────────────────────────────────
  const HEADER_LABELS = [
    'Sıra No', 'Konum', 'Mevcut Durum', 'Yapılacaklar / Önlem',
    'Sorumlu Dept.', 'Sorumlu Kişi', 'Öncelik', 'Durum',
    'Termin', 'Tamamlanma', 'Oluşturulma', 'Oluşturan', 'Fotolar'
  ];
  const headerRow = sheet.getRow(4);
  headerRow.height = 25;
  HEADER_LABELS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_COLOR}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      left: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      bottom: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      right: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
    };
  });

  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: COL_COUNT } };
  sheet.views = [{ state: 'frozen', ySplit: 4 }];

  // ── Data rows ──────────────────────────────────────────
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const rowNum = index + 5;
    const row = sheet.getRow(rowNum);
    row.height = ROW_HEIGHT_PX;

    const isOverdue = item.status === 'gecikti';
    const isCritical = item.priority === 'kritik';
    const isEven = index % 2 === 0;
    const bgColor = isOverdue ? OVERDUE_ROW_COLOR : isEven ? EVEN_ROW_COLOR : 'FFFFFF';

    const rowData = [
      index + 1,
      item.location.name,
      item.currentStatusDescription,
      item.actionRequired,
      item.responsibleDepartment.name,
      item.assignedUser?.fullName || '-',
      PRIORITY_LABELS[item.priority] || item.priority,
      STATUS_LABELS[item.status] || item.status,
      formatDate(item.deadline),
      formatDate(item.completionDate),
      formatDate(item.createdAt),
      item.createdBy.fullName,
      item.photos.length === 0 ? '-' : '' // Empty if photos will be added
    ];

    rowData.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = value;
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: isCritical && colIdx < 4,
        color: isOverdue && colIdx === 8 ? { argb: 'FFCC0000' } : { argb: 'FF000000' },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgColor}` } };
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: colIdx === 0 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
        left: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
        bottom: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
        right: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      };
    });

    // ── Insert Photos into Col 13 (M) ─────────────────────
    if (item.photos && item.photos.length > 0) {
      const photoColIdx = 13; // Column M
      const photosToShow = item.photos.slice(0, 2); // Show up to 2 side-by-side if width is 280px
      
      for (let p = 0; p < photosToShow.length; p++) {
        const photo = photosToShow[p];
        const filePath = path.join(UPLOAD_DIR, path.basename(photo.filePath));
        const imgData = loadImageBase64(filePath);

        if (imgData) {
          const imageId = workbook.addImage({
            base64: imgData.base64,
            extension: imgData.extension,
          });

          // Calculate offsets for side-by-side within the same cell
          // Row height is ~133px. Image size is ~133px.
          // Column width is 280px.
          sheet.addImage(imageId, {
            tl: { col: photoColIdx - 1 + (p * 0.5), row: rowNum - 1, nativeColOff: 5 * 10000, nativeRowOff: 5 * 10000 },
            ext: { width: PHOTO_SIZE_PX, height: PHOTO_SIZE_PX },
            editAs: 'oneCell'
          });
        }
      }
    }
  }

  return sheet;
};

const addSummarySheet = (workbook: ExcelJS.Workbook, items: AuditItemWithRelations[]) => {
  const sheet = workbook.addWorksheet('Özet', {
    properties: { tabColor: { argb: 'FF2E7D32' } },
  });

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};
  const deptCounts: Record<string, number> = {};

  items.forEach((item) => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
    locationCounts[item.location.name] = (locationCounts[item.location.name] || 0) + 1;
    deptCounts[item.responsibleDepartment.name] = (deptCounts[item.responsibleDepartment.name] || 0) + 1;
  });

  let rowNum = 1;

  const writeSection = (sectionTitle: string, data: Record<string, number>, labelMap?: Record<string, string>) => {
    sheet.mergeCells(rowNum, 1, rowNum, 3);
    const titleCell = sheet.getCell(rowNum, 1);
    titleCell.value = sectionTitle;
    titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_COLOR}` } };
    sheet.getRow(rowNum).height = 22;
    rowNum++;

    Object.entries(data).forEach(([key, count]) => {
      sheet.getCell(rowNum, 1).value = labelMap ? (labelMap[key] || key) : key;
      sheet.getCell(rowNum, 2).value = count;
      sheet.getCell(rowNum, 3).value = `${((count / items.length) * 100).toFixed(1)}%`;
      sheet.getRow(rowNum).height = 18;
      rowNum++;
    });
    rowNum++;
  };

  writeSection('Duruma Göre Özet', statusCounts, STATUS_LABELS);
  writeSection('Önceliğe Göre Özet', priorityCounts, PRIORITY_LABELS);
  writeSection('Konuma Göre Özet', locationCounts);
  writeSection('Departmana Göre Özet', deptCounts);

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 15;
};

export class ExcelExportService {
  async getItems(filter: Record<string, unknown>): Promise<AuditItemWithRelations[]> {
    return prisma.auditItem.findMany({
      where: { isDeleted: false, ...filter },
      include: {
        location: true,
        responsibleDepartment: true,
        assignedUser: true,
        createdBy: true,
        photos: true,
      },
      orderBy: [{ location: { name: 'asc' } }, { priority: 'desc' }, { deadline: 'asc' }],
    }) as unknown as AuditItemWithRelations[];
  }

  async generate(items: AuditItemWithRelations[], title: string, filterLabel: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tesis Denetim Yönetim Sistemi';
    workbook.lastModifiedBy = 'Sistem';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties.date1904 = false;

    await addDataSheet(workbook, items, title, filterLabel);
    addSummarySheet(workbook, items);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  async exportByLocation(locationId: string): Promise<{ buffer: Buffer; filename: string }> {
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    const items = await this.getItems({ locationId });
    const buffer = await this.generate(items, 'Tesis Denetim Listesi', `Konum: ${location?.name || locationId}`);
    const filename = `Tesis_Denetim_Konum_${format(new Date(), 'dd.MM.yyyy')}.xlsx`;
    return { buffer, filename };
  }

  async exportByDepartment(departmentId: string): Promise<{ buffer: Buffer; filename: string }> {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    const items = await this.getItems({ responsibleDeptId: departmentId });
    const buffer = await this.generate(items, 'Tesis Denetim Listesi', `Departman: ${dept?.name || departmentId}`);
    const filename = `Tesis_Denetim_Departman_${format(new Date(), 'dd.MM.yyyy')}.xlsx`;
    return { buffer, filename };
  }

  async exportByUser(userId: string): Promise<{ buffer: Buffer; filename: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const items = await this.getItems({ assignedUserId: userId });
    const buffer = await this.generate(items, 'Tesis Denetim Listesi', `Sorumlu: ${user?.fullName || userId}`);
    const filename = `Tesis_Denetim_Kisi_${format(new Date(), 'dd.MM.yyyy')}.xlsx`;
    return { buffer, filename };
  }

  async exportByDeadline(from?: string, to?: string, overdue?: boolean): Promise<{ buffer: Buffer; filename: string }> {
    const filter: Record<string, unknown> = {};
    if (overdue) {
      filter['status'] = 'gecikti';
    } else if (from || to) {
      filter['deadline'] = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }
    const filterLabel = overdue ? 'Gecikmiş Kayıtlar' : `Termin: ${from || '...'} - ${to || '...'}`;
    const items = await this.getItems(filter);
    const buffer = await this.generate(items, 'Tesis Denetim Listesi', filterLabel);
    const filename = `Tesis_Denetim_Termin_${format(new Date(), 'dd.MM.yyyy')}.xlsx`;
    return { buffer, filename };
  }

  async exportAll(filters?: Record<string, unknown>): Promise<{ buffer: Buffer; filename: string }> {
    const items = await this.getItems(filters || {});
    const buffer = await this.generate(items, 'Tesis Denetim Listesi - Tümü', 'Tüm Kayıtlar');
    const filename = `Tesis_Denetim_Tumu_${format(new Date(), 'dd.MM.yyyy')}.xlsx`;
    return { buffer, filename };
  }
}
