import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { DashboardStats } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  description,
}: {
  title: string
  value: number
  icon: React.ElementType
  colorClass: string
  description?: string
}) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/audit-items/stats').then((r) => r.data),
    refetchInterval: 60000,
  })

  const s = stats?.data

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted skeleton" />
          ))}
        </div>
      </div>
    )
  }

  const completionRate = s?.total ? Math.round((s.tamamlandi / s.total) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Hoş geldiniz, <span className="font-semibold text-foreground">{user?.fullName}</span> 👋
          </p>
        </div>
        <Button asChild>
          <Link to="/audit-items/new">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kayıt
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Kayıt"
          value={s?.total || 0}
          icon={ClipboardList}
          colorClass="bg-blue-100 text-blue-600"
          description="Tüm denetim kayıtları"
        />
        <StatCard
          title="Beklemede"
          value={s?.beklemede || 0}
          icon={Clock}
          colorClass="bg-slate-100 text-slate-600"
          description="İşlem bekleyen kayıtlar"
        />
        <StatCard
          title="Gecikmiş"
          value={s?.gecikti || 0}
          icon={AlertTriangle}
          colorClass="bg-red-100 text-red-600"
          description="Terminini geçmiş kayıtlar"
        />
        <StatCard
          title="Bu Ay Tamamlanan"
          value={s?.buAyTamamlanan || 0}
          icon={CheckCircle2}
          colorClass="bg-green-100 text-green-600"
          description="Bu ay başarıyla kapatılan"
        />
      </div>

      {/* Secondary stats + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Durum Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Beklemede', value: s?.beklemede || 0, cls: 'status-beklemede' },
              { label: 'Devam Ediyor', value: s?.devamEdiyor || 0, cls: 'status-devam_ediyor' },
              { label: 'Tamamlandı', value: s?.tamamlandi || 0, cls: 'status-tamamlandi' },
              { label: 'Gecikmiş', value: s?.gecikti || 0, cls: 'status-gecikti' },
              { label: 'İptal', value: s?.iptal || 0, cls: 'status-iptal' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${item.cls}`}>
                    {item.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/40 rounded-full transition-all"
                      style={{ width: `${s?.total ? (item.value / s.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-6 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Hızlı Erişim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-primary">{completionRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">Tamamlanma Oranı</p>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/audit-items?status=gecikti">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Gecikmiş Kayıtları Gör
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/audit-items?status=beklemede">
                  <Clock className="h-4 w-4 text-slate-500" />
                  Bekleyenleri Gör
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/audit-items/new">
                  <Plus className="h-4 w-4 text-primary" />
                  Yeni Kayıt Oluştur
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
