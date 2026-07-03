# Deploying Bukhari POS to AWS

**Architecture**

```
Amplify (pos-web SPA) ──HTTPS──► EC2 (Nginx → NestJS via PM2) ──► RDS PostgreSQL
                                   uploads on local EBS disk
```

- **Frontend:** AWS Amplify Hosting (static Vite build)
- **Backend:** EC2 (Ubuntu) running NestJS under PM2, behind Nginx with Let's Encrypt TLS
- **Database:** RDS PostgreSQL
- **Uploads:** local `./uploads` on the EC2 EBS volume

> **Region:** Your console is in `eu-north-1` (Stockholm). Since the restaurant is in Qatar,
> consider `me-central-1` (UAE) or `me-south-1` (Bahrain) for lower latency. Put EC2, RDS,
> and Amplify in the **same region**. Confirm Amplify Hosting is available there first.

You will need a **domain name** (e.g. `yourdomain.com`). Point:
- `api.yourdomain.com` → the EC2 public IP (an A record)
- `pos.yourdomain.com` → Amplify (Amplify gives you the CNAME target)

---

## 1. Create the RDS PostgreSQL database

1. Console → **RDS** → **Create database**.
2. **Standard create** → **PostgreSQL**.
3. Templates → **Free tier** (or Dev/Test). Instance: `db.t4g.micro`.
4. Settings:
   - DB instance identifier: `bukhari-pos-db`
   - Master username: `posadmin`
   - Master password: pick a strong one (save it).
5. Connectivity:
   - **Public access: No** (EC2 will reach it privately).
   - VPC security group: **Create new**, name it `bukhari-rds-sg`.
6. Additional config → Initial database name: `restaurant_pos`.
7. Create. Wait ~5 min, then copy the **Endpoint** (e.g. `bukhari-pos-db.xxxx.rds.amazonaws.com`).

You'll open the RDS security group to the EC2 instance in step 2.7.

---

## 2. Launch the EC2 instance

1. Console → **EC2** → **Launch instance**.
2. Name: `bukhari-pos-api`. AMI: **Ubuntu Server 24.04 LTS**. Type: **t3.small**.
3. **Key pair:** create one (`bukhari-key`), download the `.pem` — you need it to SSH.
4. Network settings → **Create security group** `bukhari-ec2-sg`, allow:
   - SSH (22) from **My IP**
   - HTTP (80) from Anywhere
   - HTTPS (443) from Anywhere
5. Storage: 20 GB gp3.
6. Launch. Note the **Public IPv4 address**. (Optionally allocate an **Elastic IP** and associate it so the IP never changes — recommended.)
7. **Let EC2 reach RDS:** RDS → your DB → Connectivity → click the `bukhari-rds-sg` security group → Inbound rules → **Edit** → Add rule: Type **PostgreSQL (5432)**, Source = the `bukhari-ec2-sg` security group. Save.
8. Point `api.yourdomain.com` DNS A record at the EC2 (Elastic) IP.

### SSH in and install the runtime

```bash
chmod 400 bukhari-key.pem
ssh -i bukhari-key.pem ubuntu@api.yourdomain.com

# --- on the server ---
sudo apt update && sudo apt upgrade -y

# Node 22 (matches .nvmrc)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# PM2 process manager
sudo npm install -g pm2
```

### Deploy the app

```bash
# Clone your repo (use a deploy key or HTTPS + token for a private repo)
git clone https://github.com/YOUR_USER/bukhari-pos.git
cd bukhari-pos

# Install ALL workspaces from the repo root
npm ci

# Configure backend env
cp deploy/backend.env.example backend/.env
nano backend/.env      # fill DATABASE_URL (RDS endpoint), JWT secrets, FRONTEND_URL
#   generate secrets:  openssl rand -base64 48

cd backend
npx prisma generate
npx prisma migrate deploy      # applies migrations to RDS
npm run prisma:seed            # OPTIONAL: seed base data
npm run prisma:seed:menu       # OPTIONAL: seed the Mandi Bukhari menu
npm run build

# Start under PM2
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # run the sudo command it prints, so it survives reboots

pm2 logs             # confirm "Backend running on ... :4000"
```

