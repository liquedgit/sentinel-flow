#!/bin/sh

# ─────────────────────────────────────────
# Step 1: Start core services
# ─────────────────────────────────────────
echo "Starting core services: zookeeper, kafka, postgres..."
docker compose up -d zookeeper kafka postgres --build

# ─────────────────────────────────────────
# Wait until Kafka is ready
# ─────────────────────────────────────────
echo "Waiting for Kafka to be ready..."
until docker exec kafka kafka-topics --bootstrap-server kafka:9092 --list > /dev/null 2>&1; do
  echo "  Kafka not ready yet, retrying in 5s..."
  sleep 5
done
echo "Kafka is ready!"

# ─────────────────────────────────────────
# Step 2: Initialize Kafka topics
# ─────────────────────────────────────────
echo "Initializing Kafka topics..."
sh ./initialize-kafka-topics.sh

# ─────────────────────────────────────────
# Step 3: Start agent and detection engine
# ─────────────────────────────────────────
echo "Starting agent and detection-engine..."
docker compose up -d agent detection-engine --build

# ─────────────────────────────────────────
# Step 4: Start dashboard
# ─────────────────────────────────────────
echo "Starting dashboard..."
docker compose up -d dashboard --build

echo "All services are up!"
