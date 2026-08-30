// ==========================================================================
// ZATI CHANI — Phase 1 (Find Students, Friends, Requests, Privacy)
// This file is intentionally self-contained: it duplicates a couple of tiny
// helpers from script.js (escapeHtml, friendlyError) rather than sharing a
// file with it, so the main site's script.js never has to be touched to
// ship or modify this feature. Same Supabase project/keys, so a student's
// existing login session on the main site carries over automatically.
// ==========================================================================

const SUPABASE_URL = 'https://zhawyqrtrpdivvaqhhhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cumJP_IiPBI-DFSH66lLMg_8VddgP3e';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentZcProfile = null;
let zcSettings = { profile_image_limit_bytes: 4194304, chat_image_limit_bytes: 10485760, chat_video_limit_bytes: 20971520, video_max_duration_seconds: 30, chat_expiry_days: 7 };
let zcActiveThreadFriendId = null;
let zcActiveThreadFriendName = null;

// ---------------------------------------------------------------------
// ICON SYSTEM — matches the hand-drawn 20x20 stroke icons already used
// in zati-chani.html's markup (nav, gear, back-chevron, attach). Used
// anywhere the JS renders a control that previously used an emoji, so
// reactions/share/repost/comment/edit/delete/report/menu all come from
// one consistent set instead of mixed emoji + SVG.
// ---------------------------------------------------------------------
const ICON_PATHS = {
  like: '<path d="M7 18v-8l3.2-6a1.6 1.6 0 013 1l-.8 4.3H15a1.6 1.6 0 011.55 2L15 16.5a2 2 0 01-1.9 1.5H9"/><path d="M7 10H4.5A1.5 1.5 0 003 11.5v5A1.5 1.5 0 004.5 18H7"/>',
  laugh: '<circle cx="10" cy="10" r="7.2"/><path d="M6.5 11.5c.6 1.6 2 2.6 3.5 2.6s2.9-1 3.5-2.6"/><circle cx="7.4" cy="8.2" r="0.9" fill="currentColor" stroke="none"/><circle cx="12.6" cy="8.2" r="0.9" fill="currentColor" stroke="none"/>',
  love: '<path d="M10 16.3s-5.6-3.6-5.6-7.6a3.1 3.1 0 015.6-1.9 3.1 3.1 0 015.6 1.9c0 4-5.6 7.6-5.6 7.6z"/>',
  wow: '<circle cx="10" cy="10" r="7.2"/><circle cx="10" cy="12.3" r="1.7"/><circle cx="7.3" cy="7.7" r="0.9" fill="currentColor" stroke="none"/><circle cx="12.7" cy="7.7" r="0.9" fill="currentColor" stroke="none"/>',
  sad: '<circle cx="10" cy="10" r="7.2"/><path d="M6.5 13c.6-1.6 2-2.6 3.5-2.6s2.9 1 3.5 2.6"/><circle cx="7.4" cy="8.2" r="0.9" fill="currentColor" stroke="none"/><circle cx="12.6" cy="8.2" r="0.9" fill="currentColor" stroke="none"/>',
  share: '<path d="M6 14L14 6M14 6H8M14 6v6"/>',
  repost: '<path d="M4.5 7.5H13a2.5 2.5 0 012.5 2.5v1"/><path d="M11.5 5l2.5 2.5L11.5 10"/><path d="M15.5 12.5H7a2.5 2.5 0 01-2.5-2.5v-1"/><path d="M8.5 15l-2.5-2.5L8.5 10"/>',
  comment: '<path d="M3 10.2a6.8 6.8 0 1112 4.3l.6 2.5-3-1a6.8 6.8 0 01-9.6-5.8z"/>',
  edit: '<path d="M13.8 3.3l2.9 2.9L6.4 16.5l-3.4.9.9-3.4z"/>',
  trash: '<path d="M4 5.5h12M8 5.5v-1.7a1 1 0 011-1h2a1 1 0 011 1v1.7"/><path d="M5.7 5.5l.7 9.8a1.5 1.5 0 001.5 1.4h4.2a1.5 1.5 0 001.5-1.4l.7-9.8"/>',
  flag: '<path d="M5 3v14"/><path d="M5 4h9.5l-2.3 3.3L14.5 10.5H5"/>',
  more: '<circle cx="4.5" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor" stroke="none"/>',
  camera: '<path d="M3 7.3A1.3 1.3 0 014.3 6h1.8l1-1.6h5.8l1 1.6h1.8A1.3 1.3 0 0117 7.3v7.4A1.3 1.3 0 0115.7 16H4.3A1.3 1.3 0 013 14.7z"/><circle cx="10" cy="10.7" r="2.8"/>',
  close: '<path d="M5 5l10 10M15 5L5 15"/>',
  trending: '<path d="M3 13.5l4.5-4.5 3 3L16.5 5"/><path d="M12.5 5H16.5V9"/>',
  bell: '<path d="M6 8.5a4 4 0 018 0v3.3l1.3 2.2H4.7L6 11.8z"/><path d="M8.3 16a1.8 1.8 0 003.4 0"/>',
};

function icon(name, extraClass) {
  const paths = ICON_PATHS[name];
  if (!paths) return '';
  return `<svg class="zc-icon${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 20 20" aria-hidden="true">${paths}</svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function friendlyError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('violates row-level security') || msg.includes('permission denied')) {
    return "You don't have permission to do that.";
  }
  if (msg.includes('duplicate key value') || msg.includes('already exists')) {
    return "That's already been done.";
  }
  if (msg.includes('jwt') || msg.includes('token is expired')) {
    return 'Your session has expired. Please sign in again on the main site.';
  }
  console.error('Unhandled error:', error.message);
  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    document.getElementById('zcLoggedOut').style.display = 'block';
    return;
  }
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (error || !profile) {
    document.getElementById('zcLoggedOut').style.display = 'block';
    return;
  }
  currentUser = profile;

  // Ensure a zc_profiles row exists for this student (first visit to Zati Chani)
  let { data: zcProfile } = await sb.from('zc_profiles').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (!zcProfile) {
    const { data: created, error: createError } = await sb.from('zc_profiles')
      .insert({ user_id: currentUser.id })
      .select('*').single();
    if (createError) { alert(friendlyError(createError)); return; }
    zcProfile = created;
  }
  currentZcProfile = zcProfile;

  const { data: settings } = await sb.from('zc_settings').select('*').eq('id', 1).single();
  zcSettings = settings || zcSettings;

  document.getElementById('zcActivateBtn').addEventListener('click', activateZatiChani);
  document.getElementById('zcDeactivateBtn').addEventListener('click', deactivateZatiChani);

  if (currentZcProfile.discoverable) {
    enterZatiChani();
  } else {
    document.getElementById('zcActivationScreen').style.display = 'flex';
  }
}

function enterZatiChani() {
  document.getElementById('zcActivationScreen').style.display = 'none';
  document.getElementById('zcApp').style.display = 'block';
  document.getElementById('zcComposerAvatar').textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'S';
  renderPrivacyPanel();
  renderProfileHeader();
  wireTabs();
  wireForms();
  wireChat();
  wireStories();
  wireFeed();
  wireModeration();
  wireFollowSubtabs();
  wireDarkModeToggle();
  wireAvatarUpload();
  loadFeed();
  loadStories();
  loadFollowing();
  loadFollowers();
  updateNotifBadge();
  startPresenceHeartbeat();
  subscribeToMessages();
}

async function activateZatiChani() {
  const btn = document.getElementById('zcActivateBtn');
  btn.disabled = true;
  btn.textContent = 'Activating...';
  const { error } = await sb.from('zc_profiles').update({ discoverable: true }).eq('user_id', currentUser.id);
  if (error) {
    alert(friendlyError(error));
    btn.disabled = false;
    btn.textContent = 'Activate Zati Chani';
    return;
  }
  currentZcProfile.discoverable = true;
  enterZatiChani();
}

async function deactivateZatiChani() {
  if (!confirm("Deactivate Zati Chani? You won't be visible, followable, or messageable until you activate again.")) return;
  const { error } = await sb.from('zc_profiles').update({ discoverable: false }).eq('user_id', currentUser.id);
  if (error) { alert(friendlyError(error)); return; }
  currentZcProfile.discoverable = false;
  document.getElementById('zcApp').style.display = 'none';
  document.getElementById('zcActivateBtn').textContent = 'Activate Zati Chani';
  document.getElementById('zcActivateBtn').disabled = false;
  document.getElementById('zcActivationScreen').style.display = 'flex';
}

// ---------------------------------------------------------------------
// TABS
// ---------------------------------------------------------------------
function wireTabs() {
  document.getElementById('zcTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.zc-nav-btn[data-panel]');
    if (!btn) return;
    switchToPanel(btn.dataset.panel, btn);
    if (btn.dataset.panel === 'chats') loadConversations();
    if (btn.dataset.panel === 'feed') { loadFeed(); loadStories(); }
    if (btn.dataset.panel === 'profile') { loadFollowing(); loadFollowers(); renderProfileHeader(); }
    if (btn.dataset.panel === 'notifications') { loadNotifications(); }
  });

  // Settings is reached from the gear icon on Profile, not the bottom nav
  document.getElementById('zcOpenSettingsBtn').addEventListener('click', () => {
    document.querySelectorAll('.zc-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-settings').classList.add('active');
  });
  document.getElementById('zcBackFromSettings').addEventListener('click', () => {
    switchToPanel('profile', document.querySelector('.zc-nav-btn[data-panel="profile"]'));
  });

  // Staff Dashboard is reached from Settings
  document.getElementById('zcModerationTab').addEventListener('click', () => {
    document.querySelectorAll('.zc-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-moderation').classList.add('active');
    loadModeration();
  });
  document.getElementById('zcBackFromModeration').addEventListener('click', () => {
    document.querySelectorAll('.zc-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-settings').classList.add('active');
  });
}

function switchToPanel(panelName, navBtn) {
  document.querySelectorAll('.zc-nav-btn').forEach(b => b.classList.remove('active'));
  if (navBtn) navBtn.classList.add('active');
  document.querySelectorAll('.zc-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + panelName).classList.add('active');
}

// ---------------------------------------------------------------------
// DARK MODE — shares the main site's exact mechanism (same localStorage
// key, same data-theme attribute) so a toggle here also applies there.
// ---------------------------------------------------------------------
const THEME_KEY = 'nt_theme';

function wireDarkModeToggle() {
  const toggle = document.getElementById('zcDarkModeToggle');
  toggle.checked = localStorage.getItem(THEME_KEY) === 'dark';
  toggle.addEventListener('change', (e) => {
    const dark = e.target.checked;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  });
}

// ---------------------------------------------------------------------
// PROFILE PICTURE
// ---------------------------------------------------------------------
async function renderProfileHeader() {
  document.getElementById('zcProfileDisplayName').textContent = currentUser.name || 'Student';
  const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'S';
  const preview = document.getElementById('zcProfileAvatarPreview');
  if (currentZcProfile.avatar_url) {
    const { data: signed } = await sb.storage.from('zc-avatars').createSignedUrl(currentZcProfile.avatar_url, 3600);
    if (signed) {
      preview.innerHTML = `<img src="${escapeHtml(signed.signedUrl)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
      return;
    }
  }
  preview.textContent = initial;
}

