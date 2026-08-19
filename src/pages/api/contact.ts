import type { APIRoute } from "astro";

export const prerender = false;

const TO_ADDRESS = "hei@hinside.as";
// Sends from updates.hinside.as, which already has Resend's DKIM/SPF
// records in DNS (see resend._domainkey.updates.hinside.as).
const FROM_ADDRESS = "Hinside website <noreply@updates.hinside.as>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const honeypot = typeof body.company === "string" ? body.company.trim() : "";

  if (honeypot) {
    // Silently succeed for bots without sending an email.
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (!email || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500 });
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [TO_ADDRESS],
      reply_to: email,
      subject: "[hinside.as] New message",
      html: `
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      `,
    }),
  });

  if (!resendResponse.ok) {
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
