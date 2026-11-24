# AgroLink — Deployment Guide

Three ways to ship this project, from simplest to most production-grade.

## What's new in this pass
- **3D equipment viewer** — `src/components/equipment/Equipment3DViewer.tsx` renders a rotating,
  orbit-controllable model for each equipment category using `@react-three/fiber` + `@react-three/drei`.
  Models are procedural (built from primitives in `EquipmentModels.tsx`) since no `.glb` assets shipped
  with the project. To swap in real models later, drop `.glb` files in `public/models/` and replace the
  primitive groups with `useLoader(GLTFLoader, ...)`. Triggered via the "3D" button on each equipment card
  in `EquipmentPage.tsx`.
- **Docker + Compose** — `Dockerfile` (frontend, multi-stage w/ Nginx), `backend/Dockerfile`, and
  `docker-compose.yml` for a one-command local/single-host stack (Mongo + backend + frontend).
- **CI/CD** — `.github/workflows/deploy.yml` builds both halves on every push, syntax-checks the backend,
  and deploys the frontend to S3 + CloudFront on `main`.
- **Cloud deploy scripts** — `deploy/deploy-frontend-s3.sh` (S3 + CloudFront) and `deploy/ec2-setup.sh`
  (Node + PM2 + Nginx on a fresh EC2 box).

## Option 1 — Docker Compose (fastest, single host)

```bash
cp backend/.env.example backend/.env   # fill in JWT_SECRET etc. — MONGO_URI is overridden by compose
docker compose up --build -d
```

- Frontend: http://localhost
- Backend API: proxied through Nginx at http://localhost/api
- Mongo: persisted in the `mongo_data` volume

## Option 2 — AWS (S3 + CloudFront for frontend, EC2/Fargate for backend, Atlas for DB)

1. **Database**: create a free-tier [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, whitelist your
   backend's IP, and copy the connection string into `backend/.env` as `MONGO_URI`.
2. **Backend** — pick one:
   - **EC2**: launch an Ubuntu 22.04 instance, `scp`/`git clone` the repo, then run
     `deploy/ec2-setup.sh` on the box. It installs Node 20, PM2, and Nginx, and reverse-proxies port 80
     to the app on port 5000.
   - **Fargate**: build `backend/Dockerfile`, push to ECR, and run it as an ECS Fargate service behind an
     Application Load Balancer. Set the same env vars as `backend/.env.example` in the task definition.
3. **Frontend**: create an S3 bucket (static website hosting or origin-only + CloudFront), then run:
   ```bash
   S3_BUCKET=your-bucket \
   VITE_API_BASE_URL=https://api.yourdomain.com/api \
   CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id \
   ./deploy/deploy-frontend-s3.sh
   ```
4. **DNS**: point your domain at the CloudFront distribution (frontend) and the ALB/EC2 (backend API
   subdomain, e.g. `api.yourdomain.com`).

## Option 3 — CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` runs on every push to `main`:
- Installs deps, lints, builds the frontend, and deploys it to S3 + CloudFront using the same script as
  above (reads AWS creds from repo secrets, config from repo variables).
- Installs backend deps, syntax-checks every file, and builds the Docker image (push step is stubbed —
  wire in your registry + ECS/EC2 deploy step once you've picked a backend target).

Required repo secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
Required repo variables: `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_BASE_URL`.

## Environment variables

See `backend/.env.example` for the full backend list (Mongo URI, JWT secret, EMI config, optional Razorpay
keys). The frontend only needs `VITE_API_BASE_URL` pointed at your deployed backend's `/api` root.