function wireAvatarUpload() {
  document.getElementById('zcAvatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > zcSettings.profile_image_limit_bytes) {
      alert(`That photo is too large. Max ${(zcSettings.profile_image_limit_bytes / 1048576).toFixed(0)} MB.`);
      e.target.value = '';
      return;
    }
    const path = `${currentUser.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('zc-avatars').upload(path, file, { upsert: true });
    if (uploadError) { alert(friendlyError(uploadError)); return; }
    const { error } = await sb.from('zc_profiles').update({ avatar_url: path }).eq('user_id', currentUser.id);
    if (error) { alert(friendlyError(error)); return; }
    currentZcProfile.avatar_url = path;
    renderProfileHeader();
  });
}

// ---------------------------------------------------------------------
// FIND STUDENTS
// ---------------------------------------------------------------------
function wireForms() {
  document.getElementById('zcSearchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const noteEl = document.getElementById('zcSearchNote');
    const term = document.getElementById('zcSearchInput').value.trim();
    noteEl.textContent = 'Searching...';
    const { data, error } = await sb.from('zc_profiles')
      .select('user_id, department, programme, year_of_study, profiles!inner(name)')
      .eq('discoverable', true)
      .neq('user_id', currentUser.id)
      .or(`department.ilike.%${term}%,programme.ilike.%${term}%,profiles.name.ilike.%${term}%`)
      .limit(30);
    noteEl.textContent = '';
    if (error) { noteEl.textContent = friendlyError(error); return; }
    renderSearchResults(data || []);
  });

  document.getElementById('zcOnlineToggle').addEventListener('change', (e) => savePrivacyToggle('show_online_status', e.target.checked));

  document.getElementById('zcProfileDetailsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const noteEl = document.getElementById('zcPrivacyNote');
    const updates = {
      department: document.getElementById('zcDepartment').value.trim() || null,
      programme: document.getElementById('zcProgramme').value.trim() || null,
      year_of_study: document.getElementById('zcYear').value ? parseInt(document.getElementById('zcYear').value, 10) : null,
    };
    const { error } = await sb.from('zc_profiles').update(updates).eq('user_id', currentUser.id);
    noteEl.textContent = error ? friendlyError(error) : 'Saved.';
    if (!error) Object.assign(currentZcProfile, updates);
  });
}

async function savePrivacyToggle(field, value) {
  const noteEl = document.getElementById('zcPrivacyNote');
  const { error } = await sb.from('zc_profiles').update({ [field]: value }).eq('user_id', currentUser.id);
  if (error) { noteEl.textContent = friendlyError(error); return; }
  currentZcProfile[field] = value;
  noteEl.textContent = 'Saved.';
}

function renderPrivacyPanel() {
  document.getElementById('zcOnlineToggle').checked = !!currentZcProfile.show_online_status;
  document.getElementById('zcDepartment').value = currentZcProfile.department || '';
  document.getElementById('zcProgramme').value = currentZcProfile.programme || '';
  document.getElementById('zcYear').value = currentZcProfile.year_of_study || '';
}

async function renderSearchResults(students) {
  const wrap = document.getElementById('zcSearchResults');
  if (!students.length) { wrap.innerHTML = '<p class="zc-empty">No students found.</p>'; return; }

  // Who am I already following, among these results — one query covers everyone shown
  const ids = students.map(s => s.user_id);
  const [{ data: existing }, avatarMap] = await Promise.all([
    sb.from('zc_follows').select('followed_id').eq('follower_id', currentUser.id).in('followed_id', ids),
    fetchAvatarMap(ids),
  ]);
  const followingIds = new Set((existing || []).map(f => f.followed_id));

  wrap.innerHTML = students.map(s => {
    const isFollowing = followingIds.has(s.user_id);
    return `
      <div class="zc-student-card">
        <div class="zc-student-row">
          ${avatarHtml(s.profiles.name, avatarMap[s.user_id], 40)}
          <div class="zc-student-card__info">
            <span class="zc-student-card__name">${escapeHtml(s.profiles.name)}</span>
            <span class="zc-student-card__meta">${escapeHtml([s.programme, s.department, s.year_of_study ? 'Year ' + s.year_of_study : null].filter(Boolean).join(' · '))}</span>
          </div>
        </div>
        <div class="zc-student-card__actions">
          <button class="zc-icon-btn zc-message-btn" data-id="${s.user_id}" data-name="${escapeHtml(s.profiles.name)}" title="Message">${icon('comment')}</button>
          <button class="btn zc-follow-btn ${isFollowing ? 'is-following' : ''}" data-id="${s.user_id}" data-following="${isFollowing}"><span>${isFollowing ? 'Following' : 'Follow'}</span></button>
        </div>
      </div>`;
  }).join('');

  wrap.querySelectorAll('.zc-message-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.zc-nav-btn[data-panel="chats"]').click();
      openThread(btn.dataset.id, btn.dataset.name);
    });
  });
  wrap.querySelectorAll('.zc-follow-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFollow(btn));
  });
}

async function toggleFollow(btn) {
  const targetId = btn.dataset.id;
  const isFollowing = btn.dataset.following === 'true';
  btn.disabled = true;
  if (isFollowing) {
    const { error } = await sb.from('zc_follows').delete().eq('follower_id', currentUser.id).eq('followed_id', targetId);
    btn.disabled = false;
    if (error) { alert(friendlyError(error)); return; }
    btn.dataset.following = 'false';
    btn.className = 'btn btn--primary zc-follow-btn';
    btn.querySelector('span').textContent = 'Follow';
  } else {
    const { error } = await sb.from('zc_follows').insert({ follower_id: currentUser.id, followed_id: targetId });
    btn.disabled = false;
    if (error) { alert(friendlyError(error)); return; }
    btn.dataset.following = 'true';
    btn.className = 'btn btn--ghost is-following zc-follow-btn is-following';
    btn.querySelector('span').textContent = 'Following';
    createNotification(targetId, 'follow');
  }
}

// ---------------------------------------------------------------------
// NOTIFICATIONS — simple list: small avatar, one-line description,
// timestamp, subtle unread dot (never a colored card). Created
// client-side at the point of each action (follow/reaction/repost/
// comment/message), same pattern the rest of the app already uses for
// zc_follows/zc_reactions — no DB triggers needed.
// ---------------------------------------------------------------------
async function createNotification(recipientId, type, postId) {
  if (!recipientId || recipientId === currentUser.id) return; // no self-notifications
  await sb.from('zc_notifications').insert({ recipient_id: recipientId, actor_id: currentUser.id, type, post_id: postId || null });
  // best-effort — a failed notification insert should never block the action that triggered it
}

const NOTIF_VERB = { follow: 'followed you', reaction: 'reacted to your post', comment: 'commented on your post', repost: 'reposted your post', message: 'sent you a message' };

async function loadNotifications() {
  const wrap = document.getElementById('zcNotifList');
  const { data, error } = await sb.from('zc_notifications')
    .select('id, actor_id, type, read_at, created_at, actor:profiles!zc_notifications_actor_id_fkey(name)')
    .eq('recipient_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  renderNotifications(data || []);

  const unreadIds = (data || []).filter(n => !n.read_at).map(n => n.id);
  if (unreadIds.length) {
    await sb.from('zc_notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
  }
  updateNotifBadge();
}

async function renderNotifications(notifications) {
  const wrap = document.getElementById('zcNotifList');
  if (!notifications.length) { wrap.innerHTML = '<p class="zc-empty">No notifications yet.</p>'; return; }

  const avatarMap = await fetchAvatarMap(notifications.map(n => n.actor_id));
  wrap.innerHTML = notifications.map(n => {
    const time = new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
    <div class="zc-notif-item${n.read_at ? ' read' : ''}">
      <span class="zc-notif-item__dot"></span>
      ${avatarHtml(n.actor ? n.actor.name : 'Student', avatarMap[n.actor_id], 36)}
      <div>
        <div class="zc-notif-item__text"><b>${escapeHtml(n.actor ? n.actor.name : 'Someone')}</b> ${NOTIF_VERB[n.type] || 'interacted with you'}.</div>
        <div class="zc-notif-item__time">${escapeHtml(time)}</div>
      </div>
    </div>`;
  }).join('');
}

