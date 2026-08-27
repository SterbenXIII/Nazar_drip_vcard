#!/bin/sh

docker exec -it medical-backend sqlite3 \
                        /app/data/leads.db \
                         "SELECT count(*) FROM leads;"