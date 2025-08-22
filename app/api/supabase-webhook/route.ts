// app/api/supabase-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // we need Node runtime for outbound fetch

type SupabaseEvent = {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: any;
  old_record?: any;
  // Some webhook variants use different keys:
  eventType?: string;
  new?: any;
  old?: any;
};

function extractUserId(userData: any): string | null {
  return (
    userData?.user?.id ||
    userData?.id ||
    userData?._id ||
    userData?.user_id ||
    null
  );
}


async function sendOneSignal({
  userId,
  title,
  message,
  data = {},
}: {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}) {
  const appId = process.env.ONESIGNAL_APP_ID!;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY!;
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      include_external_user_ids: [userId], // <- requires OneSignal.login(userId) in app
      headings: { en: title },
      contents: { en: message },
      data,
      // Optional niceties; safe defaults:
    //   android_channel_id: process.env.ONESIGNAL_ANDROID_CHANNEL_ID || undefined,
      ios_sound: 'default',
      android_sound: 'default',
      // uncomment if you want high-priority on Android
      // priority: 10,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('OneSignal error:', res.status, text);
    throw new Error(`OneSignal failed: ${res.status}`);
  }
}

function buildMessage(e: SupabaseEvent) {
  const table = e.table;
  // Normalized record depending on payload variant
  const record = e.record ?? e.new ?? {};
  let userId = '';
  let title = 'Update';
  let message = 'You have a new update.';
  const extra: Record<string, any> = {
    table,
    id: record.id,
  };

  switch (table) {
    case 'messages': {
      // Expecting: receiver_id, content/text, sender_id
      userId = record.receiver_id;
      title = 'New message';
      message = (record.content || record.text || 'You got a new message');
      extra.sender_id = record.sender_id;
      break;
    }
    case 'workout_assignments': {
      // Expecting: user_id, assigned_at, workout_plan_id/...
      userId = record.user_id;
      title = 'New workout assigned';
      message = 'A new workout was assigned to you.';
      extra.assigned_at = record.assigned_at;
      extra.workout_plan_id = record.workout_plan_id;
      break;
    }
    case 'meal_assignments': {
      // Expecting: client_id, assigned_at, meal_id
      userId = record.client_id;
      title = 'New meal assigned';
      message = 'A new meal was assigned to you.';
      extra.assigned_at = record.assigned_at;
      extra.meal_id = record.meal_id;
      break;
    }
    case 'meal_plan_assignments': {
      // Expecting: client_id, assigned_at, meal_plan_id
      userId = record.client_id;
      title = 'New meal plan';
      message = 'You have a new meal plan.';
      extra.assigned_at = record.assigned_at;
      extra.meal_plan_id = record.meal_plan_id;
      break;
    }
    default: {
      // Unknown table — ignore
      return null;
    }
  }

  if (!userId) return null;
  return { userId, title, message, data: extra };
}

export async function POST(req: NextRequest) {
  // Simple shared-secret check (configure this header in Supabase Webhook)
  const auth = req.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`;
  if (expected && auth !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Supabase may send a single event or an array of events
  const events: SupabaseEvent[] = Array.isArray(body) ? body : [body];

  // Only act on INSERTs
  const inserts = events.filter(
    (e) => (e.type ?? e.eventType) === 'INSERT'
  );

  const jobs: Promise<any>[] = [];

  for (const e of inserts) {
    const payload = buildMessage(e);
    if (!payload) continue;
    jobs.push(sendOneSignal(payload));
  }

  try {
    await Promise.all(jobs);
    return NextResponse.json({ ok: true, sent: jobs.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Send failed' }, { status: 500 });
  }
}
