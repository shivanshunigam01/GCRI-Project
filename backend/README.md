# GRAICE Assessment Platform — Backend Service

Express.js + TypeScript REST API service for the GRAICE Responsible AI Assessment Platform.

## Architecture
- **Framework**: Express.js with TypeScript (`tsx` for hot-reload dev)
- **Database**: MongoDB via Mongoose ODM
- **Authentication**: JWT Bearer Tokens with Role-Based Access Control (Admin, Assessor, Membership Approver)
- **Validation**: Strict schema validation using Zod at the API boundary
- **Security**: Helmet, CORS, password hashing via bcryptjs (12 rounds)
- **Compliance**: Audit logging (`AuditLog` collection) tracking all sensitive actions

## Directory Layout
```text
backend/
├── src/
│   ├── config/          # MongoDB connection & pool management
│   ├── controllers/     # Route logic & audit log creation
│   ├── middlewares/     # Auth, RBAC, Validation & Error Handling
│   ├── models/          # Mongoose Schemas (User, Company, Assessment, Audit)
│   ├── routes/          # Express v1 route definitions
│   ├── schemas/         # Zod request validation definitions
│   ├── utils/           # Standard API response envelopes
│   └── index.ts         # Express server bootstrap
├── .env.example
├── package.json
└── tsconfig.json
```

## Running the Backend

### 1. Configure Environment
```bash
cp .env.example .env
```
Update `MONGODB_URI` and `JWT_SECRET` with your values.

### 2. Run in Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

### 3. Health Check
```bash
curl http://localhost:5000/api/v1/health
```

## Production (EC2 + PM2)

`dist/` is not in git. On the server you must install dependencies and compile before PM2 can start.

```bash
cd /var/www/GCRI-Project/backend
git pull origin main
npm ci
npm run build
test -f dist/index.js && echo "Build OK"

pm2 delete gcri-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
curl -s http://127.0.0.1:${PORT:-5090}/api/v1/health
```

Set `PORT=5090` (or your chosen port) in `.env` on the server.

## GitHub Actions (CI/CD)

Workflow: `.github/workflows/deploy-backend.yml` — runs on push to `main` when `backend/**` changes.

**Repository → Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Example |
|--------|---------|
| `EC2_HOST` | `72.61.255.51` or `backend.shivanshu.shop` |
| `EC2_USER` | `ubuntu` or `root` (match your SSH login) |
| `EC2_SSH_KEY` | Full contents of your `.pem` private key |

**One-time on EC2:** clone repo to `/var/www/GCRI-Project`, create `backend/.env`, run first manual `npm ci && npm run build && pm2 start ecosystem.config.cjs`.

**Private repo:** on EC2, use a [deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) or HTTPS with a PAT so `git pull` works without prompts.

**Manual deploy (same as the workflow):**

```bash
ssh ubuntu@YOUR_EC2_IP
cd /var/www/GCRI-Project && git pull origin main
cd backend && npm ci && npm run build
pm2 restart gcri-backend || pm2 start ecosystem.config.cjs
pm2 save
```
