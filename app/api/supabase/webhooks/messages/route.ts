import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type InsertPayload<T = any> = {
  type: "INSERT";
  table: string;
  schema: string;
  record: T;
  old_record: null;
};

const OS_URL = "https://api.onesignal.com/notifications"; // v2 push endpoint
// ^ You don't need ?c=push; set target_channel in body.

export async function POST(req: NextRequest) {
  try {
    // --- Simple shared-secret guard (set this header in Supabase webhook) ---
    // const token = req.headers.get("x-webhook-token");
    // if (!token || token !== process.env.SUPABASE_WEBHOOK_TOKEN) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
 console.log("Webhook received");
    const payload =await  req.json()
      console.log("Webhook payload:", [payload]);

      
    
    const rec = payload.record as {
      id?: string;
      content?: string;       // adjust to your column name that has message text
      title?: string;         // optional title column
      client_id?: string | string[] | null;
      user_id?: string | string[] | null;
      receiver_id?: string | string[] | null;
    };
    console.log("Webhook payload:", payload);

    // ---- Build the target user list from allowed columns ----
    const pick = (v: any) =>
      Array.isArray(v) ? v : v ? [v] : []; // support scalar or array
    const userIds = Array.from(
      new Set([...pick(rec.client_id), ...pick(rec.user_id), ...pick(rec.receiver_id)]
        .filter(Boolean)
        .map(String))
    );

    if (userIds.length === 0) {
      return NextResponse.json({ skipped: "No target user_id in allowed columns" }, { status: 200 });
    }

    const ONE_SIGNAL_API_KEY = process.env.NEXT_PUBLIC_ONESIGNAL_API_KEY!; // REST API Key
    const ONE_SIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
    if (!ONE_SIGNAL_API_KEY || !ONE_SIGNAL_APP_ID) {
      return NextResponse.json({ error: "Missing OneSignal envs" }, { status: 500 });
    }

    // ---- Send one transactional push per user (recommended for delivery clarity) ----
    const title = rec.title || "New message";
    const body = rec.content || "You have a new message";
    const sends = userIds.map(async (extId) => {
      const resp = await fetch(OS_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Key ${ONE_SIGNAL_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          app_id: ONE_SIGNAL_APP_ID,
          target_channel: "push",
          headings: { en: title },
          contents: { en: body },
          include_aliases: { external_id: [extId] },
          data: {
            type: "chat_message",
            message_id: rec.id ?? null,
          },
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || (data?.errors?.length && !data?.id)) {
        // Surface OneSignal targeting issues (e.g., "All included players are not subscribed")
        return { extId, ok: false, status: resp.status, errors: data?.errors ?? data };
      }
      return { extId, ok: true, status: resp.status, id: data?.id };
    });

    const results = await Promise.allSettled(sends);
    return NextResponse.json({ results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
