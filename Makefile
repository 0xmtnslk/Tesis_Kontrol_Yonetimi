.PHONY: dev build migrate seed stop clean logs ps

# Development
dev:
	docker-compose up --build -d
	@echo "🚀 Sistem başlatılıyor..."
	@echo "📱 Frontend: http://localhost"
	@echo "🔧 Backend API: http://localhost/api"
	@echo "🗄️  pgAdmin: http://localhost:5050"

# Stop all services
stop:
	docker-compose down

# Build production
build:
	docker-compose -f docker-compose.prod.yml build --no-cache

# Run migrations
migrate:
	docker-compose exec backend npx prisma migrate deploy

# Run migrations (dev mode with new migration)
migrate-dev:
	docker-compose exec backend npx prisma migrate dev

# Generate Prisma client
prisma-generate:
	docker-compose exec backend npx prisma generate

# Seed database
seed:
	docker-compose exec backend npx ts-node prisma/seed.ts

# View logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f db

# List running containers
ps:
	docker-compose ps

# Clean everything (DIKKAT: Veritabanı silinir!)
clean:
	docker-compose down -v --remove-orphans
	@echo "⚠️  Tüm veriler ve volumeler silindi!"

# Open bash in backend
shell-backend:
	docker-compose exec backend sh

# Open psql
shell-db:
	docker-compose exec db psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

# Reset database (DIKKAT!)
db-reset:
	docker-compose exec backend npx prisma migrate reset --force
