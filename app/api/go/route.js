import { createClient } from "@supabase/supabase-js";

// Both server jobs behind one endpoint, so the project has exactly one
// file named route.js. Two of them in different folders is what broke
// the browser upload the first time round.

export const maxDuration = 60;

// SERVER ONLY. The secret key ignores every rule in schema.sql, which is
// why creating a bill happens here and not in the browser.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const PROMPT =
  "Read this receipt. Return ONLY a JSON object — no markdown fences, no commentary:\n" +
  '{"merchant":string,"items":[{"n":string,"p":number}],"subtotal":number,"tax":number,"fee":number}\n' +
  "Rules:\n" +
  "- Read ONLY machine-printed text. Ignore anything handwritten.\n" +
  "- Do NOT read the tip or the final total, even if you can see them. They are written by hand.\n" +
  "- If a line has quantity 2 or more, emit that many separate entries so each can be claimed individually.\n" +
  '- "p" is the price of ONE unit.\n' +
  '- "subtotal" is the printed subtotal before tax. 0 if not printed.\n' +
  '- "fee" is any printed credit card surcharge or service charge. 0 if none.\n' +
  "- Numbers, not strings. No currency symbols.";

export async function POST(req) {
  const body = await req.json();

  /* ---------------- read a receipt ---------------- */
  if (body.action === "scan") {
    try {
      const [meta, b64] = body.image.split(",");
      const mediaType = meta.match(/data:(.*?);/)[1];

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
              { type: "text", text: PROMPT },
            ],
          }],
        }),
      });

      const data = await r.json();
      if (!data.content) return Response.json({ error: "vision failed" }, { status: 502 });
      const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("")
        .replace(/```json|```/g, "").trim();
      return Response.json(JSON.parse(text));
    } catch {
      return Response.json({ error: "could not read that image" }, { status: 500 });
    }
  }

  /* ---------------- create a bill ---------------- */
  if (body.action === "create") {
    try {
      const { error } = await admin.from("bills").insert({
        id: body.code,
        merchant: body.merchant || "",
        payer_name: body.payer_name || "",
        total_cents: body.total_cents || 0,
        tax_cents: body.tax_cents || 0,
        tip_cents: body.tip_cents || 0,
        fee_cents: body.fee_cents || 0,
      });
      if (error) throw error;

      if (body.items?.length) {
        await admin.from("items").insert(
          body.items.map((it, i) => ({
            bill_id: body.code, name: it.name, price_cents: it.price_cents, position: i,
          }))
        );
      }
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
}
