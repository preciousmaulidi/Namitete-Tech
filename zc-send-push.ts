// Deploy this as an Edge Function named "zc-send-push" in your Supabase
// project. It is called ONLY by the zc_notify_push trigger (on
// zc_notifications) via pg_net — never directly by the app or a user.
//
// HOW TO DEPLOY (pick one):
//
// Option A — Dashboard (easiest, no CLI needed):
//   1. Supabase Dashboard -> Edge Functions -> Create a new function.
//   2. Name it exactly: zc-send-push
//   3. Paste this whole file in as index.ts.
//   4. IMPORTANT: turn OFF "Verify JWT" for this function (it uses its
//      own shared-secret header instead — see WEBHOOK_SECRET below).
//   5. Deploy.
//
// Option B — Supabase CLI:
//   supabase functions deploy zc-send-push --no-verify-jwt
//   (run from a folder containing supabase/functions/zc-send-push/index.ts
//   with this content)
//
// Nothing else needs configuring — the database trigger that calls this
// function already exists (zc_notify_push, on zc_notifications).

import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Matches the secret embedded in the zc_notify_push() trigger function in
// the database — this is how the function knows a call is really from
// our own trigger and not a stranger hitting the endpoint.
const WEBHOOK_SECRET = "6c2fa44dbf463c2a25b41f4a3f3c458ec7b26cdea028087b4d6b87f2a36b2c8d";

const VAPID_PUBLIC_KEY = "BMJknyvDp7DJ00N5gEubTnqZYXR-XGFfGEwHAJc23iaiB3nQsskZrkvsQVJLg9D_cF59_6Dr9Aqv78EWQClb-o8";
const VAPID_PRIVATE_KEY = "2lcFaR_Ihtdr-4y2dvsgeVl5bKdNgVO09Ic6SVqBMEY";

webpush.setVapidDetails("mailto:admin@namitete-tech.example", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// One line per Zati Chani notification type — createNotification() in
// zati-chani.js already funnels every one of these into zc_notifications,
// which is what fires the trigger that calls this function.
const TYPE_LABELS: Record<string, string> = {
  follow: "started following you",
  message: "sent you a message",
  reaction: "reacted to your post",
  comment: "commented on your post",
  repost: "reposted your post",
};

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { recipient_id?: string; actor_id?: string; type?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { recipient_id, actor_id, type } = payload;
  if (!recipient_id) return new Response("Missing recipient_id", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [{ data: actor }, { data: subs }] = await Promise.all([
    actor_id
      ? supabase.from("profiles").select("name").eq("id", actor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("zc_push_subscriptions").select("*").eq("user_id", recipient_id),
  ]);

  if (!subs || !subs.length) {
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const actorName = (actor as { name?: string } | null)?.name || "Someone";
  const body = `${actorName} ${TYPE_LABELS[type ?? ""] ?? "sent you a notification"}`;

  const notificationPayload = JSON.stringify({
    title: "Zati Chani",
    body,
    url: "/zati-chani.html",
  });

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth_key: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          notificationPayload,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // The browser un-registered this subscription (uninstalled,
          // cleared data, etc.) — clean it up so we stop trying it.
          staleIds.push(sub.id);
        } else {
          console.error("push send failed:", (err as Error)?.message ?? err);
        }
      }
    }),
  );

  if (staleIds.length) {
    await supabase.from("zc_push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
