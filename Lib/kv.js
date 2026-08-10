import { Redis } from "@upstash/redis";

// Works with the KV_REST_API_URL / KV_REST_API_TOKEN env vars that Vercel's
// Upstash Marketplace integration adds to the project automatically.
export const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