async function updateNotifBadge() {
  const { count } = await sb.from('zc_notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', currentUser.id).is('read_at', null);
  const badge = document.getElementById('zcNotifBadge');
  badge.style.display = count ? 'block' : 'none';
}

// ---------------------------------------------------------------------
// FOLLOWING & FOLLOWERS — one-way, no approval needed (Twitter-style,
// not Facebook-style friend requests)
// ---------------------------------------------------------------------
function wireFollowSubtabs() {
  const switchTo = (sub) => {
    document.querySelectorAll('.zc-subtab').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
    document.getElementById('zcFollowingList').style.display = sub === 'following' ? 'block' : 'none';
    document.getElementById('zcFollowersList').style.display = sub === 'followers' ? 'block' : 'none';
  };
  document.querySelectorAll('.zc-subtab, .zc-profile-stat').forEach(btn => {
    btn.addEventListener('click', () => switchTo(btn.dataset.sub));
  });
}

async function loadFollowing() {
  const wrap = document.getElementById('zcFollowingList');
  const { data, error } = await sb.from('zc_follows')
    .select('followed_id, followed:profiles!zc_follows_followed_id_fkey(id,name)')
    .eq('follower_id', currentUser.id);
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  document.getElementById('zcFollowingCount').textContent = (data || []).length;
  if (!data || !data.length) { wrap.innerHTML = '<p class="zc-empty">You\'re not following anyone yet — try Find Students.</p>'; return; }

  const avatarMap = await fetchAvatarMap(data.map(f => f.followed_id));
  wrap.innerHTML = data.map(f => `
    <div class="zc-student-card">
      <div class="zc-student-row">
        ${avatarHtml(f.followed ? f.followed.name : '?', avatarMap[f.followed_id], 40)}
        <span class="zc-student-card__name">${escapeHtml(f.followed ? f.followed.name : 'Student')}</span>
      </div>
      <button class="btn btn--ghost zc-unfollow-btn" data-id="${f.followed_id}">Unfollow</button>
    </div>`).join('');

  wrap.querySelectorAll('.zc-unfollow-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await sb.from('zc_follows').delete().eq('follower_id', currentUser.id).eq('followed_id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      loadFollowing();
    });
  });
}

async function loadFollowers() {
  const wrap = document.getElementById('zcFollowersList');
  const { data, error } = await sb.from('zc_follows')
    .select('follower_id, follower:profiles!zc_follows_follower_id_fkey(id,name)')
    .eq('followed_id', currentUser.id);
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  document.getElementById('zcFollowersCount').textContent = (data || []).length;
  if (!data || !data.length) { wrap.innerHTML = '<p class="zc-empty">No followers yet.</p>'; return; }

  const avatarMap = await fetchAvatarMap(data.map(f => f.follower_id));
  wrap.innerHTML = data.map(f => `
    <div class="zc-student-card">
      <div class="zc-student-row">
        ${avatarHtml(f.follower ? f.follower.name : '?', avatarMap[f.follower_id], 40)}
        <span class="zc-student-card__name">${escapeHtml(f.follower ? f.follower.name : 'Student')}</span>
      </div>
    </div>`).join('');
}

// ---------------------------------------------------------------------
// PRESENCE — last_active_at existed on zc_profiles but nothing wrote to
// it. A simple heartbeat while Zati Chani is open, so the online-status
// line in a chat thread reflects something real.
// ---------------------------------------------------------------------
function touchPresence() {
  sb.from('zc_profiles').update({ last_active_at: new Date().toISOString() }).eq('user_id', currentUser.id);
}
function startPresenceHeartbeat() {
  touchPresence();
  setInterval(touchPresence, 60000);
}

