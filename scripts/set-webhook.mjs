// Usage:
//   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_WEBHOOK_SECRET=yyy \
//     node scripts/set-webhook.mjs https://your-app.vercel.app

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const baseUrl = process.argv[2];

if (!token || !baseUrl) {
  console.error(
    "Usage: TELEGRAM_BOT_TOKEN=xxx [TELEGRAM_WEBHOOK_SECRET=yyy] node scripts/set-webhook.mjs https://your-app.vercel.app"
  );
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: `${baseUrl.replace(/\/$/, "")}/api/telegram-webhook`,
    secret_token: secret || undefined,
    allowed_updates: ["message"],
  }),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  process.exit(1);
}
