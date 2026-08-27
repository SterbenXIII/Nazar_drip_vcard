
#!/bin/bash

# ==========================================
# НАЛАШТУВАННЯ (заповни свої дані)
# ==========================================
URL="https://krapelnytsia.lviv.ua/api/health"
TG_TOKEN="${TG_TOKEN:-ТВІЙ_ТЕЛЕГРАМ_БОТ_ТОКЕН}"
CHAT_ID="${CHAT_ID:-ТВІЙ_ЧАТ_ID}"
DOMAIN="krapelnytsia.lviv.ua"
DISK_THRESHOLD=90  # Поріг заповнення диска у %

# Функція для відправки повідомлення в Telegram
send_tg() {
    local message=$1
    curl -s -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \
        -d "chat_id=$CHAT_ID" \
        -d "text=$message" \
        -d "parse_mode=Markdown" > /dev/null
}

# 1. ПЕРЕВІРКА ДОСТУПНОСТІ САЙТУ (HTTP 200)
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "$URL")

if [ "$HTTP_STATUS" != "200" ]; then
    send_tg "🚨 *ALARM!* Сайт $DOMAIN не відповідає! Статус: $HTTP_STATUS"
fi

# 2. ПЕРЕВІРКА ТЕРМІНУ SSL (за 7 днів до кінця)
EXPIRY_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d'=' -f2)
if [ ! -z "$EXPIRY_DATE" ]; then
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -le 7 ]; then
        send_tg "⚠️ *SSL-Увага!* Сертифікат для $DOMAIN закінчується через $DAYS_LEFT днів!"
    fi
fi

# 3. ПЕРЕВІРКА ВІЛЬНОГО МІСЦЯ НА ДИСКУ
# Беремо відсоток використання кореневого розділу /
DISK_USAGE=$(df / | grep / | awk '{ print $5 }' | sed 's/%//')

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    send_tg "💾 *Disk Alert!* На сервері $DOMAIN залишилося мало місця: заповнено на $DISK_USAGE%! Рекомендується запустити 'docker system prune -f'."
fi
