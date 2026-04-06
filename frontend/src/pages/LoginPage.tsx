import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, LogIn, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      toast({ title: 'Hata', description: 'Kullanıcı adı gereklidir', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { username: username.trim() })
      const { token, user } = res.data.data
      login(token, user)
      toast({ title: 'Başarılı', description: `Hoş geldiniz, ${user.fullName}!` })
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Giriş yapılamadı. Kullanıcı adınızı kontrol edin.'
      toast({ title: 'Giriş Hatası', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tesis Denetim</h1>
          <p className="text-muted-foreground text-sm mt-1">Yönetim Sistemi</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Giriş Yap</CardTitle>
            <CardDescription>Sisteme erişmek için kullanıcı adınızı girin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="kullanici.adi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  className="h-11"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Giriş Yap
                  </>
                )}
              </Button>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Demo hesaplar: <span className="font-mono font-semibold">admin</span> veya{' '}
                  <span className="font-mono font-semibold">ali.yilmaz</span>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2025 Tesis Denetim Yönetim Sistemi
        </p>
      </div>
    </div>
  )
}
