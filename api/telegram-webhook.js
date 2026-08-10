import { kv } from "../lib/kv.js";
import { sendMessage, getFileUrl } from "../lib/telegram.js";
import { submitVideoJob } from "../lib/openrouter.js";

const JOB_TTL_SECONDS = 60 * 60 * 6; // forget jobs after 6h either way

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("ok");
  }

  // Optional but recommended: only accept requests carrying the secret
  // token you configured via scripts/set-webhook.mjs
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const gotSecret = req.headers["x-telegram-bot-api-secret-token"];
    if (gotSecret !== expectedSecret) {
      return res.status(401).send("unauthorized");
    }
  }

  const update = req.body;
  const message = update?.message;
  if (!message) {
    return res.status(200).send("ok");
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = message.chat.id;

  try {
    if (message.text?.startsWith("/start")) {
      await sendMessage(
        token,
        chatId,
        "سلام! یک متن بفرست تا از روی آن ویدیو بسازم، یا یک عکس همراه با کپشن بفرست تا آن عکس را به ویدیو تبدیل کنم. ساخت ویدیو معمولاً چند دقیقه طول می‌کشد 🎬"
      );
      return res.status(200).send("ok");
    }

    let prompt = message.caption || message.text;
    let imageUrl = null;

    if (message.photo?.length) {
      const largestPhoto = message.photo[message.photo.length - 1];
      imageUrl = await getFileUrl(token, largestPhoto.file_id);
      if (!prompt) {
        prompt = "Animate this image with natural, subtle motion";
      }
    }

    if (!prompt) {
      await sendMessage(
        token,
        chatId,
        "لطفاً یک متن یا یک عکس همراه با توضیح (کپشن) بفرست."
      );
      return res.status(200).send("ok");
    }

    await sendMessage(
      token,
      chatId,
      "⏳ درخواست ویدیو ثبت شد. ساخت آن معمولاً بین چند ده ثانیه تا چند دقیقه طول می‌کشد، به‌محض آماده شدن برات می‌فرستمش."
    );

    const job = await submitVideoJob({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.VIDEO_MODEL || "google/veo-3.1-fast",
      prompt,
      imageUrl,
      callbackUrl: `${process.env.PUBLIC_BASE_URL}/api/video-callback`,
    });

    // Remember which chat should receive the result once the async
    // OpenRouter job finishes and calls our /api/video-callback webhook.
    await kv.set(`job:${job.id}`, { chatId }, { ex: JOB_TTL_SECONDS });

    return res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    try {
      await sendMessage(token, chatId, "❌ مشکلی پیش اومد: " + err.message);
    } catch (_) {
      /* ignore secondary failure */
    }
    return res.status(200).send("ok");
  }
}
