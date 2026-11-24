#!/usr/bin/env bash
# Run on a fresh Ubuntu 22.04 EC2 instance to stand up the AgroLink backend
# with Node + PM2 behind Nginx. Use MongoDB Atlas (recommended) instead of a
# self-hosted Mongo unless you have a specific reason not to.
set -euo pipefail

echo "== Updating packages =="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "== Installing Node.js 20 =="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "== Installing PM2 =="
sudo npm install -g pm2

echo "== Installing Nginx =="
sudo apt-get install -y nginx

echo "== Cloning / copying app =="
APP_DIR=/opt/agrolink
sudo mkdir -p "$APP_DIR"
sudo chown "$USER":"$USER" "$APP_DIR"
# Option A: git clone your repo here
#   git clone <your-repo-url> "$APP_DIR"
# Option B: scp the project up, then move it into $APP_DIR

echo "== Installing backend dependencies =="
cd "$APP_DIR/backend"
npm ci --omit=dev

echo "== Configure environment =="
if [ ! -f .env ]; then
  cp .env.example .env
  echo "!! Edit $APP_DIR/backend/.env with your MONGO_URI, JWT_SECRET, etc. before starting."
fi

echo "== Starting backend with PM2 =="
pm2 start src/server.js --name agrolink-backend
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -n 1 | sudo bash

echo "== Configuring Nginx reverse proxy =="
sudo tee /etc/nginx/sites-available/agrolink >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        return 404;  # frontend is served separately via S3/CloudFront
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/agrolink /etc/nginx/sites-enabled/agrolink
sudo nginx -t
sudo systemctl restart nginx

echo "== Optional: HTTPS via Let's Encrypt =="
echo "sudo apt-get install -y certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d api.yourdomain.com"

echo "== Done. Backend is running under PM2 and proxied by Nginx on port 80. =="
