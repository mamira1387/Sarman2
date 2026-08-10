const TELEGRAM_API = "https://api.telegram.org";

function botUrl(token, method) {
  return `${TELEGRAM_API}/bot${token}/${method}`;
}

export async function sendMessage(token, chatId, text, extra = {}) {
  const res = await fetch(botUrl(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
  return res.json();
}

// videoBuffer: Node Buffer with the raw mp4 bytes
export async function sendVideo(token, chatId, videoBuffer, caption = "") {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append(
    "video",
    new Blob([videoBuffer], { type: "video/mp4" }),
    "video.mp4"
  );

  const res = await fetch(botUrl(token, "sendVideo"), {
    method: "POST",
    body: form,
  });
  return res.json();
}

// Resolves a Telegram file_id to a temporary, publicly fetchable URL.
// Telegram file URLs are valid for a short time - fetch them promptly.
export async function getFileUrl(token, fileId) {
  const res = await fetch(
    botUrl(token, "getFile") + `?file_id=${encodeURIComponent(fileId)}`
  );
  const data = await res.json();
  if (!data.ok) {
    throw new Error("Telegram getFile failed: " + JSON.stringify(data));
  }
  return `${TELEGRAM_API}/file/bot${token}/${data.result.file_path}`;
}
