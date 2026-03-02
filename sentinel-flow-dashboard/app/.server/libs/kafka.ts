import { Kafka } from "kafkajs";
import type { Producer } from "kafkajs";
import { kafkaConfig } from "../config/kafka.config";

let producer: Producer | null = null;

function getProducer(): Producer {
  if (!producer) {
    const kafka = new Kafka({
      clientId: "sentinel-flow-dashboard",
      brokers: kafkaConfig.brokers,
    });
    producer = kafka.producer();
  }
  return producer;
}

export type CheckRequestPayload = {
  request_id: string;
  project_name: string;
  method: string;
  endpoint: string;
  prohibited_roles: string[];
};

export async function produceCheckRequest(
  payload: CheckRequestPayload
): Promise<void> {
  const prod = getProducer();
  await prod.connect();
  try {
    await prod.send({
      topic: kafkaConfig.topicCheckRequests,
      messages: [
        {
          value: JSON.stringify(payload),
        },
      ],
    });
  } finally {
    await prod.disconnect();
  }
}
