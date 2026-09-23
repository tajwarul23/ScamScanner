import "./env"

import { processCase } from "@/lib/pipeline/processCase"
import { CASE_QUEUE_NAME } from "@/lib/queue/caseQueue"
import { queueConnection } from "@/lib/queue/ioRedisConnection";
import {Worker} from "bullmq"

const worker = new Worker(CASE_QUEUE_NAME, async (job)=>{
    await processCase(job.data.caseId);
}, {connection:queueConnection})

worker.on("completed", (job)=>{
    console.log(`Case ${job.data.caseId} processed successfully`);
    
})
worker.on("failed", (job, err) => {
  console.error(
    `Case ${job?.data.caseId} failed:`,
    err
  );
});
console.log("Worker started, listening for jobs on", CASE_QUEUE_NAME);