// ---------------------------------------------------------------------
// CHATS
// ---------------------------------------------------------------------
function wireChat() {
  document.getElementById('zcThreadBack').addEventListener('click', closeThread);
  document.getElementById('zcSendBtn').addEventListener('click', sendMessage);
  document.getElementById('zcMessageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('zcAttachInput').addEventListener('change', handleAttachmentPick);
}

// DMs aren't gated by following — the conversation list shows whoever you
// actually have message history with, same as the "Message" button on a
// search result can start a brand-new thread with someone you don't follow.
async function loadConversations() {
  const wrap = document.getElementById('zcConvoList');
  wrap.innerHTML = '<p class="zc-empty">Loading...</p>';

  const { data: messages, error } = await sb.from('zc_messages')
    .select('sender_id, recipient_id, content, attachment_type, read_at, created_at, sender:profiles!zc_messages_sender_id_fkey(id,name), recipient:profiles!zc_messages_recipient_id_fkey(id,name)')
    .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
    .order('created_at', { ascending: false });
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  if (!messages || !messages.length) { wrap.innerHTML = '<p class="zc-empty">No conversations yet — message someone from Find Students.</p>'; return; }

  // Collapse to one row per correspondent, keeping only their most recent message
  const seen = new Map();
  messages.forEach(m => {
    const mine = m.sender_id === currentUser.id;
    const other = mine ? m.recipient : m.sender;
    if (!other || seen.has(other.id)) return;
    const unread = !mine && !m.read_at;
    seen.set(other.id, { id: other.id, name: other.name, content: m.content, attachment_type: m.attachment_type, unread });
  });

  const avatarMap = await fetchAvatarMap([...seen.keys()]);
  wrap.innerHTML = [...seen.values()].map(f => {
    const preview = f.content ? f.content : (f.attachment_type === 'video' ? 'Video' : (f.attachment_type ? 'Photo' : 'Say hello!'));
    return `
      <div class="zc-convo-item${f.unread ? ' unread' : ''}" data-id="${f.id}" data-name="${escapeHtml(f.name)}">
        ${avatarHtml(f.name, avatarMap[f.id], 46)}
        <div>
          <div class="zc-convo-name">${escapeHtml(f.name)}</div>
          <div class="zc-convo-preview">${escapeHtml(preview)}</div>
        </div>
        ${f.unread ? '<span class="zc-convo-item__dot"></span>' : ''}
      </div>`;
  }).join('');

  wrap.querySelectorAll('.zc-convo-item').forEach(item => {
    item.addEventListener('click', () => openThread(item.dataset.id, item.dataset.name));
  });
}

async function openThread(friendId, friendName) {
  zcActiveThreadFriendId = friendId;
  zcActiveThreadFriendName = friendName;
  document.getElementById('zcThreadName').textContent = friendName;
  document.getElementById('zcThreadAvatar').textContent = friendName.charAt(0).toUpperCase();
  document.getElementById('zcThreadStatus').textContent = '';
  document.getElementById('zcConvoListView').style.display = 'none';
  document.getElementById('zcThreadView').classList.add('active');
  renderThreadStatus(friendId);
  await renderThread();
  markThreadRead(friendId);
}

// Subtle "Active now" / "Active Xm ago" line — only shown if the other
// student has opted into show_online_status, same privacy toggle already
// wired up in Settings ("People can see when you're active").
async function renderThreadStatus(friendId) {
  const statusEl = document.getElementById('zcThreadStatus');
  const { data } = await sb.from('zc_profiles').select('show_online_status, last_active_at').eq('user_id', friendId).maybeSingle();
  if (!data || !data.show_online_status || !data.last_active_at) return;
  const minsAgo = (Date.now() - new Date(data.last_active_at).getTime()) / 60000;
  if (minsAgo < 3) {
    statusEl.textContent = 'Active now';
    statusEl.classList.add('online');
  } else if (minsAgo < 60) {
    statusEl.textContent = `Active ${Math.round(minsAgo)}m ago`;
  } else if (minsAgo < 1440) {
    statusEl.textContent = `Active ${Math.round(minsAgo / 60)}h ago`;
  }
}

async function markThreadRead(friendId) {
  await sb.from('zc_messages').update({ read_at: new Date().toISOString() })
    .eq('recipient_id', currentUser.id).eq('sender_id', friendId).is('read_at', null);
}

function closeThread() {
  zcActiveThreadFriendId = null;
  document.getElementById('zcThreadView').classList.remove('active');
  document.getElementById('zcConvoListView').style.display = 'block';
  loadConversations();
}

async function renderThread() {
  const body = document.getElementById('zcThreadBody');
  const { data: messages, error } = await sb.from('zc_messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${zcActiveThreadFriendId}),and(sender_id.eq.${zcActiveThreadFriendId},recipient_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true });
  if (error) { body.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  if (!messages || !messages.length) { body.innerHTML = '<p class="zc-empty">No messages yet — say hello!</p>'; return; }

  const lastMine = [...messages].reverse().find(m => m.sender_id === currentUser.id);

  let html = '';
  let lastDateKey = null;
  let lastSenderId = null;
  let lastTime = null;

  for (const m of await Promise.all(messages.map(async (m) => {
    let mediaHtml = '';
    if (m.attachment_url) {
      const { data: signed } = await sb.storage.from('zc-chat-media').createSignedUrl(m.attachment_url, 3600);
      const url = signed ? signed.signedUrl : '';
      mediaHtml = m.attachment_type === 'video'
        ? `<video src="${escapeHtml(url)}" controls></video>`
        : `<img src="${escapeHtml(url)}" alt="attachment" />`;
    }
    return { ...m, mediaHtml };
  }))) {
    const created = new Date(m.created_at);
    const dateKey = created.toDateString();
    if (dateKey !== lastDateKey) {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const label = dateKey === today ? 'Today' : dateKey === yesterday ? 'Yesterday' : created.toLocaleDateString([], { month: 'short', day: 'numeric' });
      html += `<div class="zc-date-sep">${escapeHtml(label)}</div>`;
      lastDateKey = dateKey;
      lastSenderId = null;
    }

    const mine = m.sender_id === currentUser.id;
    const grouped = m.sender_id === lastSenderId && lastTime && (created - lastTime) < 3 * 60000;
    lastSenderId = m.sender_id;
    lastTime = created;

    const time = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isLastMine = lastMine && m.id === lastMine.id;
    const seenTag = (mine && isLastMine && m.read_at) ? '<span>· Seen</span>' : '';
    const reportLink = mine ? '' : `<button class="zc-bubble-report" onclick="openReportPrompt('message','${m.id}')">Report</button>`;

    html += `<div class="zc-bubble ${mine ? 'mine' : 'theirs'}${grouped ? ' grouped' : ''}">
      ${m.content ? escapeHtml(m.content) : ''}
      ${m.mediaHtml}
      <div class="zc-bubble-time">${escapeHtml(time)}${seenTag}</div>
      ${reportLink}
    </div>`;
  }

  body.innerHTML = html;
  body.scrollTop = body.scrollHeight;
}

let zcPendingFile = null;

function handleAttachmentPick(e) {
  const file = e.target.files[0];
  const noteEl = document.getElementById('zcThreadNote');
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  const limit = isVideo ? zcSettings.chat_video_limit_bytes : zcSettings.chat_image_limit_bytes;

  if (file.size > limit) {
    noteEl.textContent = `That file is too large. Max ${(limit / 1048576).toFixed(0)} MB for ${isVideo ? 'videos' : 'images'}.`;
    e.target.value = '';
    return;
  }

  if (isVideo) {
    // Soft client-side duration check — see plan doc for why this isn't enforced server-side.
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > zcSettings.video_max_duration_seconds) {
        noteEl.textContent = `Videos must be ${zcSettings.video_max_duration_seconds} seconds or shorter.`;
        e.target.value = '';
        zcPendingFile = null;
      } else {
        zcPendingFile = file;
        noteEl.textContent = `Attached: ${file.name}`;
      }
    };
    videoEl.src = URL.createObjectURL(file);
  } else {
    zcPendingFile = file;
    noteEl.textContent = `Attached: ${file.name}`;
  }
}

async function sendMessage() {
  const input = document.getElementById('zcMessageInput');
  const noteEl = document.getElementById('zcThreadNote');
  const content = input.value.trim();
  if (!content && !zcPendingFile) return;

  let attachment_url = null;
  let attachment_type = null;

  if (zcPendingFile) {
    const path = `${currentUser.id}/${zcActiveThreadFriendId}/${Date.now()}-${zcPendingFile.name}`;
    const { error: uploadError } = await sb.storage.from('zc-chat-media').upload(path, zcPendingFile);
    if (uploadError) { noteEl.textContent = friendlyError(uploadError); return; }
    attachment_url = path;
    attachment_type = zcPendingFile.type.startsWith('video/') ? 'video' : 'image';
  }

  const { error } = await sb.from('zc_messages').insert({
    sender_id: currentUser.id,
    recipient_id: zcActiveThreadFriendId,
    content: content || null,
    attachment_url,
    attachment_type,
  });

  if (error) { noteEl.textContent = friendlyError(error); return; }

  createNotification(zcActiveThreadFriendId, 'message');
  input.value = '';
  zcPendingFile = null;
  document.getElementById('zcAttachInput').value = '';
  noteEl.textContent = '';
  renderThread();
}

function subscribeToMessages() {
  sb.channel('zc-messages-' + currentUser.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'zc_messages', filter: `recipient_id=eq.${currentUser.id}` }, (payload) => {
      if (zcActiveThreadFriendId && payload.new.sender_id === zcActiveThreadFriendId) {
        renderThread();
        markThreadRead(zcActiveThreadFriendId);
      } else if (document.getElementById('panel-chats').classList.contains('active')) {
        loadConversations();
      }
    })
    .subscribe();
}

// ---------------------------------------------------------------------
// STORIES
// ---------------------------------------------------------------------
let zcStoryGroups = [];   // [{ author_id, author_name, stories: [...] }]
let zcViewerGroupIdx = 0;
let zcViewerStoryIdx = 0;

function wireStories() {
  document.getElementById('zcStoryFileInput').addEventListener('change', handleStoryFilePick);
  document.getElementById('zcStoryViewerClose').addEventListener('click', closeStoryViewer);
  document.getElementById('zcStoryPrev').addEventListener('click', () => stepStory(-1));
  document.getElementById('zcStoryNext').addEventListener('click', () => stepStory(1));
  document.getElementById('zcStoryMenuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('zcStoryMenu').classList.toggle('open');
  });

  document.getElementById('zcStoryChooseWrite').addEventListener('click', () => {
    document.getElementById('zcStoryChoiceMenu').style.display = 'none';
    document.getElementById('zcTextStoryForm').style.display = 'block';
  });
  document.getElementById('zcStoryChoosePhoto').addEventListener('click', () => {
    document.getElementById('zcStoryChoiceMenu').style.display = 'none';
    document.getElementById('zcStoryFileInput').click();
  });
  document.getElementById('zcCancelTextStory').addEventListener('click', () => {
    document.getElementById('zcTextStoryForm').style.display = 'none';
    document.getElementById('zcTextStoryInput').value = '';
  });
  document.getElementById('zcPostTextStory').addEventListener('click', async () => {
    const noteEl = document.getElementById('zcStoryNote');
    const text = document.getElementById('zcTextStoryInput').value.trim();
    if (!text) return;
    const { error } = await sb.from('zc_stories').insert({ author_id: currentUser.id, content: text });
    noteEl.textContent = error ? friendlyError(error) : 'Story posted!';
    if (!error) {
      document.getElementById('zcTextStoryInput').value = '';
      document.getElementById('zcTextStoryForm').style.display = 'none';
      loadStories();
    }
  });
}

