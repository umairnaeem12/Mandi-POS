# Backend container for AWS Elastic Beanstalk (Docker platform).
# Build context is the repo root (monorepo workspaces).
#
# Runtime env vars to set in the Beanstalk environment (Configuration > Software):
#   DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, APP_PORT=4000,
#   APP_URL, FRONTEND_URL, AWS_S3_BUCKET, AWS_REGION
# On Beanstalk, give the instance an IAM role with S3 access instead of keys.

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install deps using the workspace manifests (better layer caching)
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY apps/pos-web/package.json apps/pos-web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/validation/package.json packages/validation/
RUN npm ci

# Build the backend (prisma generate + nest build)
COPY . .
RUN npm run prisma:generate && npm run build:backend

# ---- runtime stage ----
FROM node:22-slim AS run
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV APP_PORT=4000

COPY --from=build /app ./

WORKDIR /app/backend
EXPOSE 4000

# Apply DB migrations on boot, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
