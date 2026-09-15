import { config } from "dotenv";

config({ path: ".env.local" })
import {defineConfig} from "drizzle-kit";

// console.log("URL=>", process.env.DATABASE_URL);

export default defineConfig({
    schema: "./src/lib/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials:{
        url: process.env.DATABASE_URL!
    }
})