// Lightweight client-side "seen" tracking so unviewed stories keep the
// accent ring and viewed ones fall back to neutral, like every mature
// social app. Purely a display state — no backend change needed.
function lastSeenStoryTime(authorId) {
  return localStorage.getItem(`zc_story_seen_${authorId}`);
}
function markStoryGroupViewed(group) {
  if (!group || !group.stories.length) return;
  const latest = group.stories[group.stories.length - 1].created_at;
  localStorage.setItem(`zc_story_seen_${group.author_id}`, latest);
  const ring = document.querySelector(`.zc-story-ring[data-group="${zcStoryGroups.indexOf(group)}"]`);
  if (ring) ring.classList.add('viewed');
}
function isStoryGroupViewed(group) {
  const seen = lastSeenStoryTime(group.author_id);
  if (!seen) return false;
  const latest = group.stories[group.stories.length - 1].created_at;
  return new Date(seen) >= new Date(latest);
}

async function loadStories() {
  const rail = document.getElementById('zcStoryRail');
  const { data: stories, error } = await sb.from('zc_stories')
    .select('id, author_id, content, media_url, media_type, created_at, author:profiles!zc_stories_author_id_fkey(name)')
    .order('created_at', { ascending: true });

  const noteEl = document.getElementById('zcStoryNote');
  if (error) { noteEl.textContent = friendlyError(error); return; }

  const groupsMap = new Map();
  (stories || []).forEach(s => {
    if (!groupsMap.has(s.author_id)) groupsMap.set(s.author_id, { author_id: s.author_id, author_name: s.author.name, stories: [] });
    groupsMap.get(s.author_id).stories.push(s);
  });
  zcStoryGroups = Array.from(groupsMap.values());
  // Your own group first, then everyone else
  zcStoryGroups.sort((a, b) => (a.author_id === currentUser.id ? -1 : b.author_id === currentUser.id ? 1 : 0));

  const addRing = `
    <div class="zc-story-ring zc-story-ring--add" id="zcAddStoryRing">
      <div class="zc-story-ring__circle">+</div>
      <span>Your story</span>
    </div>`;

  const otherRings = zcStoryGroups
    .filter(g => g.author_id !== currentUser.id)
    .map((g, i) => `
      <div class="zc-story-ring${isStoryGroupViewed(g) ? ' viewed' : ''}" data-group="${zcStoryGroups.indexOf(g)}">
        <div class="zc-story-ring__circle">${escapeHtml(g.author_name.charAt(0).toUpperCase())}</div>
        <span>${escapeHtml(g.author_name)}</span>
      </div>`).join('');

  rail.innerHTML = addRing + otherRings;

  document.getElementById('zcAddStoryRing').addEventListener('click', () => {
    const own = zcStoryGroups.find(g => g.author_id === currentUser.id);
    if (own && own.stories.length) { openStoryViewer(zcStoryGroups.indexOf(own), 0); }
    else { document.getElementById('zcStoryChoiceMenu').style.display = 'block'; }
  });

  rail.querySelectorAll('.zc-story-ring[data-group]').forEach(ring => {
    ring.addEventListener('click', () => openStoryViewer(parseInt(ring.dataset.group, 10), 0));
  });
}

let zcPendingStoryFile = null;

function handleStoryFilePick(e) {
  const file = e.target.files[0];
  const noteEl = document.getElementById('zcStoryNote');
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  const limit = isVideo ? zcSettings.chat_video_limit_bytes : zcSettings.chat_image_limit_bytes;

  if (file.size > limit) {
    noteEl.textContent = `That file is too large. Max ${(limit / 1048576).toFixed(0)} MB for ${isVideo ? 'videos' : 'images'}.`;
    e.target.value = '';
    return;
  }

  const postStory = async () => {
    const path = `${currentUser.id}/${Date.now()}-${file.name}`;
    noteEl.textContent = 'Posting...';
    const { error: uploadError } = await sb.storage.from('zc-story-media').upload(path, file);
    if (uploadError) { noteEl.textContent = friendlyError(uploadError); return; }
    const { error } = await sb.from('zc_stories').insert({
      author_id: currentUser.id,
      media_url: path,
      media_type: isVideo ? 'video' : 'image',
    });
    noteEl.textContent = error ? friendlyError(error) : 'Story posted!';
    e.target.value = '';
    if (!error) loadStories();
  };

  if (isVideo) {
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > zcSettings.video_max_duration_seconds) {
        noteEl.textContent = `Videos must be ${zcSettings.video_max_duration_seconds} seconds or shorter.`;
        e.target.value = '';
      } else {
        postStory();
      }
    };
    videoEl.src = URL.createObjectURL(file);
  } else {
    postStory();
  }
}

async function openStoryViewer(groupIdx, storyIdx) {
  zcViewerGroupIdx = groupIdx;
  zcViewerStoryIdx = storyIdx;
  await renderStoryViewer();
  document.getElementById('zcStoryViewer').classList.add('active');
  markStoryGroupViewed(zcStoryGroups[groupIdx]);
}

function closeStoryViewer() {
  document.getElementById('zcStoryViewer').classList.remove('active');
}

async function renderStoryViewer() {
  const group = zcStoryGroups[zcViewerGroupIdx];
  if (!group) { closeStoryViewer(); return; }
  const story = group.stories[zcViewerStoryIdx];
  if (!story) { closeStoryViewer(); return; }

  document.getElementById('zcStoryViewerHeader').textContent =
    `${group.author_name} · ${new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const isAuthor = group.author_id === currentUser.id;
  const isTextOnly = !story.media_url;
  const menu = document.getElementById('zcStoryMenu');
  menu.classList.remove('open');
  menu.innerHTML = isAuthor
    ? `${isTextOnly ? `<button id="zcStoryMenuEdit">${icon('edit')} Edit</button>` : ''}
       <button id="zcStoryMenuShare">${icon('share')} Share</button>
       <button id="zcStoryMenuDelete" class="zc-menu-danger">${icon('trash')} Delete</button>`
    : `<button id="zcStoryMenuShare">${icon('share')} Share</button>
       <button id="zcStoryMenuReport">${icon('flag')} Report</button>`;

  const editBtn = document.getElementById('zcStoryMenuEdit');
  if (editBtn) editBtn.addEventListener('click', () => editCurrentStory());
  document.getElementById('zcStoryMenuShare').addEventListener('click', () => shareCurrentStory());
  const deleteBtn = document.getElementById('zcStoryMenuDelete');
  if (deleteBtn) deleteBtn.addEventListener('click', deleteCurrentStory);
  const reportBtn = document.getElementById('zcStoryMenuReport');
  if (reportBtn) reportBtn.addEventListener('click', () => openReportPrompt('story', story.id));

  const mediaEl = document.getElementById('zcStoryViewerMedia');
  if (story.media_url) {
    const { data: signed } = await sb.storage.from('zc-story-media').createSignedUrl(story.media_url, 3600);
    const url = signed ? signed.signedUrl : '';
    mediaEl.innerHTML = story.media_type === 'video'
      ? `<video src="${escapeHtml(url)}" controls autoplay></video>`
      : `<img src="${escapeHtml(url)}" alt="story" />`;
  } else {
    mediaEl.innerHTML = `<div class="zc-story-viewer__text">${escapeHtml(story.content)}</div>`;
  }
}

async function editCurrentStory() {
  const group = zcStoryGroups[zcViewerGroupIdx];
  const story = group && group.stories[zcViewerStoryIdx];
  if (!story) return;
  const updated = prompt('Edit your story:', story.content || '');
  if (updated === null || !updated.trim()) return;
  const { error } = await sb.from('zc_stories').update({ content: updated.trim() }).eq('id', story.id);
  if (error) { alert(friendlyError(error)); return; }
  story.content = updated.trim();
  renderStoryViewer();
}

async function shareCurrentStory() {
  const group = zcStoryGroups[zcViewerGroupIdx];
  const story = group && group.stories[zcViewerStoryIdx];
  if (!story) return;
  const snippet = story.content ? story.content.slice(0, 100) : `${group.author_name}'s story`;
  const shareData = { title: 'Zati Chani', text: snippet, url: window.location.origin + window.location.pathname };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (e) { /* cancelled */ }
  } else {
    await navigator.clipboard.writeText(`${snippet}\n${shareData.url}`);
    alert('Link copied — paste it anywhere to share.');
  }
}

