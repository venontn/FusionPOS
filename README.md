# FusionPOS

Offline-first point of sale system for retail businesses in Zimbabwe.

## Architecture

| Layer | Stack |
|-------|--------|
| Desktop POS | Electron + React + Vite + SQLite (`better-sqlite3`) |
| Cloud API | Django REST Framework + SQLite/PostgreSQL |
| Sync | Desktop pushes unsynced sales to `POST /api/sync/push/` when online |

## Quick start

### 1. Backend API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

API: http://127.0.0.1:8000/api/health/

Optional PostgreSQL:

```powershell
docker compose up -d
# Set DATABASE_URL in backend/.env to postgres://fusionpos:fusionpos@localhost:5433/fusionpos
```

### 2. Desktop app

```powershell
cd desktop
npm install
npm run electron:install   # if you see "Electron uninstall"
npm run rebuild            # if better-sqlite3 NODE_MODULE_VERSION error
npm run dev
```

### Demo logins

| User | Password | Role |
|------|----------|------|
| admin | admin123 | Admin (inventory, suppliers) |
| cashier | cashier123 | Cashier (POS, reports) |

## Features

- **POS** — barcode scan, product search, cart, cash/mobile money/card, receipt print
- **Inventory** — products, stock levels, low-stock alerts (admin)
- **Suppliers** — supplier directory (admin)
- **Reports** — line/bar/pie charts, daily/weekly/monthly CSV downloads, authorized refunds
- **Multi-user** — cashier and admin can work simultaneously (shared DB, active session bar)
- **Remote monitor** — admin opens http://127.0.0.1:8000/monitor/ to view live shop activity anywhere
- **Refund security** — cashiers need refund PIN or admin password; admins use their password
- **Offline** — all sales stored locally; sync when API is reachable

### Demo shops (001 onwards)

| ID | Shop |
|----|------|
| 001 | Harare CBD Supermarket |
| 002 | Borrowdale Mini Mart |
| 003 | Bulawayo City Grocers |
| 004 | Mutare Main Street Pharmacy & Goods |
| 005 | Gweru Retail Hub |
| 006 | Chitungwiza Community Store |

Select your shop in **Settings**. Run `python manage.py seed_demo` to load all six on the live monitor at http://127.0.0.1:8000/monitor/

## Project layout

```
FusionPOS/
├── backend/          Django REST API
├── desktop/          Electron POS client
├── docker-compose.yml
└── FusionPOS-Business-Proposal.md
```

Built by **Fusion 5 Technologies**.
