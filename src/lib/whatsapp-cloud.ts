/**
 * Phase 2 structure for the official Meta WhatsApp Cloud API.
 *
 * This module is deliberately inactive unless the owner explicitly sets
 * WHATSAPP_CLOUD_API_ENABLED=true after Meta Business verification and
 * template approval. It never provides personal-number automation.
 */
export type WhatsAppTemplateInput = {
  /** E.164 digits only, stored server-side; never return this to demo clients. */
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
};

type WhatsAppSendResult =
  | { ok: true; messageId?: string }
  | { ok: false; reason: "not_configured" | "request_failed" };

export async function sendWhatsAppTemplate(input: WhatsAppTemplateInput): Promise<WhatsAppSendResult> {
  const enabled = process.env.WHATSAPP_CLOUD_API_ENABLED === "true";
  const accessToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_CLOUD_GRAPH_VERSION ?? "v21.0";

  // Phase 1's safe default: no call is made, even if a token exists.
  if (!enabled || !accessToken || !phoneNumberId) return { ok: false, reason: "not_configured" };

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        ...(input.bodyParameters?.length
          ? {
              components: [
                {
                  type: "body",
                  parameters: input.bodyParameters.map((text) => ({ type: "text", text })),
                },
              ],
            }
          : {}),
      },
    }),
  });

  if (!response.ok) return { ok: false, reason: "request_failed" };
  const payload = (await response.json()) as { messages?: { id?: string }[] };
  return { ok: true, messageId: payload.messages?.[0]?.id };
}
