// Edge Function "zc-send-push" — sends phone push notifications (Web Push) for
// BOTH Zati Chani activity and site-wide notifications (announcements,
// events, sports, club posts). Called ONLY by two database triggers via pg_net:
//   - zc_notify_push       (on zc_notifications) -> { recipient_id, actor_id, type }
//   - notify_push_site     (on notifications)    -> { kind: "site", notification_ids: [...] }
//
// The real WEBHOOK_SECRET and VAPID_PRIVATE_KEY live ONLY in the copy deployed
// on Supabase. This repo copy has placeholders on purpose: the repo is public,
// so never commit real keys here. Deploy with "Verify JWT" OFF.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const WEBHOOK_SECRET = "__WEBHOOK_SECRET__";
const VAPID_PUBLIC_KEY = "BMJknyvDp7DJ00N5gEubTnqZYXR-XGFfGEwHAJc23iaiB3nQsskZrkvsQVJLg9D_cF59_6Dr9Aqv78EWQClb-o8";
const VAPID_PRIVATE_KEY = "__VAPID_PRIVATE_KEY__";

webpush.setVapidDetails("mailto:admin@namitete-tech.example", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const ZC_TYPE_LABELS: Record<string, string> = {
  follow: "started following you",
  message: "sent you a message",
  reaction: "reacted to your post",
  comment: "commented on your post",
  repost: "reposted your post",
};

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth_key: string };

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// Send to many subscriptions, 20 at a time so a big audience never blows
// the function's time limit. Returns the ids of dead subscriptions.
async function sendAll(jobs: { sub: Sub; payload: string }[]) {
  let sent = 0;
  const stale: string[] = [];
  for (let i = 0; i < jobs.length; i += 20) {
    await Promise.all(jobs.slice(i, i + 20).map(async ({ sub, payload }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) stale.push(sub.id);
        else console.error("push send failed:", code, (err as Error)?.message ?? err);
      }
    }));
  }
  return { sent, stale };
}

function linkFor(view: string | null, itemId: string | null) {
  if (!view || view === "home") return "/";
  return itemId ? `/${view}/${itemId}` : `/${view}`;
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jobs: { sub: Sub; payload: string }[] = [];

  if (payload.kind === "site") {
    const ids = Array.isArray(payload.notification_ids) ? (payload.notification_ids as string[]) : [];
    if (!ids.length) return json({ sent: 0, reason: "no ids" });
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, recipient_id, type, title, body, link_view, link_item_id")
      .in("id", ids);
    if (!notifs?.length) return json({ sent: 0, reason: "no notifications" });
    const recipients = [...new Set(notifs.map((n) => n.recipient_id))];
    const { data: subs } = await supabase.from("zc_push_subscriptions").select("*").in("user_id", recipients);
    const byUser = new Map<string, Sub[]>();
    for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
    for (const n of notifs) {
      const text = JSON.stringify({
        title: n.title || "Namitete",
        body: n.body || "",
        url: linkFor(n.link_view, n.link_item_id),
        tag: n.type || "site",
      });
      for (const sub of byUser.get(n.recipient_id) ?? []) jobs.push({ sub, payload: text });
    }
  } else {
    // Zati Chani activity (kind "zc", or the legacy shape with no kind)
    const recipient_id = payload.recipient_id as string | undefined;
    if (!recipient_id) return new Response("Missing recipient_id", { status: 400 });
    const actor_id = payload.actor_id as string | undefined;
    const type = (payload.type as string | undefined) ?? "";
    const [{ data: actor }, { data: subs }] = await Promise.all([
      actor_id
        ? supabase.from("profiles").select("name").eq("id", actor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("zc_push_subscriptions").select("*").eq("user_id", recipient_id),
    ]);
    const actorName = (actor as { name?: string } | null)?.name || "Someone";
    const text = JSON.stringify({
      title: "Zati Chani",
      body: `${actorName} ${ZC_TYPE_LABELS[type] ?? "sent you a notification"}`,
      url: "/zati-chani.html",
      tag: `zc-${type || "activity"}`,
    });
    for (const sub of (subs ?? []) as Sub[]) jobs.push({ sub, payload: text });
  }

  if (!jobs.length) return json({ sent: 0, reason: "no subscriptions" });
  const { sent, stale } = await sendAll(jobs);
  if (stale.length) await supabase.from("zc_push_subscriptions").delete().in("id", stale);
  return json({ sent, removed: stale.length });
});
