// lib/server/onesignal.ts
export type PushPayload = {
  externalIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  collapseId?: string;
  idempotencyKey?: string;
};

export async function sendOneSignalPush(p: PushPayload) {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
    throw new Error("OneSignal env missing");
  }

  const res = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
      ...(p.idempotencyKey ? { "Idempotency-Key": p.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      app_id: process.env.ONESIGNAL_APP_ID,
      include_aliases: { external_id: p.externalIds }, // target by your user ids
      target_channel: "push",
      headings: { en: p.title },
      contents: { en: p.body },
      data: p.data ?? {},
      collapse_id: p.collapseId,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`OneSignal error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}
