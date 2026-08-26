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
let zcSettings = { chat_image_limit_bytes: 10485760, chat_video_limit_bytes: 20971520, video_max_duration_seconds: 30, chat_expiry_days: 7 };
let zcActiveThreadFriendId = null;
let zcActiveThreadFriendName = null;

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

  document.getElementById('zcApp').style.display = 'block';
  document.getElementById('zcComposerAvatar').textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'S';
  renderPrivacyPanel();
  renderAnonBanner();
  wireTabs();
  wireForms();
  wireChat();
  wireStories();
  wireFeed();
  wireModeration();
  wireFollowSubtabs();
  loadFeed();
  loadStories();
  loadFollowing();
  loadFollowers();
  subscribeToMessages();
}

function renderAnonBanner() {
  document.getElementById('zcAnonBanner').style.display = currentZcProfile.discoverable ? 'none' : 'block';
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
    if (btn.dataset.panel === 'profile') { loadFollowing(); loadFollowers(); }
  });

  // Create button: jump to Home and put focus straight into the composer
  document.getElementById('zcCreateBtn').addEventListener('click', () => {
    switchToPanel('feed', document.querySelector('.zc-nav-btn[data-panel="feed"]'));
    loadFeed(); loadStories();
    document.getElementById('zcPostContent').focus();
  });

  // Staff Dashboard is reached from Profile, not the bottom nav directly
  document.getElementById('zcModerationTab').addEventListener('click', () => {
    document.querySelectorAll('.zc-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-moderation').classList.add('active');
    loadModeration();
  });
  document.getElementById('zcBackFromModeration').addEventListener('click', () => {
    switchToPanel('profile', document.querySelector('.zc-nav-btn[data-panel="profile"]'));
  });
}

