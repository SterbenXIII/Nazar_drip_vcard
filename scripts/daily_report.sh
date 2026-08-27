#!/bin/bash

# === Налаштування ===
DB_PATH="/home/emerald-recovery/apps/api/data/leads.db"
TG_TOKEN="${TG_TOKEN:-ТВІЙ_ТЕЛЕГРАМ_БОТ_ТОКЕН}"
CHAT_ID="${CHAT_ID:-ТВІЙ_ЧАТ_ID}"
DOMAIN="krapelnytsia.lviv.ua"

# === SQL-запити ===
TOTAL_LEADS=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM leads;")
UNIQUE_USERS=$(sqlite3 $DB_PATH "SELECT COUNT(DISTINCT email) FROM leads;")
GROWTH_24H=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM leads WHERE createdAt >= datetime('now', '-1 day');")
PEAK_HOURS=$(sqlite3 $DB_PATH "SELECT strftime('%H', createdAt) || ':00 (' || COUNT(*) || ' шт)' FROM leads GROUP BY strftime('%H', createdAt) ORDER BY COUNT(*) DESC LIMIT 3;")

# === Системні метрики ===
RAM_FREE=$(free -m | awk '/^Mem:/ { print $4 " MB" }')
CPU_LOAD=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d',' -f1 | xargs)

# === Формування повідомлення ===
MESSAGE="\xF0\x9F\x93\x88 *Щоденний звіт для $DOMAIN*

Загальна кількість заявок: $TOTAL_LEADS
Унікальних email: $UNIQUE_USERS
Заявок за 24 години: $GROWTH_24H

\xF0\x9F\x94\xA5 *Пікові години (найкраще для реклами):*\n$PEAK_HOURS

RAM (вільно): $RAM_FREE
CPU Load: $CPU_LOAD
"

# === Відправка у Telegram ===
curl -s -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \
    -d "chat_id=$CHAT_ID" \
    -d "text=$MESSAGE" \
    -d "parse_mode=Markdown"
