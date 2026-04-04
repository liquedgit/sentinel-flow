export const kafkaConfig = {
  brokers:
    process.env.KAFKA_BROKERS?.split(",").map((b) => b.trim()) ?? [
      "localhost:9092",
    ],
  topicCheckRequests:
    process.env.KAFKA_TOPIC_CHECK_REQUESTS ?? "sf-check-requests",
  topicAccessEvents:
    process.env.KAFKA_TOPIC_ACCESS_EVENTS ?? "sf-events-access",
  topicScanRequests:
    process.env.KAFKA_TOPIC_SCAN_REQUESTS ?? "scan-requests",
};

console.log("kafkaConfig", kafkaConfig);