/**
 * POST /api/subscribe — add contact via Resend (Cloudflare Pages Function).
 * Secrets: RESEND_API_KEY (required), RESEND_SEGMENT_ID (optional).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} apiKey
 * @param {string} email
 * @param {string} segmentId
 */
async function addContactToSegment(apiKey, email, segmentId) {
  const path = `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`;
  return fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (context.request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const apiKey = context.env.RESEND_API_KEY;
  if (!apiKey) {
    return json({ error: "Newsletter is not configured yet." }, 503);
  }

  const source = String(body.source || "site").slice(0, 120);
  const segmentId = context.env.RESEND_SEGMENT_ID || "";

  const payload = {
    email,
    unsubscribed: false,
    properties: {
      signup_source: source,
    },
  };

  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }

  const msg = String(data.message || text || "").toLowerCase();
  const isDuplicate =
    res.status === 409 ||
    msg.includes("already") ||
    msg.includes("duplicate") ||
    msg.includes("exists");

  if (res.ok) {
    if (segmentId) {
      const segRes = await addContactToSegment(apiKey, email, segmentId);
      if (!segRes.ok && segRes.status !== 409) {
        const segText = await segRes.text();
        let segErr = {};
        try {
          segErr = JSON.parse(segText);
        } catch {
          /* ignore */
        }
        return json(
          {
            error:
              segErr.message ||
              "Subscribed, but could not add to list segment. Check Resend segment id.",
          },
          422
        );
      }
    }
    return json({ ok: true, id: data.id }, 200);
  }

  if (isDuplicate) {
    if (segmentId) {
      await addContactToSegment(apiKey, email, segmentId);
    }
    return json({ ok: true, duplicate: true }, 200);
  }

  return json(
    { error: data.message || "Could not subscribe. Try again later." },
    res.status >= 400 && res.status < 600 ? res.status : 422
  );
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
