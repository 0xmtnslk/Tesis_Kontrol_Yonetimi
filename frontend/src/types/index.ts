export interface User {
  id: string
  username: string
  fullName: string
  role: 'admin' | 'manager'
  isActive: boolean
  createdAt: string
}

export interface Department {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface Location {
  id: string
  name: string
  description?: string
  floor?: string
  building?: string
  isActive: boolean
  createdAt: string
}

export type AuditStatus = 'beklemede' | 'devam_ediyor' | 'tamamlandi' | 'gecikti' | 'iptal'
export type Priority = 'dusuk' | 'orta' | 'yuksek' | 'kritik'

export interface AuditPhoto {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}

export interface AuditLog {
  id: string
  fieldChanged: string
  oldValue: string | null
  newValue: string | null
  changedAt: string
  changedBy: { fullName: string }
}

export interface AuditItem {
  id: string
  title: string
  currentStatusDescription: string
  actionRequired: string
  status: AuditStatus
  priority: Priority
  deadline: string
  completionDate?: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  locationId: string
  responsibleDeptId: string
  assignedUserId?: string
  createdById: string
  location: { id: string; name: string }
  responsibleDepartment: { id: string; name: string }
  assignedUser?: { id: string; fullName: string; username: string }
  createdBy: { id: string; fullName: string }
  photos?: AuditPhoto[]
  logs?: AuditLog[]
  _count?: { photos: number }
}

export interface DashboardStats {
  total: number
  beklemede: number
  devamEdiyor: number
  tamamlandi: number
  gecikti: number
  iptal: number
  buAyTamamlanan: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}
