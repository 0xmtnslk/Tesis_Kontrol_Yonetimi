import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { AuditStatus, Priority } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd.MM.yyyy', { locale: tr })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: tr })
}

export const STATUS_LABELS: Record<AuditStatus, string> = {
  beklemede: 'Beklemede',
  devam_ediyor: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  gecikti: 'Gecikmiş',
  iptal: 'İptal',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  dusuk: 'Düşük',
  orta: 'Orta',
  yuksek: 'Yüksek',
  kritik: 'Kritik',
}

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))
export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))

export function getStatusClass(status: AuditStatus): string {
  return `status-${status}`
}

export function getPriorityClass(priority: Priority): string {
  return `priority-${priority}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isOverdue(deadline: string, status: AuditStatus): boolean {
  if (['tamamlandi', 'iptal'].includes(status)) return false
  return new Date(deadline) < new Date()
}
