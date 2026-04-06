import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { User, Department, Location } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2, Shield, Users, Building, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

// User management
function UsersTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', fullName: '', role: 'manager' })

  const { data, isLoading } = useQuery<{ data: User[] }>({
    queryKey: ['users-admin'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const save = useMutation({
    mutationFn: () => editing
      ? api.patch(`/users/${editing.id}`, { fullName: form.fullName, role: form.role })
      : api.post('/users', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Başarılı', description: editing ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu' })
      setOpen(false)
      setEditing(null)
      setForm({ username: '', fullName: '', role: 'manager' })
    },
    onError: (err: any) => toast({ title: 'Hata', description: err.response?.data?.message || 'İşlem başarısız', variant: 'destructive' }),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin'] })
      toast({ title: 'Kullanıcı devre dışı bırakıldı' })
    },
    onError: (err: any) => toast({ title: 'Hata', description: err.response?.data?.message || 'İşlem başarısız', variant: 'destructive' }),
  })

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({ username: u.username, fullName: u.fullName, role: u.role })
    setOpen(true)
  }

  const users: User[] = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setForm({ username: '', fullName: '', role: 'manager' }); setOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Kullanıcı
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ad Soyad</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Kullanıcı Adı</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rol</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Durum</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Yükleniyor...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 font-medium">{u.fullName}</td>
                <td className="py-3 px-4 font-mono text-muted-foreground">{u.username}</td>
                <td className="py-3 px-4">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role === 'admin' ? '🛡️ Admin' : '👤 Yönetici'}</Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant={u.isActive ? 'default' : 'secondary'} className={u.isActive ? 'bg-green-100 text-green-700 border-green-200' : ''}>
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {u.isActive && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deactivate.mutate(u.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div>
                <Label>Kullanıcı Adı</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="kullanici.adi" />
              </div>
            )}
            <div>
              <Label>Ad Soyad</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Ad Soyad" />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Departments tab
function DepartmentsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const { data } = useQuery<{ data: Department[] }>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })

  const save = useMutation({
    mutationFn: () => editing ? api.patch(`/departments/${editing.id}`, form) : api.post('/departments', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Başarılı', description: editing ? 'Departman güncellendi' : 'Departman oluşturuldu' })
      setOpen(false); setEditing(null); setForm({ name: '', description: '' })
    },
    onError: (err: any) => toast({ title: 'Hata', description: err.response?.data?.message || 'Hata', variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); toast({ title: 'Departman devre dışı bırakıldı' }) },
    onError: (err: any) => toast({ title: 'Hata', description: err.response?.data?.message || 'Hata', variant: 'destructive' }),
  })

  const departments: Department[] = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Departman
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Departman Adı</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Açıklama</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Oluşturulma</th>
              <th className="text-right py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="border-t hover:bg-muted/20">
                <td className="py-3 px-4 font-medium">{d.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{d.description || '-'}</td>
                <td className="py-3 px-4 text-muted-foreground">{formatDate(d.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(d); setForm({ name: d.name, description: d.description || '' }); setOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(d.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Departmanı Düzenle' : 'Yeni Departman'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Departman Adı</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Locations tab
function LocationsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState({ name: '', description: '', floor: '', building: '' })

  const { data } = useQuery<{ data: Location[] }>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then(r => r.data),
  })

  const save = useMutation({
    mutationFn: () => editing ? api.patch(`/locations/${editing.id}`, form) : api.post('/locations', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast({ title: 'Başarılı', description: editing ? 'Konum güncellendi' : 'Konum oluşturuldu' })
      setOpen(false); setEditing(null); setForm({ name: '', description: '', floor: '', building: '' })
    },
    onError: (err: any) => toast({ title: 'Hata', description: err.response?.data?.message || 'Hata', variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); toast({ title: 'Konum devre dışı bırakıldı' }) },
    onError: (err: any) => toast({ title: 'Hata', description: err.response?.data?.message || 'Hata', variant: 'destructive' }),
  })

  const locations: Location[] = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', floor: '', building: '' }); setOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Yeni Konum
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Konum</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Bina / Kat</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Açıklama</th>
              <th className="text-right py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id} className="border-t hover:bg-muted/20">
                <td className="py-3 px-4 font-medium">{l.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{[l.building, l.floor].filter(Boolean).join(' / ') || '-'}</td>
                <td className="py-3 px-4 text-muted-foreground">{l.description || '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(l); setForm({ name: l.name, description: l.description || '', floor: l.floor || '', building: l.building || '' }); setOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(l.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Konumu Düzenle' : 'Yeni Konum'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Konum Adı</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bina</Label><Input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="A Blok" /></div>
              <div><Label>Kat</Label><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="3. Kat" /></div>
            </div>
            <div><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Paneli</h1>
          <p className="text-sm text-muted-foreground">Kullanıcı, departman ve konum yönetimi</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="users">
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" /> Kullanıcılar
              </TabsTrigger>
              <TabsTrigger value="departments" className="gap-2">
                <Building className="h-4 w-4" /> Departmanlar
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-2">
                <MapPin className="h-4 w-4" /> Konumlar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="departments"><DepartmentsTab /></TabsContent>
            <TabsContent value="locations"><LocationsTab /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
