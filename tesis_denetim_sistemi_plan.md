# Tesis Denetim Yönetim Sistemi — İş Planı & Agent Promptları

## Zorunlu Teknoloji Kararları

- **Containerization:** Docker + Docker Compose (değişmez)
- **Frontend:** React (Vite) + TypeScript + shadcn/ui (tüm componentler)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 15
- **ORM:** Prisma
- **Dosya Upload:** Multer
- **Excel Export:** ExcelJS (Türkçe karakter uyumlu)
- **Auth:** JWT (şifresiz, kullanıcı adı ile giriş)

---

## İş Planı

### Faz 1 — Altyapı & Temel Kurulum

| # | Görev | Teknoloji |
|---|-------|-----------|
| 1 | Docker Compose yapısı (frontend, backend, db, nginx) | Docker |
| 2 | PostgreSQL şema tasarımı + migration | Prisma ORM |
| 3 | JWT tabanlı auth (şifresiz, kullanıcı adı ile) | Node.js |
| 4 | shadcn/ui kurulumu + tema | React |

### Faz 2 — Admin Paneli

| # | Görev |
|---|-------|
| 5 | Kullanıcı yönetimi (admin oluşturur, rol atar) |
| 6 | Departman CRUD |
| 7 | Tesis konumu CRUD (ameliyathane, lab vb.) |

### Faz 3 — Denetim Formu & Listeleme

| # | Görev |
|---|-------|
| 8 | Denetim kaydı oluşturma formu |
| 9 | Fotoğraf upload (max 3 adet, 10MB/adet) |
| 10 | Liste görünümü + filtreler (konum, departman, sorumlu, tarih) |
| 11 | Durum takibi (Beklemede / Devam Ediyor / Tamamlandı / Gecikmiş) |

### Faz 4 — Excel Export

| # | Görev |
|---|-------|
| 12 | ExcelJS entegrasyonu (Türkçe karakter + UTF-8) |
| 13 | Konuma göre export |
| 14 | Departmana göre export |
| 15 | Sorumluya göre export |
| 16 | Termin tarihine göre / gecikmiş export |

### Faz 5 — Test & Deploy

| # | Görev |
|---|-------|
| 17 | Docker production build |
| 18 | Nginx reverse proxy + SSL (opsiyonel) |
| 19 | Seed data + kullanıcı kılavuzu |

---

## Ek Öneriler (Sisteme Eklenmesi Tavsiye Edilenler)

