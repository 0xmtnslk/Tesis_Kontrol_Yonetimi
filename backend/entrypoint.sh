#!/bin/sh
set -e

echo "=========================================="
echo " Tesis Denetim - Başlatma Scripti"
echo "=========================================="

# Extract host and port from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@||' | sed 's|:.*||')
DB_PORT=$(echo "$DATABASE_URL" | sed 's|.*:||' | sed 's|/.*||')

# Default port if not found
DB_PORT=${DB_PORT:-5432}

echo "⏳ Veritabanı bekleniyor ($DB_HOST:$DB_PORT)..."
RETRIES=30
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null || [ $RETRIES -eq 0 ]; do
  echo "   DB hazır değil, bekleniyor... ($RETRIES deneme kaldı)"
  RETRIES=$((RETRIES - 1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "❌ Veritabanına bağlanılamadı! Çıkılıyor."
  exit 1
fi

echo "✅ Veritabanı bağlantısı hazır!"

# Additional wait for PostgreSQL to fully initialize
sleep 3

# Run Prisma migrations (idempotent - safe to run every time)
echo "🔄 Veritabanı migration'ları çalıştırılıyor..."
npx prisma migrate deploy
echo "✅ Migration'lar tamamlandı!"

# Run seed (all upsert-based, safe to run multiple times)
echo "🌱 Seed verileri kontrol ediliyor / yükleniyor..."
npx ts-node prisma/seed.ts
echo "✅ Seed tamamlandı!"

echo "=========================================="
echo " 🚀 Uygulama başlatılıyor..."
echo "=========================================="

# Start the application (replace current shell process)
exec npm run dev
