import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import api from '@/lib/api'
import { Location, Department, User, AuditItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, X, Loader2, Image, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, formatFileSize } from '@/lib/utils'
import { format } from 'date-fns'

interface FormData {
  title: string
  currentStatusDescription: string
  actionRequired: string
  locationId: string
  responsibleDeptId: string
  assignedUserId: string
  deadline: string
  priority: string
  status: string
}

export default function AuditItemFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const defaultLocationId = searchParams.get('location_id') || ''

  const [form, setForm] = useState<FormData>({
    title: '',
    currentStatusDescription: '',
    actionRequired: '',
    locationId: defaultLocationId,
    responsibleDeptId: '',
    assignedUserId: '',
    deadline: '',
    priority: 'orta',
    status: 'beklemede',
  })

  const [photos, setPhotos] = useState<File[]>([])
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; filePath: string; fileName: string }[]>([])
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [photoError, setPhotoError] = useState('')

  // Fetch existing item for edit
  const { data: existingItem } = useQuery<{ success: boolean; data: AuditItem }>({
    queryKey: ['audit-item', id],
    queryFn: () => api.get(`/audit-items/${id}`).then((r) => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingItem?.data) {
      const item = existingItem.data
      setForm({
        title: item.title,
        currentStatusDescription: item.currentStatusDescription,
        actionRequired: item.actionRequired,
        locationId: item.locationId,
        responsibleDeptId: item.responsibleDeptId,
        assignedUserId: item.assignedUserId || '',
        deadline: item.deadline ? format(new Date(item.deadline), 'yyyy-MM-dd') : '',
        priority: item.priority,
        status: item.status,
      })
      setExistingPhotos(item.photos || [])
    }
  }, [existingItem])

  const { data: locationsData } = useQuery({ queryKey: ['locations'], queryFn: () => api.get('/locations').then(r => r.data) })
  const { data: deptsData } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const locations: Location[] = locationsData?.data || []
  const departments: Department[] = deptsData?.data || []
  const users: User[] = usersData?.data || []

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setPhotoError('')
    if (rejectedFiles.length > 0) {
      setPhotoError('Bazı dosyalar reddedildi. Sadece resim dosyaları (JPEG, PNG, GIF, WebP), max 10MB.')
      return
    }
    const total = existingPhotos.length + photos.length + acceptedFiles.length
    if (total > 3) {
      setPhotoError('En fazla 3 fotoğraf yükleyebilirsiniz.')
      return
    }
    setPhotos((prev) => [...prev, ...acceptedFiles])
  }, [photos, existingPhotos])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 3,
  })

  const validate = (): boolean => {
    const errs: Partial<FormData> = {}
    if (!form.title.trim()) errs.title = 'Başlık gereklidir'
    if (!form.currentStatusDescription.trim()) errs.currentStatusDescription = 'Mevcut durum açıklaması gereklidir'
    if (!form.actionRequired.trim()) errs.actionRequired = 'Yapılacaklar gereklidir'
    if (!form.locationId) errs.locationId = 'Konum seçiniz'
    if (!form.responsibleDeptId) errs.responsibleDeptId = 'Sorumlu departman seçiniz'
    if (!form.deadline) errs.deadline = 'Termin tarihi gereklidir'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        currentStatusDescription: form.currentStatusDescription,
        actionRequired: form.actionRequired,
        locationId: form.locationId,
        responsibleDeptId: form.responsibleDeptId,
        assignedUserId: form.assignedUserId || null,
        deadline: form.deadline,
        priority: form.priority,
        status: form.status,
      }

      let itemId = id
      if (isEdit) {
        await api.patch(`/audit-items/${id}`, payload)
      } else {
        const res = await api.post('/audit-items', payload)
        itemId = res.data.data.id
      }

      // Upload photos
      for (const photo of photos) {
        const formData = new FormData()
        formData.append('photo', photo)
        await api.post(`/audit-items/${itemId}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      return itemId
    },
    onSuccess: (itemId) => {
      queryClient.invalidateQueries({ queryKey: ['audit-items'] })
      queryClient.invalidateQueries({ queryKey: ['audit-item', id] })
      toast({ title: 'Başarılı', description: isEdit ? 'Kayıt güncellendi' : 'Kayıt oluşturuldu' })
      navigate(`/audit-items/${itemId}`)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Bir hata oluştu'
      toast({ title: 'Hata', description: msg, variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  const removeNewPhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const removeExistingPhoto = async (photoId: string) => {
    try {
      await api.delete(`/audit-items/${id}/photos/${photoId}`)
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId))
      queryClient.invalidateQueries({ queryKey: ['audit-item', id] })
      toast({ title: 'Fotoğraf silindi' })
    } catch {
      toast({ title: 'Hata', description: 'Fotoğraf silinemedi', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isEdit ? `/audit-items/${id}` : '/audit-items'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">
          {isEdit ? 'Kaydı Düzenle' : 'Yeni Denetim Kaydı'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Başlık *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Denetim kaydı başlığı"
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>

            {/* Location & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Konum *</Label>
                <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v })}>
                  <SelectTrigger className={errors.locationId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Konum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.locationId && <p className="text-xs text-destructive mt-1">{errors.locationId}</p>}
              </div>

              <div>
                <Label>Sorumlu Departman *</Label>
                <Select value={form.responsibleDeptId} onValueChange={(v) => setForm({ ...form, responsibleDeptId: v })}>
                  <SelectTrigger className={errors.responsibleDeptId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.responsibleDeptId && <p className="text-xs text-destructive mt-1">{errors.responsibleDeptId}</p>}
              </div>
            </div>

            {/* Assigned user, deadline, priority, status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Sorumlu Kişi (Opsiyonel)</Label>
                <Select value={form.assignedUserId || 'none'} onValueChange={(v) => setForm({ ...form, assignedUserId: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kişi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Atanmamış</SelectItem>
                    {users.filter(u => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="deadline">Termin Tarihi *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className={errors.deadline ? 'border-destructive' : ''}
                />
                {errors.deadline && <p className="text-xs text-destructive mt-1">{errors.deadline}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Öncelik</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Durum</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Açıklamalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentStatus">Mevcut Durum Açıklaması *</Label>
              <Textarea
                id="currentStatus"
                value={form.currentStatusDescription}
                onChange={(e) => setForm({ ...form, currentStatusDescription: e.target.value })}
                placeholder="Mevcut durumu detaylıca açıklayın..."
                rows={4}
                className={errors.currentStatusDescription ? 'border-destructive' : ''}
              />
              {errors.currentStatusDescription && <p className="text-xs text-destructive mt-1">{errors.currentStatusDescription}</p>}
            </div>

            <div>
              <Label htmlFor="actionRequired">Yapılacaklar / Alınacak Önlem *</Label>
              <Textarea
                id="actionRequired"
                value={form.actionRequired}
                onChange={(e) => setForm({ ...form, actionRequired: e.target.value })}
                placeholder="Yapılması gerekenleri açıklayın..."
                rows={4}
                className={errors.actionRequired ? 'border-destructive' : ''}
              />
              {errors.actionRequired && <p className="text-xs text-destructive mt-1">{errors.actionRequired}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              Fotoğraflar (Max 3, 10MB/adet)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Existing photos */}
            {existingPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {existingPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.filePath}
                      alt={photo.fileName}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(photo.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New photos preview */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {photos.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded-lg border border-dashed border-primary/50"
                    />
                    <div className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
                      {formatFileSize(file.size)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Dropzone */}
            {existingPhotos.length + photos.length < 3 && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? 'Bırakın...' : 'Fotoğraf sürükleyin veya tıklayın'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  JPEG, PNG, GIF, WebP • Max 10MB • {3 - existingPhotos.length - photos.length} adet kaldı
                </p>
              </div>
            )}

            {photoError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {photoError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" asChild>
            <Link to={isEdit ? `/audit-items/${id}` : '/audit-items'}>İptal</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Güncelle' : 'Oluştur'}
          </Button>
        </div>
      </form>
    </div>
  )
}
