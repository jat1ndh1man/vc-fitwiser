// app/api/send-notification/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // don't cache responses

export async function POST(req: NextRequest) {
  try {
    const { title, body, userId } = await req.json();

    if (!title || !body || !userId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const ONE_SIGNAL_API_KEY = process.env.NEXT_PUBLIC_ONESIGNAL_API_KEY; // e.g. os_v2_app_...
    const ONE_SIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;   // e.g. 52786b5e-...

    if (!ONE_SIGNAL_API_KEY || !ONE_SIGNAL_APP_ID) {
      return NextResponse.json(
        { error: "Server is missing OneSignal env vars" },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Key ${ONE_SIGNAL_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_id: ONE_SIGNAL_APP_ID,
        contents: { en: body },
        headings: { en: title },
        target_channel: "push",
        include_aliases: {
          external_id: [userId],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "OneSignal error", details: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