async function deleteCurrentStory() {
  const group = zcStoryGroups[zcViewerGroupIdx];
  const story = group && group.stories[zcViewerStoryIdx];
  if (!story) return;
  if (!confirm('Delete this story?')) return;

  const { error } = await sb.from('zc_stories').delete().eq('id', story.id);
  if (error) { alert(friendlyError(error)); return; }
  if (story.media_url) {
    await sb.storage.from('zc-story-media').remove([story.media_url]);
  }

  group.stories.splice(zcViewerStoryIdx, 1);
  if (!group.stories.length) {
    closeStoryViewer();
  } else if (zcViewerStoryIdx >= group.stories.length) {
    zcViewerStoryIdx = group.stories.length - 1;
    renderStoryViewer();
  } else {
    renderStoryViewer();
  }
  loadStories();
}

function stepStory(direction) {
  const group = zcStoryGroups[zcViewerGroupIdx];
  let nextStoryIdx = zcViewerStoryIdx + direction;

  if (nextStoryIdx >= 0 && nextStoryIdx < group.stories.length) {
    zcViewerStoryIdx = nextStoryIdx;
    renderStoryViewer();
    return;
  }

  // Move to the next/previous author's group
  let nextGroupIdx = zcViewerGroupIdx + direction;
  if (nextGroupIdx < 0 || nextGroupIdx >= zcStoryGroups.length) { closeStoryViewer(); return; }
  zcViewerGroupIdx = nextGroupIdx;
  zcViewerStoryIdx = direction > 0 ? 0 : zcStoryGroups[nextGroupIdx].stories.length - 1;
  renderStoryViewer();
}

// ---------------------------------------------------------------------
// FEED
// ---------------------------------------------------------------------
const REACTIONS = { like: 'like', laugh: 'laugh', love: 'love', wow: 'wow', sad: 'sad' };
let zcPendingPostFile = null;

function wireFeed() {
  const composerPrompt = document.getElementById('zcPostContent').closest('.zc-composer-prompt');
  const composerTextarea = document.getElementById('zcPostContent');

  const expandComposer = () => {
    composerPrompt.classList.add('active');
    composerTextarea.rows = 3;
  };
  const collapseComposerIfEmpty = () => {
    if (composerTextarea.value.trim() || zcPendingPostFile) return;
    composerPrompt.classList.remove('active');
    composerTextarea.rows = 1;
  };
  composerTextarea.addEventListener('focus', expandComposer);
  composerTextarea.addEventListener('input', expandComposer);
  composerTextarea.addEventListener('blur', collapseComposerIfEmpty);

  document.getElementById('zcPostFileInput').addEventListener('change', (e) => {
    zcPendingPostFile = e.target.files[0] || null;
    document.getElementById('zcPostNote').textContent = zcPendingPostFile ? `Attached: ${zcPendingPostFile.name}` : '';
    if (zcPendingPostFile) expandComposer();
  });

  document.getElementById('zcPostSubmit').addEventListener('click', async () => {
    const noteEl = document.getElementById('zcPostNote');
    const content = document.getElementById('zcPostContent').value.trim();
    if (!content && !zcPendingPostFile) { noteEl.textContent = 'Write something or attach a photo/video first.'; return; }

    let media_url = null, media_type = null;
    if (zcPendingPostFile) {
      const isVideo = zcPendingPostFile.type.startsWith('video/');
      const limit = isVideo ? zcSettings.chat_video_limit_bytes : zcSettings.chat_image_limit_bytes;
      if (zcPendingPostFile.size > limit) {
        noteEl.textContent = `That file is too large. Max ${(limit / 1048576).toFixed(0)} MB for ${isVideo ? 'videos' : 'images'}.`;
        return;
      }
      const path = `${currentUser.id}/${Date.now()}-${zcPendingPostFile.name}`;
      noteEl.textContent = 'Posting...';
      const { error: uploadError } = await sb.storage.from('zc-post-media').upload(path, zcPendingPostFile);
      if (uploadError) { noteEl.textContent = friendlyError(uploadError); return; }
      media_url = path;
      media_type = isVideo ? 'video' : 'image';
    }

    const { error } = await sb.from('zc_posts').insert({
      author_id: currentUser.id, content: content || null, media_url, media_type,
    });
    noteEl.textContent = error ? friendlyError(error) : '';
    if (!error) {
      document.getElementById('zcPostContent').value = '';
      document.getElementById('zcPostFileInput').value = '';
      zcPendingPostFile = null;
      collapseComposerIfEmpty();
      loadFeed();
    }
  });
}

async function loadFeed() {
  await Promise.all([renderTrending(), renderFeedList()]);
}

async function renderTrending() {
  const wrap = document.getElementById('zcTrendingList');
  const { data, error } = await sb.from('zc_trending_posts').select('*').limit(5);
  if (error || !data || !data.length) { wrap.innerHTML = '<p class="zc-empty">Nothing trending yet.</p>'; return; }
  wrap.innerHTML = data.map(p => `
    <div class="zc-trending-item"><span>${escapeHtml((p.content || '(shared a post)').slice(0, 60))}${(p.content || '').length > 60 ? '...' : ''}</span><span class="zc-trending-item__stat">${icon('trending', 'zc-icon-sm')}${p.reaction_count}</span></div>
  `).join('');
}

// Resolves a signed avatar URL (or null) for a batch of user IDs in one query
async function fetchAvatarMap(userIds) {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (!uniqueIds.length) return {};
  const { data } = await sb.from('zc_profiles').select('user_id, avatar_url').in('user_id', uniqueIds);
  const map = {};
  await Promise.all((data || []).map(async (row) => {
    if (!row.avatar_url) return;
    const { data: signed } = await sb.storage.from('zc-avatars').createSignedUrl(row.avatar_url, 3600);
    if (signed) map[row.user_id] = signed.signedUrl;
  }));
  return map;
}

function avatarHtml(name, url, sizePx) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const size = sizePx || 36;
  if (url) return `<img src="${escapeHtml(url)}" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; flex-shrink:0;" />`;
  return `<div style="width:${size}px; height:${size}px; border-radius:50%; background:var(--navy); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:${Math.round(size * 0.4)}px; flex-shrink:0;">${escapeHtml(initial)}</div>`;
}

