#!/bin/sh

API_BASE_URL="${API_BASE_URL:-http://localhost:5678}"

curl -X POST "$API_BASE_URL/api/leads/submit" \
     -H "Content-Type: application/json" \
     -d '{"name": "E", "phone": "123"}'
