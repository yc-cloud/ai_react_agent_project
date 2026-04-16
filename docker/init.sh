#!/bin/bash
set -e

echo ">>> 初始化 jchatmind 数据库..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "jchatmind" \
    -f /docker-entrypoint-initdb.d/jchatmind.sql

echo ">>> 创建 eshop 数据库..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE eshop;
EOSQL

echo ">>> 初始化 eshop 表结构..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "eshop" \
    -f /docker-entrypoint-initdb.d/eshop.sql

echo ">>> 导入 eshop 测试数据..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "eshop" \
    -f /docker-entrypoint-initdb.d/eshop_data.sql

echo ">>> 数据库初始化完成！"
