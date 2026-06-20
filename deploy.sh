#!/bin/bash
##############################################################
# INVERTITE — Script de Deploy en VPS (Donweb)
# Ejecutar como: bash deploy.sh
##############################################################

set -e  # Parar si algún comando falla

echo "🚀 Iniciando deploy de Invertite..."

# ── Configuración ─────────────────────────────────────────────
VPS_USER="root"                        # ← tu usuario SSH
VPS_HOST="TU_IP_VPS"                   # ← IP de tu VPS Donweb
DEPLOY_DIR="/var/www/invertite"        # ← directorio en el VPS
BACKEND_DIR="/var/www/invertite-api"   # ← directorio del backend en el VPS

echo ""
echo "📦 [1/4] Construyendo frontend..."
cd frontend
npm run build
echo "✅ Frontend construido en frontend/dist"

echo ""
echo "📤 [2/4] Subiendo frontend al VPS..."
rsync -avz --delete dist/ ${VPS_USER}@${VPS_HOST}:${DEPLOY_DIR}/
echo "✅ Frontend subido"

echo ""
echo "📤 [3/4] Subiendo backend al VPS..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'exec*.json' \
    --exclude 'workflows*.json' \
    backend/ ${VPS_USER}@${VPS_HOST}:${BACKEND_DIR}/
echo "✅ Backend subido"

echo ""
echo "🔧 [4/4] Reiniciando servicios en el VPS..."
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
  cd /var/www/invertite-api
  npm install --omit=dev
  pm2 restart invertite-api || pm2 start server.js --name invertite-api
  
  # Copiar configuración nginx (la primera vez)
  if [ ! -f /etc/nginx/sites-enabled/invertite ]; then
    cp /var/www/invertite/nginx.conf /etc/nginx/sites-available/invertite
    ln -s /etc/nginx/sites-available/invertite /etc/nginx/sites-enabled/invertite
    nginx -t && systemctl reload nginx
    echo "✅ Nginx configurado"
  else
    nginx -t && systemctl reload nginx
    echo "✅ Nginx recargado"
  fi
ENDSSH

echo ""
echo "🎉 Deploy completado exitosamente!"
echo "   Frontend: ${VPS_HOST}"
echo "   Backend API: ${VPS_HOST}/api/v1"
