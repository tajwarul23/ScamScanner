import { Queue } from "bullmq";
import { queueConnection } from "./ioRedisConnection";

export const CASE_QUEUE_NAME = "process_case";
export const caseQueue = new Queue(CASE_QUEUE_NAME, {
  connection: queueConnection,
});
