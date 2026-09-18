#!/bin/bash
set -e

echo "==> Buildando site institucional (raiz)"
mkdir -p dist
cp index.html dist/index.html

echo "==> Buildando app (/app)"
cd app
npm install
npm run build
cd ..

mkdir -p dist/app
cp -r app/dist/* dist/app/

echo "==> Build finalizado"
