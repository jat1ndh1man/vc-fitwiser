// lib/server/realtime-push.ts
import { createClient } from "@supabase/supabase-js";
import { sendOneSignalPush } from "./onesignal";

const TABLES = [
  "messages",
  "workout_assignments",
  "meal_assignments",
  "meal_plan_assignments",
] as const;

const USER_KEYS = ["receiver_id", "user_id", "client_id"];

function extractRecipients(record: Record<string, any>): string[] {
  const s = new Set<string>();
  for (const k of USER_KEYS) {
    const v = record?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      s.add(String(v));
    }
  }
  return [...s];
}

function buildTitleBody(table: string, r: any) {
  switch (table) {
    case "messages":
      return {
        title: r.sender_name || r.sender || "New message",
        body: r.text || r.message || r.content || "You have a new message",
        data: { type: "chat_message", message_id: r.id ?? null, chat_id: r.chat_id ?? null },
      };
    case "workout_assignments":
      return {
        title: "New workout assigned",
        body: r.title || r.workout_name || "Open your workout plan",
        data: { type: "workout_assignment", id: r.id ?? null },
      };
    case "meal_assignments":
      return {
        title: "New meal assigned",
        body: r.title || r.meal_name || "Open your meals",
        data: { type: "meal_assignment", id: r.id ?? null },
      };
    case "meal_plan_assignments":
      return {
        title: "New meal plan",
        body: r.title || "Your meal plan was updated",
        data: { type: "meal_plan_assignment", id: r.id ?? null },
      };
    default:
      return { title: "Update", body: "You have a new update", data: { type: "generic" } };
  }
}

let started = false;

export async function startRealtimePush() {
  if (started) return;
  started = true;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase env missing");
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { params: { eventsPerSecond: 10 } } }
  );

  const channel = supabase.channel("realtime-push");

  for (const table of TABLES) {
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table },
      async (payload: any) => {
        try {
          const rec = payload.new ?? payload.record ?? {};
          const recipients = extractRecipients(rec);
          if (recipients.length === 0) return;

          const { title, body, data } = buildTitleBody(table, rec);
          const idempotencyKey =
            `${table}:${rec.id ?? "new"}:${payload.commit_timestamp ?? Date.now()}`;

          await sendOneSignalPush({
            externalIds: recipients,
            title,
            body,
            data,
            collapseId: `${table}_${rec.id ?? "new"}`,
            idempotencyKey,
          });
        } catch (err) {
          console.error("[realtime-push] send failed:", err);
        }
      }
    );
  }

  await channel.subscribe((status) => {
    console.log("[realtime-push] status:", status);
  });
}