function switchToPanel(panelName, navBtn) {
  document.querySelectorAll('.zc-nav-btn').forEach(b => b.classList.remove('active'));
  if (navBtn) navBtn.classList.add('active');
  document.querySelectorAll('.zc-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + panelName).classList.add('active');
}

// ---------------------------------------------------------------------
// FIND STUDENTS
// ---------------------------------------------------------------------
function wireForms() {
  document.getElementById('zcSearchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const noteEl = document.getElementById('zcSearchNote');
    if (!currentZcProfile.discoverable) {
      noteEl.textContent = 'Turn on "Visible on Zati Chani" in Privacy to search for other students.';
      return;
    }
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

  document.getElementById('zcDiscoverableToggle').addEventListener('change', (e) => savePrivacyToggle('discoverable', e.target.checked));
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
  if (field === 'discoverable') renderAnonBanner();
}

function renderPrivacyPanel() {
  document.getElementById('zcDiscoverableToggle').checked = !!currentZcProfile.discoverable;
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
  const { data: existing } = await sb.from('zc_follows')
    .select('followed_id')
    .eq('follower_id', currentUser.id)
    .in('followed_id', ids);
  const followingIds = new Set((existing || []).map(f => f.followed_id));

  wrap.innerHTML = students.map(s => {
    const isFollowing = followingIds.has(s.user_id);
    return `
      <div class="zc-student-card">
        <div class="zc-student-card__info">
          <span class="zc-student-card__name">${escapeHtml(s.profiles.name)}</span>
          <span class="zc-student-card__meta">${escapeHtml([s.programme, s.department, s.year_of_study ? 'Year ' + s.year_of_study : null].filter(Boolean).join(' · '))}</span>
        </div>
        <div class="zc-student-card__actions">
          <button class="btn btn--ghost zc-message-btn" data-id="${s.user_id}" data-name="${escapeHtml(s.profiles.name)}">Message</button>
          <button class="btn ${isFollowing ? 'btn--ghost is-following' : 'btn--primary'} zc-follow-btn ${isFollowing ? 'is-following' : ''}" data-id="${s.user_id}" data-following="${isFollowing}"><span>${isFollowing ? 'Following' : 'Follow'}</span></button>
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
  }
}

// ---------------------------------------------------------------------
// FOLLOWING & FOLLOWERS — one-way, no approval needed (Twitter-style,
// not Facebook-style friend requests)
// ---------------------------------------------------------------------
function wireFollowSubtabs() {
  document.querySelectorAll('.zc-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zc-subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('zcFollowingList').style.display = btn.dataset.sub === 'following' ? 'block' : 'none';
      document.getElementById('zcFollowersList').style.display = btn.dataset.sub === 'followers' ? 'block' : 'none';
    });
  });
}

async function loadFollowing() {
  const wrap = document.getElementById('zcFollowingList');
  const { data, error } = await sb.from('zc_follows')
    .select('followed_id, followed:profiles!zc_follows_followed_id_fkey(id,name)')
    .eq('follower_id', currentUser.id);
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  if (!data || !data.length) { wrap.innerHTML = '<p class="zc-empty">You\'re not following anyone yet — try Find Students.</p>'; return; }

  wrap.innerHTML = data.map(f => `
    <div class="zc-student-card">
      <div class="zc-student-card__info"><span class="zc-student-card__name">${escapeHtml(f.followed ? f.followed.name : 'Student')}</span></div>
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
  if (!data || !data.length) { wrap.innerHTML = '<p class="zc-empty">No followers yet.</p>'; return; }

  wrap.innerHTML = data.map(f => `
    <div class="zc-student-card">
      <div class="zc-student-card__info"><span class="zc-student-card__name">${escapeHtml(f.follower ? f.follower.name : 'Student')}</span></div>
    </div>`).join('');
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
    .select('sender_id, recipient_id, content, attachment_type, created_at, sender:profiles!zc_messages_sender_id_fkey(id,name), recipient:profiles!zc_messages_recipient_id_fkey(id,name)')
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
    seen.set(other.id, { id: other.id, name: other.name, content: m.content, attachment_type: m.attachment_type });
  });

  wrap.innerHTML = [...seen.values()].map(f => {
    const preview = f.content ? f.content : (f.attachment_type === 'video' ? '📹 Video' : (f.attachment_type ? '📷 Photo' : 'Say hello!'));
    return `
      <div class="zc-convo-item" data-id="${f.id}" data-name="${escapeHtml(f.name)}">
        <div class="zc-convo-avatar">${escapeHtml(f.name.charAt(0).toUpperCase())}</div>
        <div>
          <div class="zc-student-card__name">${escapeHtml(f.name)}</div>
          <div class="zc-convo-preview">${escapeHtml(preview)}</div>
        </div>
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
  document.getElementById('zcConvoListView').style.display = 'none';
  document.getElementById('zcThreadView').classList.add('active');
  await renderThread();
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

  const bubbles = await Promise.all(messages.map(async (m) => {
    const mine = m.sender_id === currentUser.id;
    let mediaHtml = '';
    if (m.attachment_url) {
      const { data: signed } = await sb.storage.from('zc-chat-media').createSignedUrl(m.attachment_url, 3600);
      const url = signed ? signed.signedUrl : '';
      mediaHtml = m.attachment_type === 'video'
        ? `<video src="${escapeHtml(url)}" controls></video>`
        : `<img src="${escapeHtml(url)}" alt="attachment" />`;
    }
    const time = new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const reportLink = mine ? '' : `<div class="zc-bubble-time" style="cursor:pointer; text-decoration:underline;" onclick="openReportPrompt('message','${m.id}')">Report</div>`;
    return `<div class="zc-bubble ${mine ? 'mine' : 'theirs'}">
      ${m.content ? escapeHtml(m.content) : ''}
      ${mediaHtml}
      <div class="zc-bubble-time">${escapeHtml(time)}</div>
      ${reportLink}
    </div>`;
  }));

  body.innerHTML = bubbles.join('');
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
  document.getElementById('zcStoryReportBtn').addEventListener('click', () => {
    const group = zcStoryGroups[zcViewerGroupIdx];
    const story = group && group.stories[zcViewerStoryIdx];
    if (story) openReportPrompt('story', story.id);
  });

  document.getElementById('zcWriteTextStoryBtn').addEventListener('click', () => {
    document.getElementById('zcTextStoryForm').style.display = 'block';
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
      <div class="zc-story-ring" data-group="${zcStoryGroups.indexOf(g)}">
        <div class="zc-story-ring__circle">${escapeHtml(g.author_name.charAt(0).toUpperCase())}</div>
        <span>${escapeHtml(g.author_name)}</span>
      </div>`).join('');

  rail.innerHTML = addRing + otherRings;

  document.getElementById('zcAddStoryRing').addEventListener('click', () => {
    const own = zcStoryGroups.find(g => g.author_id === currentUser.id);
    if (own && own.stories.length) { openStoryViewer(zcStoryGroups.indexOf(own), 0); }
    else { document.getElementById('zcStoryFileInput').click(); }
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
const REACTIONS = { like: '👍', laugh: '😂', love: '❤️', wow: '😮', sad: '😢' };
let zcPendingPostFile = null;

function wireFeed() {
  document.getElementById('zcPostFileInput').addEventListener('change', (e) => {
    zcPendingPostFile = e.target.files[0] || null;
    document.getElementById('zcPostNote').textContent = zcPendingPostFile ? `Attached: ${zcPendingPostFile.name}` : '';
  });

  document.getElementById('zcPostSubmit').addEventListener('click', async () => {
    const noteEl = document.getElementById('zcPostNote');
    const content = document.getElementById('zcPostContent').value.trim();
    const isAnonymous = document.getElementById('zcPostAnonymous').checked;
    if (!content) { noteEl.textContent = 'Write something first.'; return; }

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
      author_id: currentUser.id, content, media_url, media_type, is_anonymous: isAnonymous,
    });
    noteEl.textContent = error ? friendlyError(error) : '';
    if (!error) {
      document.getElementById('zcPostContent').value = '';
      document.getElementById('zcPostAnonymous').checked = false;
      document.getElementById('zcPostFileInput').value = '';
      zcPendingPostFile = null;
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
    <div class="zc-trending-item"><span>${escapeHtml(p.content.slice(0, 60))}${p.content.length > 60 ? '...' : ''}</span><span>${p.reaction_count} 🔥</span></div>
  `).join('');
}

async function renderFeedList() {
  const wrap = document.getElementById('zcFeedList');
  const { data: posts, error } = await sb.from('zc_posts')
    .select('*, author:profiles!zc_posts_author_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  if (!posts || !posts.length) { wrap.innerHTML = '<p class="zc-empty">No posts yet — be the first to share something.</p>'; return; }

  const { data: myReactions } = await sb.from('zc_reactions').select('post_id, reaction_type').eq('user_id', currentUser.id);
  const { data: allReactions } = await sb.from('zc_reactions').select('post_id, reaction_type');

  const cards = await Promise.all(posts.map(async (p) => {
    let mediaHtml = '';
    if (p.media_url) {
      const { data: signed } = await sb.storage.from('zc-post-media').createSignedUrl(p.media_url, 3600);
      const url = signed ? signed.signedUrl : '';
      mediaHtml = `<div class="zc-post__media">${p.media_type === 'video' ? `<video src="${escapeHtml(url)}" controls></video>` : `<img src="${escapeHtml(url)}" alt="post" />`}</div>`;
    }

    const authorName = p.is_anonymous ? 'Anonymous Student' : p.author.name;
    const time = new Date(p.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const myReaction = (myReactions || []).find(r => r.post_id === p.id);

    const reactionBtns = Object.entries(REACTIONS).map(([type, emoji]) => {
      const count = (allReactions || []).filter(r => r.post_id === p.id && r.reaction_type === type).length;
      const mine = myReaction && myReaction.reaction_type === type;
      return `<button class="zc-react-btn ${mine ? 'mine' : ''}" data-post="${p.id}" data-type="${type}">${emoji}${count ? ' ' + count : ''}</button>`;
    }).join('');

    return `
      <div class="zc-post">
        <div class="zc-post__author">${escapeHtml(authorName)}</div>
        <div class="zc-post__time">${escapeHtml(time)}</div>
        <div class="zc-post__content">${escapeHtml(p.content)}</div>
        ${mediaHtml}
        <div class="zc-post__reactions">${reactionBtns}</div>
        <button class="btn btn--ghost zc-report-btn" data-type="post" data-id="${p.id}" style="margin-top:8px; font-size:11px; padding:2px 8px;">Report</button>
      </div>`;
  }));

  wrap.innerHTML = cards.join('');

  wrap.querySelectorAll('.zc-report-btn').forEach(btn => {
    btn.addEventListener('click', () => openReportPrompt(btn.dataset.type, btn.dataset.id));
  });

  wrap.querySelectorAll('.zc-react-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleReaction(btn.dataset.post, btn.dataset.type));
  });
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
  }
  renderFeedList();
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
      <div style="display:flex; gap:6px; margin-top:8px;">
        ${r.target_type === 'message' ? `<button class="btn btn--ghost zc-view-content" data-id="${r.id}" style="font-size:11px;">View message</button>` : ''}
        <button class="btn btn--ghost zc-resolve" data-id="${r.id}" data-status="dismissed" style="font-size:11px;">Dismiss</button>
        <button class="btn btn--primary zc-resolve" data-id="${r.id}" data-status="reviewed" style="font-size:11px;">Mark Reviewed</button>
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
