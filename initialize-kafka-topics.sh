#!/usr/bin/env bash
set -e

echo "🚀 Creating Kafka topics via docker compose..."

docker compose exec kafka bash -c "
kafka-topics --bootstrap-server localhost:9092 \
  --create --if-not-exists \
  --topic sf-events-access \
  --partitions 6 \
  --replication-factor 1 &&

kafka-topics --bootstrap-server localhost:9092 \
  --create --if-not-exists \
  --topic sf-agent-health \
  --partitions 1 \
  --replication-factor 1
"

echo "✅ Kafka topics created successfully"
