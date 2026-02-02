param (
  [string]$Topic = "sf-events-access",
  [switch]$FromBeginning
)

Write-Host "Consuming Kafka topic: $Topic"

$cmd = "kafka-console-consumer --bootstrap-server localhost:9092 --topic $Topic"

if ($FromBeginning) {
  $cmd += " --from-beginning"
}

docker compose exec kafka bash -c "$cmd"