1. **Durum Geçmişi (Audit Log)** — Her kayıtta kimin ne zaman ne değiştirdiği
2. **Gecikme Uyarısı** — Termin tarihi geçmiş kayıtlar otomatik "Gecikmiş" statüsüne geçsin
3. **Öncelik Seviyesi** — Düşük / Orta / Yüksek / Kritik (Excel'de renkli gösterim için çok işe yarar)
4. **Toplu İşlem** — Listeden birden fazla kayıt seçip toplu durum güncelleme
5. **Fotoğraf Thumbnail** — Liste görünümünde küçük önizleme

---

## Agent Promptları

---

### Agent 1 — Proje Başlatma & Docker Kurulumu

```
You are a senior DevOps and full-stack architect. Your task is to scaffold a complete Docker Compose project with the following strict requirements:

STACK:
- Frontend: React (Vite) + TypeScript + shadcn/ui (ALL components installed)
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL 15
- ORM: Prisma
- Reverse Proxy: Nginx

DOCKER COMPOSE SERVICES:
1. `frontend` — React app, port 3000
2. `backend` — Node.js API, port 4000
3. `db` — PostgreSQL, persistent volume
4. `nginx` — reverse proxy routing /api → backend, / → frontend
5. `pgadmin` (optional dev tool)

REQUIREMENTS:
- All services must communicate via Docker internal network
- Use `.env` file for all secrets (DB credentials, JWT secret)
- Backend must have a `uploads/` volume for photo storage
- Include health checks for db and backend
- Include a `Makefile` with: `make dev`, `make build`, `make migrate`, `make seed`

OUTPUT: Complete `docker-compose.yml`, `docker-compose.prod.yml`, `nginx.conf`, `.env.example`, and `Makefile`.
```

---

### Agent 2 — Veritabanı Schema Tasarımı

```
You are a PostgreSQL database architect using Prisma ORM. Design the complete database schema for a Facility Audit Management System (Tesis Denetim Yönetim Sistemi) in Turkish.

ENTITIES AND RULES:

1. users
   - id, username (unique), full_name, role (ENUM: 'admin', 'manager'), is_active, created_at
   - NO password field — authentication is username-only with JWT
   - Admin users are created by other admins only

2. departments
   - id, name (e.g., "Ameliyathane Birimi"), description, created_by, created_at, is_active

3. locations
   - id, name (e.g., "Ameliyathane", "Laboratuvar"), description, floor, building, created_at, is_active

4. audit_items
   - id, title, current_status_description (TEXT), action_required (TEXT)
   - location_id (FK), responsible_department_id (FK), assigned_user_id (FK nullable)
   - status (ENUM: 'beklemede', 'devam_ediyor', 'tamamlandi', 'gecikti', 'iptal')
   - deadline (DATE), completion_date (DATE nullable)
   - priority (ENUM: 'dusuk', 'orta', 'yuksek', 'kritik')
   - created_by (FK users), created_at, updated_at

5. audit_photos
   - id, audit_item_id (FK), file_path, file_name, file_size, uploaded_at, uploaded_by

6. audit_logs (öneri)
   - id, audit_item_id (FK), changed_by (FK users), field_changed, old_value, new_value, changed_at

CONSTRAINTS:
- Max 3 photos per audit_item (enforce at application level AND DB trigger)
- Cascade deletes: deleting audit_item deletes its photos
- Add indexes on: status, deadline, location_id, responsible_department_id

OUTPUT: Complete Prisma schema.prisma file with all models, enums, relations, and indexes. Also provide the SQL migration equivalent.
```

---

### Agent 3 — Backend API Geliştirme

```
You are a senior Node.js/Express developer. Build a complete REST API for a Facility Audit Management System.

TECH: Node.js + Express + TypeScript + Prisma + JWT + Multer (file uploads) + ExcelJS

AUTH SYSTEM:
- POST /api/auth/login — accepts { username } only, returns JWT token
- Middleware: verifyToken, requireAdmin, requireManagerOrAdmin
- No passwords — username lookup only

API ENDPOINTS TO BUILD:

/api/users
  GET    / — list all users (admin only)
  POST   / — create user (admin only) { username, full_name, role }
  PATCH  /:id — update user (admin only)
  DELETE /:id — deactivate user (admin only)

/api/departments
  Full CRUD — admin only for write, all authenticated for read

/api/locations
  Full CRUD — admin only for write, all authenticated for read

/api/audit-items
  GET    / — list with filters: ?location_id=&department_id=&status=&assigned_user_id=&deadline_from=&deadline_to=&priority=
  POST   / — create new audit item
  GET    /:id — get single with photos
  PATCH  /:id — update
  DELETE /:id — soft delete (admin only)

/api/audit-items/:id/photos
  POST   / — upload photo (Multer, max 3 per item, max 10MB each, images only)
  DELETE /:photoId — delete photo

/api/export/excel
  GET /by-location?location_id= — export filtered by location
  GET /by-department?department_id= — export filtered by department
  GET /by-user?user_id= — export filtered by assigned user
  GET /by-deadline?from=&to=&overdue=true — export by deadline range
  GET /all — full export with all filters combined

EXCEL EXPORT REQUIREMENTS:
- Use ExcelJS library
- Set font to Calibri, enable Turkish character support (UTF-8)
- Workbook properties: creator="Tesis Yönetim Sistemi", language="tr"
- Each export must include: Konum, Mevcut Durum, Yapılacaklar, Sorumlu Departman, Sorumlu Kişi, Termin Tarihi, Durum, Öncelik
- Header row: bold, background color #1F4E79, white text, auto-filter enabled
- Alternate row colors for readability
- Column widths: auto-fit to content
- Add summary sheet with counts by status
- File name format: `tesis_denetim_[filtre]_[YYYY-MM-DD].xlsx`

ERROR HANDLING:
- All errors must return { success: false, message: "Türkçe hata mesajı", code: "ERROR_CODE" }
- Validate all inputs with express-validator
- Log errors with Winston

OUTPUT: Complete Express router files, middleware, ExcelJS export service, and Multer configuration.
```

---

### Agent 4 — Frontend & UI Geliştirme

```
You are a senior React developer specializing in shadcn/ui and TypeScript. Build the complete frontend for a Facility Audit Management System (Tesis Denetim Yönetim Sistemi).

TECH: React 18 + TypeScript + Vite + shadcn/ui (ALL components) + React Query + React Hook Form + Zod + Axios + date-fns (tr locale)

PAGES TO BUILD:

1. /login
   - Simple username input + login button
   - shadcn/ui: Card, Input, Button, Form
   - No password field

2. /dashboard
   - Summary cards: Toplam Kayıt, Beklemede, Gecikmiş, Bu Ay Tamamlanan
   - shadcn/ui: Card, Badge, Progress

3. /audit-items (main list)
   - Table with columns: Konum, Başlık, Durum, Öncelik, Sorumlu Departman, Termin Tarihi, İşlemler
   - Filters: Konum (Select), Departman (Select), Durum (Select), Öncelik (Select), Tarih aralığı (DatePicker)
   - Export buttons: "Konuma Göre İndir", "Departmana Göre İndir", "Sorumluya Göre İndir"
   - shadcn/ui: Table, Select, Button, Badge, DatePicker, DropdownMenu

4. /audit-items/new and /audit-items/:id/edit
   - Form fields:
     * Konum (Select — from locations)
     * Mevcut Durum Açıklaması (Textarea)
     * Fotoğraflar (max 3, drag-drop, preview, 10MB limit, show error if exceeded)
     * Alınacak Önlem / Yapılacaklar (Textarea)
     * Sorumlu Departman (Select)
     * Sorumlu Kişi (Select — optional)
     * Termin Tarihi (DatePicker — Turkish locale)
     * Öncelik (Select: Düşük/Orta/Yüksek/Kritik)
     * Durum (Select)
   - shadcn/ui: Form, Select, Textarea, Button, Calendar, Popover, Alert

5. /admin (admin only)
   - Tabs: Kullanıcılar | Departmanlar | Konumlar
   - Each tab: list table + add/edit dialog + delete confirm
   - shadcn/ui: Tabs, Dialog, AlertDialog, Table, Form

GLOBAL REQUIREMENTS:
- All text in Turkish
- Date format: DD.MM.YYYY (Turkish standard)
- Status badges with colors: beklemede=gray, devam_ediyor=blue, tamamlandi=green, gecikti=red, iptal=slate
- Priority badges: dusuk=green, orta=yellow, yuksek=orange, kritik=red
- Responsive layout (mobile-friendly)
- Toast notifications for all actions (shadcn/ui Toaster)
- Loading skeletons for all data fetches
- Role-based UI: admin sees all controls, manager sees limited controls
- Axios interceptor: attach JWT token to all requests, redirect to /login on 401

OUTPUT: Complete React component files, custom hooks, API service layer, and routing configuration.
```

---

### Agent 5 — Excel Export Kalite & Türkçe Karakter

```
You are an ExcelJS expert. Create a production-quality Excel export service for a Turkish facility management system.

CRITICAL REQUIREMENTS:

1. Turkish character support: ğ, ü, ş, ı, ö, ç, Ğ, Ü, Ş, İ, Ö, Ç must render correctly
   - Set workbook.properties.date1904 = false
   - Use UTF-8 encoding throughout
   - Test string: "Ameliyathane Ünitesi - Önlem Alınması Gereken Alanlar"

2. EXCEL STRUCTURE per export:
   Sheet 1: "Denetim Listesi"
   - Row 1: Report title (merged cells, large font)
   - Row 2: Export date + filter info
   - Row 3: Empty
   - Row 4: Headers (bold, colored background)
   - Row 5+: Data rows with alternating colors

   Sheet 2: "Özet"
   - Count by status (Beklemede, Devam Ediyor, Tamamlandı, Gecikmiş)
   - Count by priority
   - Count by location
   - Count by department

3. COLUMNS (in order):
   A: Sıra No (auto-numbered)
   B: Konum
   C: Mevcut Durum
   D: Yapılacaklar / Önlem
   E: Sorumlu Departman
   F: Sorumlu Kişi
   G: Öncelik
   H: Durum
   I: Termin Tarihi (DD.MM.YYYY format)
   J: Tamamlanma Tarihi
   K: Oluşturulma Tarihi
   L: Oluşturan

4. STYLING:
   - Header: font Calibri 11, bold, white text, background #1F4E79
   - Even rows: background #EBF3FB
   - Odd rows: background #FFFFFF
   - Overdue rows (gecikti): background #FFE0E0, red text for deadline column
   - Critical priority rows: bold text
   - All borders: thin, color #BDD7EE
   - Freeze top 4 rows
   - Auto-filter on header row
   - Column widths: A=8, B=20, C=40, D=40, E=25, F=20, G=12, H=15, I=15, J=15, K=15, L=20

5. FILE NAMING: `Tesis_Denetim_[FİLTRE]_[GG.AA.YYYY].xlsx`

OUTPUT: Complete TypeScript ExcelJS service class with methods: exportByLocation(), exportByDepartment(), exportByUser(), exportByDeadline(), exportAll(). Include full error handling and streaming response for large datasets.
```

---

*Hazırlayan: Tesis Denetim Yönetim Sistemi Planlama Dokümanı*
*Tarih: 2025*
