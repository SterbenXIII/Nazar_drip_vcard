#!/bin/bash

# Скрипт для агресивного очищення node_modules та lock-файлів

echo "🔥 АГРЕСИВНЕ ОЧИЩЕННЯ: Видалення node_modules та .pnpm-store..."

# 1. Спробувати знайти та зупинити процеси, які можуть блокувати файли (наприклад, дев-сервер)
echo "🛑 Перевірка процесів, які можуть тримати файли відкритими..."
pkill -f "astro dev" || true
pkill -f "vite" || true
pkill -f "node" || true

# 2. Надати права на всі файли та директорії в node_modules, щоб їх можна було видалити
echo "🔓 Зміна прав доступу для node_modules (sudo може знадобитися для деяких файлів)..."
chmod -R 777 node_modules 2>/dev/null || true
chmod -R 777 apps/*/node_modules 2>/dev/null || true
chmod -R 777 .pnpm-store 2>/dev/null || true
chmod -R 777 .alt-pnpm-store 2>/dev/null || true

# 3. Видалення
echo "🗑️ Видалення директорій..."
rm -rf node_modules
rm -rf apps/api/node_modules
rm -rf apps/shared/node_modules
rm -rf apps/web/node_modules
rm -rf .pnpm-store
rm -rf .alt-pnpm-store
rm -rf pnpm-lock.yaml

echo "✨ Очищення завершено. Тепер можна запустити pnpm install."
