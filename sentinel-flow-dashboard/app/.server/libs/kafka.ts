import { Kafka } from "kafkajs";
import type { Producer } from "kafkajs";
import { kafkaConfig } from "../config/kafka.config";
import type { AccessEventPayload } from "~/routes/agents/agents.api.events";

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
  prohibited_roles?: string[]; // For vertical IDOR
  violation_type?: 'vertical_idor' | 'horizontal_idor';
  resource_id?: string;
  owner_user_id?: string;
  accessing_user_id?: string;
};



export async function produceAccessEvent(
  payload: AccessEventPayload,
  agentId: string
): Promise<void> {
  const prod = await getProducer();
  await prod.connect();
  try {
    await prod.send({
      topic: kafkaConfig.topicAccessEvents,
      messages: [
        {

          key: `${agentId}:${payload.user_attr?.user_id}:${payload.user_attr?.role}:${payload.trace_id}`,
          value: JSON.stringify(payload),
        },
      ],
    })
  } finally {
    await prod.disconnect();
  }

}

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