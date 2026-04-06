import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { AuditItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateTime, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/utils'
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Building,
  User,
  CalendarDays,
  Clock,
  Image,
  History,
} from 'lucide-react'

export default function AuditItemDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery<{ success: boolean; data: AuditItem }>({
    queryKey: ['audit-item', id],
    queryFn: () => api.get(`/audit-items/${id}`).then((r) => r.data),
  })

  const item = data?.data

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted skeleton rounded w-1/3" />
        <div className="h-64 bg-muted skeleton rounded" />
      </div>
    )
  }

  if (!item) return <div className="p-6 text-muted-foreground">Kayıt bulunamadı.</div>

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/audit-items">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{item.title}</h1>
          <p className="text-xs text-muted-foreground">ID: {item.id}</p>
        </div>
        <Button asChild>
          <Link to={`/audit-items/${id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Genel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Durum</p>
                  <Badge variant="outline" className={`status-${item.status}`}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Öncelik</p>
                  <Badge variant="outline" className={`priority-${item.priority}`}>
                    {PRIORITY_LABELS[item.priority]}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Konum</p>
                    <p className="text-sm font-medium">{item.location.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sorumlu Departman</p>
                    <p className="text-sm font-medium">{item.responsibleDepartment.name}</p>
                  </div>
                </div>

                {item.assignedUser && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Atanan Kişi</p>
                      <p className="text-sm font-medium">{item.assignedUser.fullName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Termin Tarihi</p>
                    <p className={`text-sm font-medium ${item.status === 'gecikti' ? 'text-red-600' : ''}`}>
                      {formatDate(item.deadline)}
                    </p>
                  </div>
                </div>

                {item.completionDate && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tamamlanma Tarihi</p>
                      <p className="text-sm font-medium text-green-600">{formatDate(item.completionDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mevcut Durum Açıklaması</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.currentStatusDescription}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yapılacaklar / Alınacak Önlem</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.actionRequired}</p>
            </CardContent>
          </Card>
        </div>

        {/* Side */}
        <div className="space-y-4">
          {/* Photos */}
          {item.photos && item.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Fotoğraflar ({item.photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {item.photos.map((photo) => (
                    <a key={photo.id} href={photo.filePath} target="_blank" rel="noopener noreferrer">
                      <img
                        src={photo.filePath}
                        alt={photo.fileName}
                        className="w-full h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kayıt Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Oluşturan</p>
                <p>{item.createdBy.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Oluşturulma</p>
                <p>{formatDateTime(item.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Son Güncelleme</p>
                <p>{formatDateTime(item.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Audit logs */}
          {item.logs && item.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Değişiklik Geçmişi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {item.logs.map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-muted pl-2">
                      <p className="font-medium">{log.fieldChanged}</p>
                      <p className="text-muted-foreground">
                        {log.oldValue} → {log.newValue}
                      </p>
                      <p className="text-muted-foreground/70">
                        {log.changedBy.fullName} • {formatDateTime(log.changedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
