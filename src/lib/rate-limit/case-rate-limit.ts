import { redis } from "../Redis/redis"
import { Ratelimit } from "@upstash/ratelimit";

const tenMinLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "10 m"), 
    prefix: "rate-limit:case:10m"
});

const dailyLimiter = new Ratelimit({
    redis,
    limiter:Ratelimit.slidingWindow(8, "24h"), 
    prefix: "rate-limit:case:24h"
});

export type RateLimitResponse =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: "TEN_MIN_LIMIT" | "DAILY_LIMIT";
      retryAt: Date;
    };


export const checkCaseRateLimit = async(userId: string) : Promise<RateLimitResponse> =>{
    const key = `user:${userId}`;

    const tenMin = await tenMinLimiter.limit(key);

    if(!tenMin.success){
        return {
            allowed: false,
            reason: "TEN_MIN_LIMIT",
            retryAt:new Date(tenMin.reset)
        }
    }

    const daily = await dailyLimiter.limit(key);
    if(!daily.success){
        return{
            allowed:false,
            reason:"DAILY_LIMIT",
            retryAt: new Date(daily.reset)
        }
    }
    return{
        allowed:true
    }
}