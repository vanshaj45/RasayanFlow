# Pharmacy Lab Inventory Management System (Backend)

## Overview
Production-ready Node.js/Express backend for a laboratory inventory system with role-based access and real-time events.

- Database: MongoDB (Mongoose)
- Auth: JWT
- Real-time: Socket.IO
- Security: Helmet, CORS, rate-limiting
- Logging: Winston + morgan

## Setup
1. `cd backend`
2. `npm install`
3. copy `.env.example` to `.env`
4. Set `.env` values:
   - `MONGO_URI` (or default uses your supplied connection string)
   - `JWT_SECRET`
   - `PORT`
5. `npm run dev` or `npm start`

## Super Admin HARD RULE
- Email: `vanshajbairagi10@gmail.com`
- Always:
  - `role = superAdmin`
  - `isApproved = true`
- This user bypasses all approval checks.

## Route Summary

### Public
- `POST /auth/register` - Create account (student/labAdmin via role, superAdmin by hardcoded email)
- `POST /auth/login` - Login and receive JWT

### Super Admin-only
- `POST /labs` - Create lab
- `GET /labs` - List labs
- `POST /labs/assign` - Assign lab admin
- `POST /labs/remove` - Remove lab admin
- `PUT /labs/approve/:adminId` - Approve admin
- `GET /logs` - View activity logs

### Lab Admin + Super Admin
- `POST /inventory` - Add inventory
- `PUT /inventory/:id` - Update inventory
- `DELETE /inventory/:id` - Delete inventory
- `GET /inventory` - Search/paginate (any authenticated user can query)
- `GET /inventory/:id` - Inventory detail
- `GET /transactions` - View transactions
- `GET /users` - List users
- `PUT /users/approve/:userId` - Approve user

### Students + Lab Admin + Super Admin
- `POST /transactions/borrow`
- `POST /transactions/return`

## Model Behavior / Important Rules
- `inventory.quantity` cannot go negative.
- Borrow requires enough stock.
- Returning increases stock.
- Low-stock auto alert logs when `quantity < minThreshold`.
- `lab.admins` max 2 enforced with assign call.
- Unapproved non-superadmin cannot access protected routes.

## Socket.IO events (client subscriptions)
- `inventoryUpdated` -> payload `{ action: 'created|updated|deleted|borrow|return', item }`
- `itemBorrowed` -> socket event on borrow
- `itemReturned` -> socket event on return

## JSON Web Tokens
- Send header: `Authorization: Bearer <token>`
- Issued at login and registration.

## Validation
- All request bodies are validated via `express-validator` and centrally handled.
- Error middleware sends JSON responses with `success: false`.

## Example SCENARIOS

### 1) SuperAdmin register/login
1. `POST /auth/register`:
   - `name`, `email` = `vanshajbairagi10@gmail.com`, `password`
   - returns `role=superAdmin`, `isApproved=true`
2. `POST /auth/login` -> get token
3. Use token for all SuperAdmin routes above.

### 2) LabAdmin flow
1. SuperAdmin creates lab `POST /labs`.
2. SuperAdmin registers labAdmin user with `role=labAdmin`.
3. `POST /labs/assign` body `{ labId, adminId }`.
4. `PUT /labs/approve/:adminId` -> approves admin.
5. LabAdmin login and seed inventory:
   - `POST /inventory` with `labId`, `itemName`, `quantity`, `unit`, `minThreshold`.
6. CRUD inventory and monitor `/transactions`.

### 3) Student flow
1. Student registration `POST /auth/register`.
2. SuperAdmin or LabAdmin approves via `PUT /users/approve/:userId`.
3. Student login and fetch inventory `GET /inventory`.
4. Borrow:
   - `POST /transactions/borrow` with `itemId`, `quantity`.
5. Return:
   - `POST /transactions/return` with `itemId`, `quantity`.

## Deployment notes
- Ensure env var `JWT_SECRET` is strong.
- Ensure `MONGO_URI` uses Atlas + TLS.
- Add logging and monitoring around `logs/` dir.

## Useful Commands
- `npm run dev` (nodemon)
- `npm start` production
- `npm run seed:demo` loads repeatable demo labs, users, inventory, transactions, and activity logs

## Quick Curl examples
### Register Student
```bash
curl -X POST http://localhost:5000/auth/register -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com","password":"Secret12"}'
```

### Login
```bash
curl -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d '{"email":"john@example.com","password":"Secret12"}'
```

### Add inventory (admin)
```bash
curl -X POST http://localhost:5000/inventory -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"labId":"LAB_ID","itemName":"Gloves","quantity":100,"unit":"pieces","minThreshold":20}'
```

### Borrow item (student)
```bash
curl -X POST http://localhost:5000/transactions/borrow -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"itemId":"ITEM_ID","quantity":10}'
```

## Final thoughts
This README is intentionally extensive.
Keep your API users aware of role limitations and required approval sequence, make sure to configure `rate-limit` and `helmet` in your deployment.
