export async function sendPushNotification(userId: string, message: string) {
  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],  // must map Supabase user_id → OneSignal external_id
        headings: { en: "New Update!" },
        contents: { en: message },
      }),
    });

    const data = await res.json();
    console.log("OneSignal response:", data);
  } catch (err) {
    console.error("Error sending push:", err);
  }
}