async function renderFeedList() {
  const wrap = document.getElementById('zcFeedList');
  const { data: posts, error } = await sb.from('zc_posts')
    .select('*, author:profiles!zc_posts_author_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  if (!posts || !posts.length) { wrap.innerHTML = '<p class="zc-empty">No posts yet — be the first to share something.</p>'; return; }

  // Pull in the original posts for any reposts in this batch
  const originalIds = posts.map(p => p.original_post_id).filter(Boolean);
  let originals = [];
  if (originalIds.length) {
    const { data } = await sb.from('zc_posts').select('*, author:profiles!zc_posts_author_id_fkey(name)').in('id', originalIds);
    originals = data || [];
  }

  const { data: myReactions } = await sb.from('zc_reactions').select('post_id, reaction_type').eq('user_id', currentUser.id);
  const { data: allReactions } = await sb.from('zc_reactions').select('post_id, reaction_type');
  const { data: commentCounts } = await sb.from('zc_post_comments').select('post_id');

  const allAuthorIds = posts.map(p => p.author_id).concat(originals.map(o => o.author_id));
  const avatarMap = await fetchAvatarMap(allAuthorIds);

  const cards = await Promise.all(posts.map(async (p) => {
    let mediaHtml = '';
    if (p.media_url) {
      const { data: signed } = await sb.storage.from('zc-post-media').createSignedUrl(p.media_url, 3600);
      const url = signed ? signed.signedUrl : '';
      mediaHtml = `<div class="zc-post__media">${p.media_type === 'video' ? `<video src="${escapeHtml(url)}" controls></video>` : `<img src="${escapeHtml(url)}" alt="post" />`}</div>`;
    }

    const time = new Date(p.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const myReaction = (myReactions || []).find(r => r.post_id === p.id);
    const commentCount = (commentCounts || []).filter(c => c.post_id === p.id).length;

    const reactionBtns = Object.entries(REACTIONS).map(([type, iconName]) => {
      const count = (allReactions || []).filter(r => r.post_id === p.id && r.reaction_type === type).length;
      const mine = myReaction && myReaction.reaction_type === type;
      return `<button class="zc-icon-action ${mine ? 'mine' : ''}" data-post="${p.id}" data-type="${type}">${icon(iconName)}${count ? `<span>${count}</span>` : ''}</button>`;
    }).join('');

    let repostedHtml = '';
    if (p.original_post_id) {
      const orig = originals.find(o => o.id === p.original_post_id);
      repostedHtml = orig
        ? `<div class="zc-repost-preview">
             <div class="zc-post__head" style="margin-bottom:4px;">
               ${avatarHtml(orig.author.name, avatarMap[orig.author_id], 26)}
               <div><div class="zc-post__author" style="font-size:13px;">${escapeHtml(orig.author.name)}</div></div>
             </div>
             <div class="zc-post__content" style="font-size:14px;">${escapeHtml(orig.content || '')}</div>
           </div>`
        : `<div class="zc-note zc-repost-preview">This post is no longer available.</div>`;
    }

    const isAuthor = p.author_id === currentUser.id;
    const menuItems = isAuthor
      ? `<button class="zc-menu-edit" data-id="${p.id}">${icon('edit')} Edit</button>
         <button class="zc-menu-share" data-id="${p.id}">${icon('share')} Share</button>
         <button class="zc-menu-delete zc-menu-danger" data-id="${p.id}">${icon('trash')} Delete</button>`
      : `<button class="zc-menu-share" data-id="${p.id}">${icon('share')} Share</button>
         <button class="zc-menu-report" data-id="${p.id}">${icon('flag')} Report</button>`;

    return `
      <div class="zc-post">
        <button class="zc-post-menu-btn zc-icon-btn" data-menu="${p.id}">${icon('more')}</button>
        <div class="zc-post-menu" id="zc-menu-${p.id}">${menuItems}</div>
        <div class="zc-post__head">
          ${avatarHtml(p.author.name, avatarMap[p.author_id], 36)}
          <div>
            <div class="zc-post__author">${escapeHtml(p.author.name)}</div>
            <div class="zc-post__time">${escapeHtml(time)}</div>
          </div>
        </div>
        ${p.content ? `<div class="zc-post__content" id="zc-content-${p.id}">${escapeHtml(p.content)}</div>` : `<div id="zc-content-${p.id}"></div>`}
        ${repostedHtml}
        ${mediaHtml}
        <div class="zc-post__reactions">
          ${reactionBtns}
          <button class="zc-icon-action zc-repost-btn" data-id="${p.id}">${icon('repost')}<span>Repost</span></button>
          <button class="zc-icon-action zc-comment-toggle" data-id="${p.id}">${icon('comment')}${commentCount ? `<span>${commentCount}</span>` : ''}</button>
        </div>
        <div id="zc-comments-${p.id}" style="display:none; margin-top:10px;"></div>
      </div>`;
  }));

  wrap.innerHTML = cards.join('');

  wrap.querySelectorAll('.zc-post-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById(`zc-menu-${btn.dataset.menu}`);
      const wasOpen = menu.classList.contains('open');
      document.querySelectorAll('.zc-post-menu.open').forEach(m => m.classList.remove('open'));
      if (!wasOpen) menu.classList.add('open');
    });
  });
  wrap.querySelectorAll('.zc-menu-edit').forEach(btn => btn.addEventListener('click', () => editPost(btn.dataset.id)));
  wrap.querySelectorAll('.zc-menu-delete').forEach(btn => btn.addEventListener('click', () => deletePost(btn.dataset.id)));
  wrap.querySelectorAll('.zc-menu-share').forEach(btn => btn.addEventListener('click', () => sharePost(btn.dataset.id)));
  wrap.querySelectorAll('.zc-menu-report').forEach(btn => btn.addEventListener('click', () => openReportPrompt('post', btn.dataset.id)));
  wrap.querySelectorAll('.zc-icon-action[data-post]').forEach(btn => {
    btn.addEventListener('click', () => toggleReaction(btn.dataset.post, btn.dataset.type));
  });
  wrap.querySelectorAll('.zc-repost-btn').forEach(btn => {
    btn.addEventListener('click', () => handleRepost(btn.dataset.id));
  });
  wrap.querySelectorAll('.zc-comment-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleComments(btn.dataset.id));
  });
}

// Close any open post menu when clicking elsewhere on the page
document.addEventListener('click', () => {
  document.querySelectorAll('.zc-post-menu.open').forEach(m => m.classList.remove('open'));
});

async function editPost(postId) {
  const contentEl = document.getElementById(`zc-content-${postId}`);
  const current = contentEl ? contentEl.textContent : '';
  const updated = prompt('Edit your post:', current);
  if (updated === null) return; // cancelled
  const trimmed = updated.trim();
  const { error } = await sb.from('zc_posts').update({ content: trimmed || null }).eq('id', postId);
  if (error) { alert(friendlyError(error)); return; }
  renderFeedList();
}

async function sharePost(postId) {
  const contentEl = document.getElementById(`zc-content-${postId}`);
  const snippet = contentEl ? contentEl.textContent.slice(0, 100) : 'a post on Zati Chani';
  const shareData = { title: 'Zati Chani', text: snippet, url: window.location.origin + window.location.pathname };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (e) { /* user cancelled share sheet, nothing to do */ }
  } else {
    await navigator.clipboard.writeText(`${snippet}\n${shareData.url}`);
    alert('Link copied — paste it anywhere to share.');
  }
}

async function deletePost(postId) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const { data: post } = await sb.from('zc_posts').select('media_url').eq('id', postId).single();
  const { error } = await sb.from('zc_posts').delete().eq('id', postId);
  if (error) { alert(friendlyError(error)); return; }
  if (post && post.media_url) {
    await sb.storage.from('zc-post-media').remove([post.media_url]);
  }
  loadFeed();
}

async function handleRepost(postId) {
  if (!confirm('Repost this to your followers?')) return;
  const { error } = await sb.from('zc_posts').insert({ author_id: currentUser.id, original_post_id: postId });
  if (error) { alert(friendlyError(error)); return; }
  const { data: original } = await sb.from('zc_posts').select('author_id').eq('id', postId).single();
  if (original) createNotification(original.author_id, 'repost', postId);
  loadFeed();
}

async function toggleReaction(postId, type) {
  const { data: existing } = await sb.from('zc_reactions').select('id, reaction_type').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();

  if (existing && existing.reaction_type === type) {
    await sb.from('zc_reactions').delete().eq('id', existing.id);
  } else if (existing) {
    await sb.from('zc_reactions').delete().eq('id', existing.id);
    await sb.from('zc_reactions').insert({ post_id: postId, user_id: currentUser.id, reaction_type: type });
  } else {
    await sb.from('zc_reactions').insert({ post_id: postId, user_id: currentUser.id, reaction_type: type });
    const { data: post } = await sb.from('zc_posts').select('author_id').eq('id', postId).single();
    if (post) createNotification(post.author_id, 'reaction', postId);
  }
  renderFeedList();
}

// ---------------------------------------------------------------------
// COMMENTS & REPLIES
// ---------------------------------------------------------------------
async function toggleComments(postId) {
  const wrap = document.getElementById(`zc-comments-${postId}`);
  const isOpen = wrap.style.display !== 'none';
  if (isOpen) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  await renderComments(postId);
}

async function renderComments(postId) {
  const wrap = document.getElementById(`zc-comments-${postId}`);
  wrap.innerHTML = '<p class="zc-empty">Loading comments...</p>';

  const { data: comments, error } = await sb.from('zc_post_comments')
    .select('*, author:profiles!zc_post_comments_author_id_fkey(name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }

  const avatarMap = await fetchAvatarMap((comments || []).map(c => c.author_id));
  const topLevel = (comments || []).filter(c => !c.parent_comment_id);
  const repliesFor = (id) => (comments || []).filter(c => c.parent_comment_id === id);

  const commentHtml = (c, isReply) => `
    <div class="zc-comment${isReply ? ' zc-comment--reply' : ''}">
      ${avatarHtml(c.author.name, avatarMap[c.author_id], 28)}
      <div class="zc-comment__body">
        <div class="zc-comment__bubble">
          <div class="zc-comment__author">${escapeHtml(c.author.name)}</div>
          <div class="zc-comment__text">${escapeHtml(c.content)}</div>
        </div>
        <div>
          <button class="zc-comment__reply-btn zc-reply-btn" data-id="${c.id}" data-name="${escapeHtml(c.author.name)}">Reply</button>
        </div>
        <div id="zc-reply-form-${c.id}" style="display:none;"></div>
      </div>
    </div>`;

  let html = `<div class="zc-comments">` + topLevel.map(c => commentHtml(c, false) + repliesFor(c.id).map(r => commentHtml(r, true)).join('')).join('');
  html += `
    <div class="zc-comment-composer">
      <input type="text" id="zc-new-comment-${postId}" placeholder="Write a comment..." />
      <button class="btn btn--primary zc-submit-comment" data-post="${postId}">Post</button>
    </div>
  </div>`;

  wrap.innerHTML = html;

  wrap.querySelectorAll('.zc-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const formWrap = document.getElementById(`zc-reply-form-${btn.dataset.id}`);
      formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
      formWrap.innerHTML = `
        <div class="zc-reply-composer">
          <input type="text" id="zc-reply-input-${btn.dataset.id}" placeholder="Reply to ${escapeHtml(btn.dataset.name)}..." />
          <button class="btn btn--primary zc-submit-reply" data-post="${postId}" data-parent="${btn.dataset.id}">Reply</button>
        </div>`;
      formWrap.querySelector('.zc-submit-reply').addEventListener('click', () => submitComment(postId, btn.dataset.id));
    });
  });
  wrap.querySelectorAll('.zc-submit-comment').forEach(btn => {
    btn.addEventListener('click', () => submitComment(btn.dataset.post, null));
  });
}

