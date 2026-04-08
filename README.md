# RasayanFlow

RasayanFlow is a multi-role laboratory inventory and request management system for pharmacy and chemistry workflows. It includes separate dashboards for super admins, lab admins, store admins, and students, along with experiment management, borrowing workflows, audit logs, and PubChem/PubMed-based chemical enrichment.

## Stack

- Backend: Node.js, Express, MongoDB, Socket.IO
- Frontend: React, Vite, Zustand, Tailwind CSS
- Deployment: Render-compatible

## Structure

```text
backend/                         Express API, MongoDB models, controllers, routes
Frontendd/PharmLab_Frontend/     React frontend
render.yaml                      Render deployment configuration
PRODUCTION_READY.md              deployment notes / status summary
```

## Core Features

- JWT authentication and role-based access control
- Multi-lab inventory management
- Store inventory and store allotment workflows
- Student chemical search across labs
- Direct borrow requests and approval flow
- Experiment creation and experiment request flow
- PubChem CAS autofill and PubMed abstract lookup
- Audit logging and websocket-driven refreshes

## Roles

- `superAdmin`: full system administration, user approval, lab assignment, admin creation
- `labAdmin`: inventory management, experiment management, borrow approvals for assigned lab
- `storeAdmin`: store inventory, store request approvals, student allotments
- `student`: search inventory, request borrowings, request experiments, view history

## Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Required backend environment variables:

- `MONGO_URI`
- `JWT_SECRET`
- `SUPER_ADMIN_EMAIL`

Optional backend environment variables:

- `PORT`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `CORS_ORIGIN`

### Frontend

```bash
cd Frontendd/PharmLab_Frontend
npm install
cp .env.example .env
npm run dev
```

Required frontend environment variables:

- `VITE_API_BASE_URL` or `VITE_API_BASE`

Optional frontend environment variables:

- `VITE_API_TIMEOUT`
- `VITE_APP_VERSION`

## Main Route Groups

The backend currently exposes these route groups:

- `/auth`
- `/labs`
- `/inventory`
- `/experiments`
- `/experiment-requests`
- `/store-items`
- `/store-allotments`
- `/transactions`
- `/users`
- `/logs`

## Database Models

Current MongoDB models in the backend:

- `User`
- `Lab`
- `Inventory`
- `Experiment`
- `ExperimentRequest`
- `StoreItem`
- `StoreAllotment`
- `Transaction`
- `ActivityLog`

## Production Notes

- Set `CORS_ORIGIN` on the backend to your deployed frontend origin.
- Use a strong `JWT_SECRET`.
- Use a managed MongoDB deployment.
- Do not commit real `.env` secrets.
- Build the frontend before deployment:

```bash
cd Frontendd/PharmLab_Frontend
npm run build
```

- Start the backend in production:

```bash
cd backend
npm start
```

## Verification

Frontend:

```bash
cd Frontendd/PharmLab_Frontend
npm run build
```

Backend module checks:

```bash
cd backend
node -e "require('./controllers/inventoryController'); console.log('ok')"
```
