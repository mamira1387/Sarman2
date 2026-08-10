// Usage: TELEGRAM_BOT_TOKEN=xxx node scripts/delete-webhook.mjs

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("Usage: TELEGRAM_BOT_TOKEN=xxx node scripts/delete-webhook.mjs");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
  method: "POST",
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
