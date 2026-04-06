import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { AuditItem, Location, Department } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, STATUS_LABELS, PRIORITY_LABELS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/lib/utils'
import {
  Plus, Download, Filter, Eye, Pencil, RefreshCw,
  ChevronDown, ChevronRight, MapPin, AlertCircle, Image
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export default function AuditItemsPage() {
  const { toast } = useToast()
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState({
    department_id: '',
    status: '',
    priority: '',
  })

  // Fetch ALL items (no pagination) grouped by location
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['audit-items', filters],
    queryFn: () => {
      const params: Record<string, string> = { limit: '500' }
      if (filters.department_id) params.department_id = filters.department_id
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      return api.get('/audit-items', { params }).then((r) => r.data)
    },
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })
  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data),
  })

  const allLocations: Location[] = locationsData?.data || []
  const departments: Department[] = deptsData?.data || []
  const items: AuditItem[] = auditData?.data || []

  // Group items by location
  const itemsByLocation = items.reduce<Record<string, AuditItem[]>>((acc, item) => {
    const locId = item.location.id
    if (!acc[locId]) acc[locId] = []
    acc[locId].push(item)
    return acc
  }, {})

  // Locations that have items (or all if no filter)
  const activeLocationIds = Object.keys(itemsByLocation)

  // Also show locations with 0 items if no filters
  const locationsToShow = allLocations.filter(
    (l) => activeLocationIds.includes(l.id) || (!filters.department_id && !filters.status && !filters.priority)
  )

  const toggleLocation = (locId: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev)
      if (next.has(locId)) next.delete(locId)
      else next.add(locId)
      return next
    })
  }

  const expandAll = () => setExpandedLocations(new Set(allLocations.map((l) => l.id)))
  const collapseAll = () => setExpandedLocations(new Set())

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ department_id: '', status: '', priority: '' })
  }

  const handleExport = async (type: string, paramKey?: string, paramVal?: string) => {
    try {
      const token = useAuthStore.getState().token
      const params: Record<string, string> = {}
      if (paramKey && paramVal) params[paramKey] = paramVal

      const res = await axios.get(`/api/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: 'blob',
      })

      const contentDisposition = res.headers['content-disposition']
      let filename = 'tesis_denetim.xlsx'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/)
        if (match) filename = decodeURIComponent(match[1].replace(/"/g, ''))
      }

      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'İndirildi', description: 'Excel dosyası indirildi' })
    } catch {
      toast({ title: 'Hata', description: 'Excel oluşturulamadı', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string) => (
    <Badge variant="outline" className={`status-${status} text-xs whitespace-nowrap`}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
    </Badge>
  )

  const getPriorityBadge = (priority: string) => (
    <Badge variant="outline" className={`priority-${priority} text-xs whitespace-nowrap`}>
      {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || priority}
    </Badge>
  )

  const totalItems = items.length

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Denetim Kayıtları</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Yükleniyor...' : `${locationsToShow.length} konum • Toplam ${totalItems} kayıt`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Yenile
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>
            Tümünü Aç
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Tümünü Kapat
          </Button>
          <Button asChild>
            <Link to="/audit-items/new">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Kayıt
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

            <Select value={filters.department_id || 'all'} onValueChange={(v) => updateFilter('department_id', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="Departman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.status || 'all'} onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.priority || 'all'} onValueChange={(v) => updateFilter('priority', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {(filters.department_id || filters.status || filters.priority) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Filtreleri Temizle
              </Button>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> Export:
            </span>
            <Button variant="outline" size="sm" className="h-7 text-xs"
              onClick={() => handleExport('all')}>
              Tüm Kayıtlar
            </Button>
            {filters.department_id && (
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => handleExport('by-department', 'department_id', filters.department_id)}>
                Departmana Göre İndir
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs text-red-600"
              onClick={() => handleExport('by-deadline', 'overdue', 'true')}>
              Gecikmiş Kayıtlar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Locations grouped list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <div className="p-4">
                <div className="h-5 bg-muted skeleton rounded w-1/4 mb-2" />
                <div className="h-4 bg-muted skeleton rounded w-1/6" />
              </div>
            </Card>
          ))}
        </div>
      ) : locationsToShow.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Konum bulunamadı.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {locationsToShow.map((location) => {
            const locationItems = itemsByLocation[location.id] || []
            const isExpanded = expandedLocations.has(location.id)
            const overdueCount = locationItems.filter(i => i.status === 'gecikti').length
            const pendingCount = locationItems.filter(i => i.status === 'beklemede' || i.status === 'devam_ediyor').length

            return (
              <Card key={location.id} className="overflow-hidden">
                {/* Location Header - Clickable */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                  onClick={() => toggleLocation(location.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-base">{location.name}</h2>
                        {overdueCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertCircle className="h-3 w-3" />
                            {overdueCount} gecikmiş
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {locationItems.length === 0
                          ? 'Kayıt yok'
                          : `${locationItems.length} kayıt${pendingCount > 0 ? ` • ${pendingCount} aktif` : ''}`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Export this location */}
                    {locationItems.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => handleExport('by-location', 'location_id', location.id)}
                      >
                        <Download className="h-3 w-3" />
                        Excel
                      </Button>
                    )}
                    {/* Add new item to this location */}
                    <Button asChild size="sm" className="h-8 gap-1">
                      <Link to={`/audit-items/new?location_id=${location.id}`}>
                        <Plus className="h-3.5 w-3.5" />
                        Tespit Ekle
                      </Link>
                    </Button>
                    {/* Toggle icon */}
                    <div className="text-muted-foreground w-5">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Audit items for this location */}
                {isExpanded && (
                  <div className="border-t">
                    {locationItems.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Bu konumda henüz kayıt bulunmuyor.
                        <br />
                        <Link
                          to={`/audit-items/new?location_id=${location.id}`}
                          className="text-primary hover:underline mt-1 inline-block"
                        >
                          + İlk tespiti ekle
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground text-xs">Tespit / Başlık</th>
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground text-xs">Durum</th>
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground text-xs">Öncelik</th>
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground text-xs">Sorumlu Dept.</th>
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground text-xs">Termin</th>
                              <th className="text-right py-2 px-4 font-medium text-muted-foreground text-xs">İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {locationItems.map((item) => (
                              <tr key={item.id} className="border-t hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-medium text-sm truncate max-w-xs">{item.title}</div>
                                  {item.assignedUser && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {item.assignedUser.fullName}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                                <td className="py-3 px-4">{getPriorityBadge(item.priority)}</td>
                                <td className="py-3 px-4">
                                  <span className="text-xs text-muted-foreground">{item.responsibleDepartment.name}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-xs font-medium ${item.status === 'gecikti' ? 'text-red-600' : 'text-foreground'}`}>
                                    {formatDate(item.deadline)}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                      <Link to={`/audit-items/${item.id}`}>
                                        <Eye className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                      <Link to={`/audit-items/${item.id}/edit`}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
