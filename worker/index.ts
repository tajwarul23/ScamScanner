import "./env";

import { processCase } from "@/lib/pipeline/processCase";
import { CASE_QUEUE_NAME } from "@/lib/queue/caseQueue";
import { queueConnection } from "@/lib/queue/ioRedisConnection";
import { Worker } from "bullmq";
import http from "node:http";
const worker = new Worker(
  CASE_QUEUE_NAME,
  async (job) => {
    await processCase(job.data.caseId);
  },
  { connection: queueConnection,

     drainDelay: 300,          // seconds; wait up to 5 min per idle round 
    stalledInterval: 300_000, // ms; check for stuck jobs every 5 min 
   },
);

worker.on("completed", (job) => {
  console.log(`Case ${job.data.caseId} processed successfully`);
});
worker.on("failed", (job, err) => {
  console.error(`Case ${job?.data.caseId} failed:`, err);
});
console.log("Worker started, listening for jobs on", CASE_QUEUE_NAME);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

http
  .createServer((_req, res) => {
    console.log("Ping received..");
    
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Health Checking broo.");
  })
  .listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });
