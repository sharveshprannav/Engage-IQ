# ╔══════════════════════════════════════════════════════════════════╗
# ║                    EngageAI Makefile                             ║
# ╚══════════════════════════════════════════════════════════════════╝

.PHONY: help up down build restart logs migrate seed test lint format clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Docker Compose ──────────────────────────────────────────────
up: ## Start all services
	docker compose up -d

up-build: ## Build and start all services
	docker compose up -d --build

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose down && docker compose up -d

logs: ## Tail logs from all services
	docker compose logs -f

logs-backend: ## Tail backend logs
	docker compose logs -f backend

logs-worker: ## Tail worker logs
	docker compose logs -f worker

# ─── Database ────────────────────────────────────────────────────
migrate: ## Run Alembic migrations
	docker compose exec backend alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create MSG="description")
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

migrate-rollback: ## Rollback last migration
	docker compose exec backend alembic downgrade -1

seed: ## Seed database with demo data
	docker compose exec backend python -m infra.scripts.seed_data

init-chroma: ## Initialize ChromaDB collections
	docker compose exec backend python -m infra.scripts.init_chroma

# ─── Testing ─────────────────────────────────────────────────────
test: ## Run all tests
	docker compose exec backend pytest tests/ -v --tb=short
	cd frontend && npx vitest run

test-backend: ## Run backend tests only
	docker compose exec backend pytest tests/ -v --tb=short

test-frontend: ## Run frontend tests only
	cd frontend && npx vitest run

# ─── Code Quality ────────────────────────────────────────────────
lint: ## Run linters
	docker compose exec backend ruff check .
	cd frontend && npx eslint src/

format: ## Auto-format code
	docker compose exec backend ruff format .
	cd frontend && npx prettier --write src/

# ─── Cleanup ─────────────────────────────────────────────────────
clean: ## Remove all containers, volumes, and build artifacts
	docker compose down -v --remove-orphans
	docker system prune -f

# ─── Setup ───────────────────────────────────────────────────────
setup: ## First-time setup: copy env, build, migrate, seed
	@test -f .env || cp .env.example .env
	docker compose up -d --build
	@echo "Waiting for services to be healthy..."
	@sleep 10
	docker compose exec backend alembic upgrade head
	docker compose exec backend python -m infra.scripts.seed_data
	docker compose exec backend python -m infra.scripts.init_chroma
	@echo "✅ EngageAI is ready! Visit http://localhost:3000"
