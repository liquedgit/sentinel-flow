Write-Host "Creating Kafka topics via docker compose..."

docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 `
  --create --if-not-exists `
  --topic sf-events-access `
  --partitions 6 `
  --replication-factor 1

docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 `
  --create --if-not-exists `
  --topic sf-agent-health `
  --partitions 1 `
  --replication-factor 1

docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 `
  --create --if-not-exists `
  --topic scan-requests `
  --partitions 1 `
  --replication-factor 1

Write-Host "Kafka topics created successfully"