async function submitComment(postId, parentCommentId) {
  const inputId = parentCommentId ? `zc-reply-input-${parentCommentId}` : `zc-new-comment-${postId}`;
  const input = document.getElementById(inputId);
  const content = input.value.trim();
  if (!content) return;
  const { error } = await sb.from('zc_post_comments').insert({
    post_id: postId, author_id: currentUser.id, content, parent_comment_id: parentCommentId || null,
  });
  if (error) { alert(friendlyError(error)); return; }

  if (parentCommentId) {
    const { data: parent } = await sb.from('zc_post_comments').select('author_id').eq('id', parentCommentId).single();
    if (parent) createNotification(parent.author_id, 'comment', postId);
  } else {
    const { data: post } = await sb.from('zc_posts').select('author_id').eq('id', postId).single();
    if (post) createNotification(post.author_id, 'comment', postId);
  }

  await renderComments(postId);
  await renderFeedList(); // refresh comment count on the post card
}

async function openReportPrompt(targetType, targetId) {
  const reason = prompt('Why are you reporting this?');
  if (!reason || !reason.trim()) return;
  const { error } = await sb.from('zc_reports').insert({
    reporter_id: currentUser.id, target_type: targetType, target_id: targetId, reason: reason.trim(),
  });
  alert(error ? friendlyError(error) : 'Thanks — this has been reported to staff.');
}

// ---------------------------------------------------------------------
// MODERATION (staff only)
// ---------------------------------------------------------------------
function wireModeration() {
  if (currentUser.role === 'admin' || currentUser.role === 'assistant_admin') {
    document.getElementById('zcModerationTab').style.display = 'flex';
  }

  document.getElementById('zcSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const noteEl = document.getElementById('zcSettingsNote');
    const mb = (id) => parseFloat(document.getElementById(id).value) * 1048576;
    const postExpiryVal = document.getElementById('zcSetPostExpiry').value;

    const updates = {
      profile_image_limit_bytes: Math.round(mb('zcSetProfileImg')),
      chat_image_limit_bytes: Math.round(mb('zcSetChatImg')),
      chat_video_limit_bytes: Math.round(mb('zcSetVideo')),
      video_max_duration_seconds: parseInt(document.getElementById('zcSetVideoDuration').value, 10),
      post_expiry_days: postExpiryVal ? parseInt(postExpiryVal, 10) : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await sb.from('zc_settings').update(updates).eq('id', 1);
    noteEl.textContent = error ? friendlyError(error) : 'Saved. New limits apply immediately.';
    if (!error) Object.assign(zcSettings, updates);
  });
}

async function loadModeration() {
  await Promise.all([renderStats(), renderStorageUsage(), renderSettingsForm(), renderReports()]);
}

async function renderStats() {
  const wrap = document.getElementById('zcStatsGrid');
  const { data, error } = await sb.rpc('zc_admin_stats');
  if (error || !data || !data.length) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  const s = data[0];
  const cards = [
    ['registered_users', 'Registered'], ['discoverable_users', 'Discoverable'], ['anonymous_users', 'Anonymous'],
    ['active_conversations', 'Active Chats'], ['active_posts', 'Active Posts'], ['active_stories', 'Active Stories'],
    ['open_reports', 'Open Reports'],
  ];
  wrap.innerHTML = cards.map(([key, label]) =>
    `<div class="zc-stat-card"><div class="zc-stat-card__num">${s[key]}</div><div class="zc-stat-card__label">${label}</div></div>`
  ).join('');
}

async function renderStorageUsage() {
  const wrap = document.getElementById('zcStorageBars');
  const { data, error } = await sb.rpc('zc_storage_usage');
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }

  const TOTAL_BYTES = 1073741824; // 1 GB, free-tier plan
  const totalUsed = (data || []).reduce((sum, b) => sum + Number(b.total_bytes), 0);
  const overallPct = (totalUsed / TOTAL_BYTES) * 100;
  const overallClass = overallPct > 90 ? 'critical' : overallPct > 75 ? 'warn' : overallPct > 60 ? 'warn' : '';

  const overall = `
    <div class="zc-storage-bar-wrap">
      <div class="zc-storage-bar-label"><strong>Total (${overallPct.toFixed(1)}% of 1 GB)</strong><span>${(totalUsed / 1048576).toFixed(1)} MB</span></div>
      <div class="zc-storage-bar"><div class="zc-storage-bar__fill ${overallClass}" style="width:${Math.min(overallPct, 100)}%;"></div></div>
    </div>`;

  const perBucket = (data || []).map(b => {
    const pct = (Number(b.total_bytes) / TOTAL_BYTES) * 100;
    return `
      <div class="zc-storage-bar-wrap">
        <div class="zc-storage-bar-label"><span>${escapeHtml(b.bucket_id)}</span><span>${(Number(b.total_bytes) / 1048576).toFixed(1)} MB (${b.file_count} files)</span></div>
        <div class="zc-storage-bar"><div class="zc-storage-bar__fill" style="width:${Math.min(pct, 100)}%;"></div></div>
      </div>`;
  }).join('');

  wrap.innerHTML = overall + perBucket;
}

function renderSettingsForm() {
  document.getElementById('zcSetProfileImg').value = (zcSettings.profile_image_limit_bytes / 1048576).toFixed(1);
  document.getElementById('zcSetChatImg').value = (zcSettings.chat_image_limit_bytes / 1048576).toFixed(1);
  document.getElementById('zcSetVideo').value = (zcSettings.chat_video_limit_bytes / 1048576).toFixed(1);
  document.getElementById('zcSetVideoDuration').value = zcSettings.video_max_duration_seconds;
  document.getElementById('zcSetPostExpiry').value = zcSettings.post_expiry_days || '';
}

async function renderReports() {
  const wrap = document.getElementById('zcReportsList');
  const { data: reports, error } = await sb.from('zc_reports')
    .select('*, reporter:profiles!zc_reports_reporter_id_fkey(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  if (!reports || !reports.length) { wrap.innerHTML = '<p class="zc-empty">No open reports.</p>'; return; }

  wrap.innerHTML = reports.map(r => `
    <div class="zc-report-item">
      <div class="zc-report-item__meta">${escapeHtml(r.target_type)} · reported by ${escapeHtml(r.reporter.name)} · ${new Date(r.created_at).toLocaleDateString()}</div>
      <div><strong>Reason:</strong> ${escapeHtml(r.reason)}</div>
      <div class="zc-report-actions">
        ${r.target_type === 'message' ? `<button class="btn btn--ghost zc-btn-sm zc-view-content" data-id="${r.id}">View message</button>` : ''}
        <button class="btn btn--ghost zc-btn-sm zc-resolve" data-id="${r.id}" data-status="dismissed">Dismiss</button>
        <button class="btn btn--primary zc-btn-sm zc-resolve" data-id="${r.id}" data-status="reviewed">Mark Reviewed</button>
      </div>
    </div>`).join('');

  wrap.querySelectorAll('.zc-view-content').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { data, error } = await sb.rpc('zc_get_reported_message', { report_id: btn.dataset.id });
      if (error || !data || !data.length) { alert('Could not load message.'); return; }
      alert('Message content:\n\n' + (data[0].content || '[attachment only]'));
    });
  });

  wrap.querySelectorAll('.zc-resolve').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await sb.from('zc_reports').update({
        status: btn.dataset.status, reviewed_by: currentUser.id, reviewed_at: new Date().toISOString(),
      }).eq('id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      renderReports();
      renderStats();
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
