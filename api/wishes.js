import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

let schemaReady;

function database() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("database_not_configured");
  return neon(connectionString);
}

async function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS wedding_wishes (
          id UUID PRIMARY KEY,
          name VARCHAR(60) NOT NULL,
          message VARCHAR(500) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          rate_key VARCHAR(64) UNIQUE
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS wedding_wishes_created_at_idx
        ON wedding_wishes (created_at DESC)
      `;
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function send(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}

function clean(value, max) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function publicWish(row) {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    createdAt: new Date(row.created_at).toISOString()
  };
}

export default async function handler(req, res) {
  let sql;
  try {
    sql = database();
    await ensureSchema(sql);
  } catch (error) {
    console.error("Wish database setup failed:", error.message);
    return send(res, 503, { error: "storage_unavailable" });
  }

  if (req.method === "GET") {
    try {
      const rows = await sql`
        SELECT id, name, message, created_at
        FROM wedding_wishes
        ORDER BY created_at DESC
      `;
      return send(res, 200, { wishes: rows.map(publicWish) });
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
  const rateWindow = Math.floor(Date.now() / 20000);
  const rateKey = createHash("sha256").update(`${clientId}:${rateWindow}`).digest("hex");
  const id = randomUUID();

  try {
    const rows = await sql`
      INSERT INTO wedding_wishes (id, name, message, rate_key)
      VALUES (${id}, ${name}, ${message}, ${rateKey})
      RETURNING id, name, message, created_at
    `;
    return send(res, 201, { wish: publicWish(rows[0]) });
  } catch (error) {
    if (error.code === "23505") return send(res, 429, { error: "rate_limited" });
    console.error("Wish saving failed:", error.message);
    return send(res, 503, { error: "storage_unavailable" });
  }
}
