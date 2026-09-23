import IORedis from "ioredis";

export const queueConnection = new IORedis(process.env.REDIS_TCP_URL!, {
    maxRetriesPerRequest:null
})