const OPENROUTER_API = "https://openrouter.ai/api/v1";

// Submits an async video generation job.
// - text only  -> plain text-to-video
// - text+image -> image-to-video, using the image as the first frame
export async function submitVideoJob({
  apiKey,
  model,
  prompt,
  imageUrl,
  callbackUrl,
}) {
  const body = { model, prompt };

  if (imageUrl) {
    body.frame_images = [
      {
        type: "image_url",
        image_url: { url: imageUrl },
        frame_type: "first_frame",
      },
    ];
  }

  if (callbackUrl) {
    body.callback_url = callbackUrl;
  }

  const res = await fetch(`${OPENROUTER_API}/videos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error("OpenRouter submit failed: " + JSON.stringify(data));
  }
  return data; // { id, polling_url, status }
}

// Downloads the finished video bytes (requires auth, unlike unsigned_urls
// used in webhook payloads which still need the Authorization header here).
export async function fetchVideoContent({ apiKey, url }) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error("OpenRouter content fetch failed: " + res.status);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
