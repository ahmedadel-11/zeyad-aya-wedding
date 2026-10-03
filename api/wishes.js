const WISHES_KEY = "zeyad-aya:wishes";
const MAX_SAVED_WISHES = 200;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(command) {
  const config = redisConfig();
  if (!config) throw new Error("storage_not_configured");
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error("storage_request_failed");
  const payload = await response.json();
  if (payload.error) throw new Error("storage_request_failed");
  return payload.result;
}

function send(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}

function clean(value, max) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rows = await redis(["LRANGE", WISHES_KEY, "0", "11"]);
      const wishes = (rows || []).map(row => {
        try { return JSON.parse(row); } catch (_) { return null; }
      }).filter(Boolean);
      return send(res, 200, { wishes });
    } catch (error) {
      console.error("Wish loading failed:", error.message);
      return send(res, 503, { error: "storage_unavailable" });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "method_not_allowed" });
  }

  const name = clean(req.body?.name, 60);
  const message = clean(req.body?.message, 500);
  const company = clean(req.body?.company, 80);
  if (company) return send(res, 200, { ok: true });
  if (!name || !message) return send(res, 400, { error: "name_and_message_required" });

  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const clientId = forwarded || req.socket?.remoteAddress || "unknown";
  const rateKey = `zeyad-aya:wish-rate:${clientId}`;

  try {
    const allowed = await redis(["SET", rateKey, "1", "EX", "20", "NX"]);
    if (allowed !== "OK") return send(res, 429, { error: "rate_limited" });

    const wish = {
      id: crypto.randomUUID(),
      name,
      message,
      createdAt: new Date().toISOString()
    };
    await redis(["LPUSH", WISHES_KEY, JSON.stringify(wish)]);
    await redis(["LTRIM", WISHES_KEY, "0", String(MAX_SAVED_WISHES - 1)]);
    return send(res, 201, { wish });
  } catch (error) {
    console.error("Wish saving failed:", error.message);
    return send(res, 503, { error: "storage_unavailable" });
  }
}