### Configure Nginx + TLS

```bash
# Add the WebSocket upgrade map once, inside the http { } block of the main config:
sudo nano /etc/nginx/nginx.conf
#   add inside http { }:
#     map $http_upgrade $connection_upgrade { default upgrade; '' close; }

# Install the site config
cd ~/bukhari-pos
sudo cp deploy/nginx.conf /etc/nginx/sites-available/bukhari-pos
sudo sed -i 's/api.yourdomain.com/api.YOURREALDOMAIN.com/g' /etc/nginx/sites-available/bukhari-pos
sudo ln -s /etc/nginx/sites-available/bukhari-pos /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Free TLS cert (DNS must already point at this box)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.YOURREALDOMAIN.com
```

Test: `curl https://api.YOURREALDOMAIN.com/api` should reach the backend.

---

## 3. Deploy the frontend on Amplify

1. Console → **AWS Amplify** → **Create new app** → **Host web app**.
2. Connect your **GitHub** repo and the `main` branch.
3. Amplify auto-detects `amplify.yml` at the repo root (already in this repo). Confirm:
   - Build command: `npm run build:web`
   - Output directory: `apps/pos-web/dist`
4. **Environment variables** (App settings → Environment variables):
   - `VITE_API_URL` = `https://api.YOURREALDOMAIN.com/api`
   - `VITE_SOCKET_URL` = `https://api.YOURREALDOMAIN.com`
5. **Rewrites and redirects** → add the SPA rewrite (so refresh on a route works):
   - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - Target: `/index.html`
   - Type: `200 (Rewrite)`
6. **Save and deploy.** Amplify gives you `https://main.xxxx.amplifyapp.com`.
7. Add a **custom domain** (`pos.yourdomain.com`) under Domain management if you want.

### Wire CORS back to the frontend

On the EC2 box, edit `backend/.env` and set `FRONTEND_URL` to your Amplify URL(s):

```bash
FRONTEND_URL="https://main.xxxx.amplifyapp.com,https://pos.yourdomain.com"
```

Then reload the backend:

```bash
cd ~/bukhari-pos && pm2 restart bukhari-pos-api
```

> The HTTP CORS check is in `backend/src/main.ts` — it only allows origins listed in
> `FRONTEND_URL` (plus `*.vercel.app`). If the browser console shows CORS errors, this
> variable is the thing to fix.

---

## 4. Verify end to end

- Open the Amplify URL → log in.
- Create/edit a menu item with an image → confirms uploads write to EC2 disk and load back.
- Open two browser tabs → a change in one appears live in the other → confirms **websockets**.
- Check `pm2 logs` on the server for errors.

---

## Redeploying later

**Backend** (after pushing code):
```bash
ssh -i bukhari-key.pem ubuntu@api.YOURREALDOMAIN.com
cd ~/bukhari-pos && git pull
npm ci
cd backend && npx prisma migrate deploy && npm run build
pm2 restart bukhari-pos-api
```

**Frontend:** just push to `main` — Amplify auto-builds and deploys.

---

## Cost estimate (single restaurant, ~$/month)

| Resource | Approx |
|---|---|
| EC2 t3.small | ~$15 |
| RDS db.t4g.micro | ~$13 |
| Amplify hosting | ~$0–2 (low traffic) |
| EBS + data transfer | ~$3 |
| **Total** | **~$30–35/mo** |

---

## Production hardening (do these soon after go-live)

- **Uploads backup:** they live on the EC2 disk. Enable **EBS snapshots** (daily), or later move
  uploads to **S3** so redeploys/instance loss can't lose product images.
- **RDS automated backups:** confirm the retention window (7 days is a good default).
- **Restrict SSH:** keep port 22 limited to your IP.
- **Secrets:** rotate JWT secrets and the DB password out of any shared notes.
- **Logs/monitoring:** `pm2 monit`, and consider CloudWatch for the EC2 instance.
