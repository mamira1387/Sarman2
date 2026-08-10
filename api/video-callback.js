import crypto from "crypto";
import { kv } from "@vercel/kv";
import { sendMessage, sendVideo } from "../lib/telegram.js";
import { fetchVideoContent } from "../lib/openrouter.js";

// We need the raw body to verify OpenRouter's HMAC signature, so the
// default JSON body parser is disabled for this route.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifySignature(rawBody, header, secret) {
  if (!header) return false;
  const parts = header.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const hash = parts.find((p) => p.startsWith("v1="))?.slice(3);
  if (!timestamp || !hash) return false;

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Number.isNaN(age) || age > 300) return false; // reject if >5 min old

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp},${rawBody}`)
    .digest("hex");

  if (expected.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("ok");
  }

  const rawBody = await readRawBody(req);

  // Optional but recommended: set OPENROUTER_WEBHOOK_SECRET in your
  // OpenRouter workspace settings and here to verify authenticity.
  const secret = process.env.OPENROUTER_WEBHOOK_SECRET;
  if (secret) {
    const sigHeader = req.headers["x-openrouter-signature"];
    if (!verifySignature(rawBody, sigHeader, secret)) {
      return res.status(401).send("invalid signature");
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (_) {
    return res.status(400).send("bad json");
  }

  const job = payload.data;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  const record = await kv.get(`job:${job.id}`);
  if (!record) {
    console.warn("Unknown or expired job id", job.id);
    return res.status(200).send("ok");
  }
  const { chatId } = record;

  try {
    if (payload.type === "video.generation.completed") {
      const url = job.unsigned_urls[0];
      const buffer = await fetchVideoContent({
        apiKey: process.env.OPENROUTER_API_KEY,
        url,
      });
      await sendVideo(token, chatId, buffer, "✅ ویدیوی شما آماده شد");
    } else {
      const reason = job.error || payload.type;
      await sendMessage(token, chatId, `❌ ساخت ویدیو ناموفق بود: ${reason}`);
    }
  } catch (err) {
    console.error(err);
    await sendMessage(token, chatId, "❌ خطا در ارسال ویدیو: " + err.message);
  } finally {
    await kv.del(`job:${job.id}`);
  }

  return res.status(200).send("ok");
}
