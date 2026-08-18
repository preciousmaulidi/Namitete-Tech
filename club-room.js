// ==========================================================================
// CLUB HOME — dedicated dashboard for an approved club, opened from a club
// card in the Clubs view. Mirrors the main site's own Posts / Events /
// Updates / Downloads / Suggestion Box / Admin Panel pattern, and adds two
// club-only features: Tikambirane Room (a WhatsApp-style text room) and
// Creative Room (admin media + student writing).
//
// Loaded after script.js — reuses its globals: sb, currentUser, escapeHtml,
// canManageContent, ICON_EDIT/ICON_DELETE/ICON_LIKE, emptyState,
// commentThreadHtml/wireCommentThread/COMMENT_CONFIGS, switchView,
// isClubManagerOf, toggleClubManagerStatus, removeClubMember, allClubs,
// myClubIds, renderClubGrid.
// ==========================================================================

let currentClubId = null;
let currentClub = null;
let activeClubTab = 'home';
let clubAdminSubTab = 'content';
let creativeFilter = 'all';

let chatMessages = [];
let chatReplyToId = null;
let chatEditingId = null;
let chatCtxTargetId = null;
let chatAutoScroll = true;

// Reuse the exact like/comment/reply system the main Posts tab uses —
// just point it at the club_admin_posts tables instead.
COMMENT_CONFIGS.clubadminposts = {
  parentField: 'admin_post_id',
  likesTable: 'club_admin_post_likes',
  commentsTable: 'club_admin_post_comments',
  commentLikesTable: 'club_admin_post_comment_likes',
  rerender: () => { renderClubPosts(); renderClubHomeTab(); }
};

function clubIsMemberOrManager(clubId) {
  return canManageContent(currentUser) || myClubIds.has(clubId) || isClubManagerOf(clubId);
}

// --------------------------------------------------------------------------
// Realtime — called from script.js's single app-wide channel whenever a
// club_* table changes anywhere on the site. Every open browser receives
// every event (same as any other row they're already allowed to read), but
// each one quietly ignores anything that isn't the club room / tab it's
// currently looking at.
// --------------------------------------------------------------------------
function handleClubTableRealtime(table, payload) {
  const clubId = payload.new?.club_id ?? payload.old?.club_id;
  if (!currentClubId || clubId !== currentClubId) return;

  if (table === 'club_room_messages') {
    if (activeClubTab === 'room') renderChatMessages(true);
    return;
  }
  if (table === 'club_posts') {
    if (activeClubTab === 'updates') renderClubUpdates();
    if (activeClubTab === 'home') renderClubHomeTab();
    return;
  }
  if (table === 'club_events') {
    if (activeClubTab === 'events') renderClubEvents();
    return;
  }
  if (table === 'club_admin_posts') {
    if (activeClubTab === 'posts') renderClubPosts();
    if (activeClubTab === 'home') renderClubHomeTab();
    return;
  }
  if (table === 'club_downloads') {
    if (activeClubTab === 'downloads') renderClubDownloads();
    return;
  }
  if (table === 'club_creative') {
    if (activeClubTab === 'creative') renderCreativeFeed();
    if (activeClubTab === 'admin' && clubAdminSubTab === 'creative' && isClubManagerOf(currentClubId)) renderClubCreativePending();
    return;
  }
  if (table === 'club_suggestions') {
    if (activeClubTab === 'suggestions') renderClubSuggestions();
    if (activeClubTab === 'admin' && clubAdminSubTab === 'suggestions' && isClubManagerOf(currentClubId)) renderClubAdminSuggestions();
    return;
  }
}

function handleClubMembersRealtime() {
  if (currentClubId && activeClubTab === 'admin' && clubAdminSubTab === 'members' && isClubManagerOf(currentClubId)) {
    renderClubAdminMembers(currentClubId);
  }
}

// clubs / club_managers changes are keyed by id, not club_id — checked
// against currentClubId directly. Refreshes the open club room's header
// and admin-tab visibility live if it's their own club that changed.
function handleClubRecordRealtime(table, payload) {
  const rowId = table === 'clubs' ? (payload.new?.id ?? payload.old?.id) : (payload.new?.club_id ?? payload.old?.club_id);
  if (!currentClubId || rowId !== currentClubId) return;

  if (table === 'clubs' && payload.new) {
    currentClub = payload.new;
    renderClubHomeHeader();
    if (activeClubTab === 'admin' && clubAdminSubTab === 'profile') fillClubProfileForm();
  }
  document.getElementById('clubHomeAdminTab').style.display = isClubManagerOf(currentClubId) ? 'block' : 'none';
}

// --------------------------------------------------------------------------
// Entry / exit
// --------------------------------------------------------------------------
async function openClubHome(clubId) {
  // Only members and managers can step inside — everyone else just sees
  // the Join button on the club card, same as a WhatsApp group invite.
  if (!clubIsMemberOrManager(clubId)) {
    alert('Join this club first to open it.');
    return;
  }
  currentClubId = clubId;
  const { data: club, error } = await sb.from('clubs').select('*').eq('id', clubId).single();
  if (error || !club) { alert('Could not open this club.'); return; }
  currentClub = club;

  switchView('club-home');
  renderClubHomeHeader();
  document.getElementById('clubHomeAdminTab').style.display = isClubManagerOf(clubId) ? 'block' : 'none';
  switchClubTab('home');
}

document.getElementById('clubHomeBackBtn').addEventListener('click', () => {
  currentClubId = null;
  currentClub = null;
  switchView('clubs');
});

function renderClubHomeHeader() {
  // Reaching this screen already means you're a member or manager (see the
  // guard in openClubHome), so there's never a Join button to show here —
  // it belongs on the club card, before you're let in.
  const el = document.getElementById('clubHomeHeader');
  const c = currentClub;
  el.innerHTML = `
    ${c.photo_url ? `<img src="${escapeHtml(c.photo_url)}" alt="" class="club-home__photo" />` : ''}
    <div class="club-home__meta">
      <span class="club-home__category">${escapeHtml(c.category)}</span>
      <h1>${escapeHtml(c.title)}</h1>
      <p>${escapeHtml(c.description)}</p>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Tab switching
// --------------------------------------------------------------------------
document.getElementById('clubHomeNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.club-home-tab');
  if (btn) switchClubTab(btn.dataset.ctab);
});

const CLUB_TAB_LOADERS = {
  home: renderClubHomeTab,
  posts: renderClubPosts,
  events: renderClubEvents,
  updates: renderClubUpdates,
  downloads: renderClubDownloads,
  room: renderChatMessages,
  creative: renderCreativeFeed,
  suggestions: renderClubSuggestions,
  admin: renderClubAdminPanel
};

function switchClubTab(tab) {
  activeClubTab = tab;
  document.querySelectorAll('.club-home-tab').forEach(t => t.classList.toggle('active', t.dataset.ctab === tab));
  document.querySelectorAll('.club-home-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('clubpanel-' + tab);
  if (panel) panel.style.display = 'block';

  const loader = CLUB_TAB_LOADERS[tab];
  if (loader) loader(currentClubId);
}

// --------------------------------------------------------------------------
// HOME TAB — pinned posts + latest updates
// --------------------------------------------------------------------------
async function renderClubHomeTab() {
  if (!currentClubId) return;
  const pinnedEl = document.getElementById('clubHomePinned');
  const feedEl = document.getElementById('clubHomeFeed');
  const headingEl = document.getElementById('clubHomeFeedHeading');

  const [{ data: pinned }, { data: updates }] = await Promise.all([
    sb.from('club_admin_posts').select('*').eq('club_id', currentClubId).eq('pinned', true).order('created_at', { ascending: false }),
    sb.from('club_posts').select('*').eq('club_id', currentClubId).order('created_at', { ascending: false }).limit(5)
  ]);

  pinnedEl.innerHTML = (pinned && pinned.length)
    ? `<div class="pinned-head"><h2>Featured</h2><div class="pinned-badge">Pinned</div></div>` + pinned.map(clubAdminPostCardHtml).join('')
    : '';
  wireClubAdminPostCards(pinnedEl);

  if (updates && updates.length) {
    headingEl.style.display = 'block';
    feedEl.innerHTML = updates.map(u => `
      <div class="post-card" style="margin-top:10px;">
        ${u.photo_url ? `<img src="${escapeHtml(u.photo_url)}" alt="" class="post-card__photo" />` : ''}
        <span class="post-card__date">${new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <h3>${escapeHtml(u.title)}</h3>
        <p>${escapeHtml(u.body)}</p>
      </div>
    `).join('');
  } else {
    headingEl.style.display = 'none';
    feedEl.innerHTML = (!pinned || !pinned.length) ? emptyState('Nothing posted in this club yet.', 'clubs') : '';
  }
}

// --------------------------------------------------------------------------
// POSTS TAB — pinnable announcements, with likes + comments
// --------------------------------------------------------------------------
function clubAdminPostCardHtml(p) {
  return `
    <div class="post-card" style="margin-top:10px; font-family:'${p.font_family || 'Inter'}', sans-serif; background:${p.bg_color || '#FFFFFF'};" data-admin-post-id="${p.id}">
      ${p.pinned ? '<span class="pinned-badge" style="margin-bottom:8px;">Pinned</span>' : ''}
      ${p.photo_url ? `<img src="${escapeHtml(p.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.body)}</p>
      <div class="post-card__actions">
        <button class="like-btn club-admin-post-like-btn" data-id="${p.id}">${ICON_LIKE} <span class="ca-like-count">0</span></button>
        <span class="ca-comment-count" style="font-size:0.85rem; color:var(--text-muted);"></span>
      </div>
      <div class="comment-list ca-comment-list"></div>
      <form class="comment-form ca-comment-form" data-id="${p.id}">
        <input type="text" placeholder="Write a comment..." required />
        <button type="submit">Post</button>
      </form>
      ${isClubManagerOf(currentClubId) ? `
      <div class="item-admin-controls">
        <button class="ca-edit-btn" data-id="${p.id}">${ICON_EDIT} Edit</button>
        <button class="ca-delete-btn" data-id="${p.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `;
}

async function wireClubAdminPostCards(container) {
  const cards = [...container.querySelectorAll('[data-admin-post-id]')];
  if (!cards.length) return;
  const ids = cards.map(c => c.dataset.adminPostId);

  const [{ data: likes }, { data: comments }] = await Promise.all([
    sb.from('club_admin_post_likes').select('*').in('admin_post_id', ids),
    sb.from('club_admin_post_comments').select('*').in('admin_post_id', ids).order('created_at', { ascending: true })
  ]);
  const commentIds = (comments || []).map(c => c.id);
  let commentLikes = [];
  if (commentIds.length) {
    const { data: clRows } = await sb.from('club_admin_post_comment_likes').select('*').in('comment_id', commentIds);
    commentLikes = clRows || [];
  }
  const commentLikeCounts = {};
  commentLikes.forEach(cl => { commentLikeCounts[cl.comment_id] = (commentLikeCounts[cl.comment_id] || 0) + 1; });
  const myCommentLikeIds = new Set(currentUser ? commentLikes.filter(cl => cl.user_id === currentUser.id).map(cl => cl.comment_id) : []);

  cards.forEach(card => {
    const id = card.dataset.adminPostId;
    const postLikes = (likes || []).filter(l => l.admin_post_id === id);
    const postComments = (comments || []).filter(c => c.admin_post_id === id);
    const liked = currentUser && postLikes.some(l => l.user_id === currentUser.id);

    card.querySelector('.club-admin-post-like-btn').classList.toggle('liked', liked);
    card.querySelector('.ca-like-count').textContent = postLikes.length;
    card.querySelector('.ca-comment-count').textContent = `${postComments.length} comment${postComments.length === 1 ? '' : 's'}`;
    card.querySelector('.ca-comment-list').innerHTML = commentThreadHtml('clubadminposts', id, comments || [], commentLikeCounts, myCommentLikeIds);
    wireCommentThread(card);
  });

  container.querySelectorAll('.club-admin-post-like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleClubAdminPostLike(btn.dataset.id));
  });
  container.querySelectorAll('.ca-comment-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      addGenericComment('clubadminposts', form.dataset.id, input.value.trim());
      input.value = '';
    });
  });
  container.querySelectorAll('.ca-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editClubAdminPost(btn.dataset.id));
  });
  container.querySelectorAll('.ca-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteClubAdminPost(btn.dataset.id));
  });
}

async function toggleClubAdminPostLike(id) {
  if (!currentUser) return;
  const { data: existing } = await sb.from('club_admin_post_likes').select('*').eq('admin_post_id', id).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await sb.from('club_admin_post_likes').delete().eq('admin_post_id', id).eq('user_id', currentUser.id);
  } else {
    await sb.from('club_admin_post_likes').insert({ admin_post_id: id, user_id: currentUser.id });
  }
  renderClubPosts();
  renderClubHomeTab();
}

async function renderClubPosts() {
  if (!currentClubId) return;
  const container = document.getElementById('clubPostsList');
  const { data: posts, error } = await sb.from('club_admin_posts').select('*').eq('club_id', currentClubId).order('pinned', { ascending: false }).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  container.innerHTML = posts.length ? posts.map(clubAdminPostCardHtml).join('') : emptyState('No posts in this club yet.', 'adminposts');
  wireClubAdminPostCards(container);
}

function editClubAdminPost(id) {
  switchClubTab('admin');
  clubAdminSubTab = 'content';
  wireClubAdminSubTabs();
  sb.from('club_admin_posts').select('*').eq('id', id).single().then(({ data: p }) => {
    if (!p) return;
    document.getElementById('clubAdminPostEditingId').value = p.id;
    document.getElementById('clubAdminPostTitle').value = p.title;
    document.getElementById('clubAdminPostBody').value = p.body;
    document.getElementById('clubAdminPostPinned').checked = !!p.pinned;
    document.getElementById('clubAdminPostSubmitBtn').textContent = 'Save changes';
    document.getElementById('cancelClubAdminPostEdit').style.display = 'inline-block';
  });
}

async function deleteClubAdminPost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  await sb.from('club_admin_posts').delete().eq('id', id);
  renderClubPosts();
  renderClubHomeTab();
}

document.getElementById('cancelClubAdminPostEdit').addEventListener('click', resetClubAdminPostForm);
function resetClubAdminPostForm() {
  document.getElementById('clubAdminPostForm').reset();
  document.getElementById('clubAdminPostEditingId').value = '';
  document.getElementById('clubAdminPostSubmitBtn').textContent = 'Post';
  document.getElementById('cancelClubAdminPostEdit').style.display = 'none';
}

document.getElementById('clubAdminPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentClubId || !currentUser) return;
  const editingId = document.getElementById('clubAdminPostEditingId').value;
  const noteEl = document.getElementById('clubAdminPostNote');
  const updates = {
    title: document.getElementById('clubAdminPostTitle').value.trim(),
    body: document.getElementById('clubAdminPostBody').value.trim(),
    pinned: document.getElementById('clubAdminPostPinned').checked
  };
  if (!editingId) { updates.club_id = currentClubId; updates.author_id = currentUser.id; }

  const fileInput = document.getElementById('clubAdminPostPhoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `club-admin-posts/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }

  const { error } = editingId
    ? await sb.from('club_admin_posts').update(updates).eq('id', editingId)
    : await sb.from('club_admin_posts').insert(updates);
  if (error) { noteEl.textContent = error.message; return; }

  resetClubAdminPostForm();
  noteEl.textContent = 'Saved.';
  setTimeout(() => noteEl.textContent = '', 2500);
  renderClubPosts();
  renderClubHomeTab();
});

// --------------------------------------------------------------------------
// EVENTS TAB
// --------------------------------------------------------------------------
async function renderClubEvents() {
  if (!currentClubId) return;
  const container = document.getElementById('clubEventsList');
  const { data: events, error } = await sb.from('club_events').select('*').eq('club_id', currentClubId).order('event_on', { ascending: true, nullsFirst: false });
  if (error) { console.error(error); return; }

  container.innerHTML = events.length ? events.map(ev => `
    <div class="post-card" style="font-family:'${ev.font_family || 'Inter'}', sans-serif; background:${ev.bg_color || '#FFFFFF'};">
      ${ev.photo_url ? `<img src="${escapeHtml(ev.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${ev.event_on ? new Date(ev.event_on).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date TBC'}</span>
      <h3>${escapeHtml(ev.title)}</h3>
      <p>${escapeHtml(ev.body)}</p>
      ${ev.location ? `<p style="font-size:0.85rem; color:var(--text-muted);">${escapeHtml(ev.location)}</p>` : ''}
      ${isClubManagerOf(currentClubId) ? `<div class="item-admin-controls"><button class="club-event-delete-btn" data-id="${ev.id}">${ICON_DELETE} Delete</button></div>` : ''}
    </div>
  `).join('') : emptyState('No events scheduled yet.', 'events');

  container.querySelectorAll('.club-event-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return;
      await sb.from('club_events').delete().eq('id', btn.dataset.id);
      renderClubEvents();
    });
  });
}

document.getElementById('clubEventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentClubId || !currentUser) return;
  const noteEl = document.getElementById('clubEventNote');
  const updates = {
    club_id: currentClubId,
    created_by: currentUser.id,
    title: document.getElementById('clubEventTitle').value.trim(),
    body: document.getElementById('clubEventBody').value.trim(),
    location: document.getElementById('clubEventLocation').value.trim(),
    event_on: document.getElementById('clubEventDate').value ? new Date(document.getElementById('clubEventDate').value).toISOString() : null
  };
  const fileInput = document.getElementById('clubEventPhoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `club-events/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }
  const { error } = await sb.from('club_events').insert(updates);
  if (error) { noteEl.textContent = error.message; return; }
  e.target.reset();
  noteEl.textContent = 'Event added.';
  setTimeout(() => noteEl.textContent = '', 2500);
  renderClubEvents();
});

// --------------------------------------------------------------------------
// UPDATES TAB — simple chronological feed (club_posts)
// --------------------------------------------------------------------------
async function renderClubUpdates() {
  if (!currentClubId) return;
  const container = document.getElementById('clubUpdatesList');
  const { data: updates, error } = await sb.from('club_posts').select('*').eq('club_id', currentClubId).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = updates.length ? updates.map(u => `
    <div class="post-card">
      ${u.photo_url ? `<img src="${escapeHtml(u.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      <h3>${escapeHtml(u.title)}</h3>
      <p>${escapeHtml(u.body)}</p>
      ${isClubManagerOf(currentClubId) ? `<div class="item-admin-controls"><button class="club-update-delete-btn" data-id="${u.id}">${ICON_DELETE} Delete</button></div>` : ''}
    </div>
  `).join('') : emptyState('No updates posted yet.', 'updates');

  container.querySelectorAll('.club-update-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this update?')) return;
      await sb.from('club_posts').delete().eq('id', btn.dataset.id);
      renderClubUpdates();
    });
  });
}

document.getElementById('clubUpdateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentClubId || !currentUser) return;
  const noteEl = document.getElementById('clubUpdateNote');
  const updates = {
    club_id: currentClubId,
    author_id: currentUser.id,
    title: document.getElementById('clubUpdateTitle').value.trim(),
    body: document.getElementById('clubUpdateBody').value.trim()
  };
  const fileInput = document.getElementById('clubUpdatePhoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `club-posts/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }
  const { error } = await sb.from('club_posts').insert(updates);
  if (error) { noteEl.textContent = error.message; return; }
  e.target.reset();
  noteEl.textContent = 'Posted.';
  setTimeout(() => noteEl.textContent = '', 2500);
  renderClubUpdates();
  renderClubHomeTab();
});

// --------------------------------------------------------------------------
// DOWNLOADS TAB
// --------------------------------------------------------------------------
async function renderClubDownloads() {
  if (!currentClubId) return;
  const container = document.getElementById('clubDownloadsList');
  const { data: downloads, error } = await sb.from('club_downloads').select('*').eq('club_id', currentClubId).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = downloads.length ? downloads.map(d => `
    <div class="download-card">
      <div class="download-card__info">
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.description || '')}</p>
      </div>
      <a class="download-card__action" href="${escapeHtml(d.file_url)}" target="_blank" rel="noopener">Download</a>
      ${isClubManagerOf(currentClubId) ? `<div class="item-admin-controls"><button class="club-download-delete-btn" data-id="${d.id}">${ICON_DELETE} Delete</button></div>` : ''}
    </div>
  `).join('') : emptyState('No downloads shared yet.', 'downloads');

  container.querySelectorAll('.club-download-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this download?')) return;
      await sb.from('club_downloads').delete().eq('id', btn.dataset.id);
      renderClubDownloads();
    });
  });
}

document.getElementById('clubDownloadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentClubId || !currentUser) return;
  const noteEl = document.getElementById('clubDownloadNote');
  const fileInput = document.getElementById('clubDownloadFile');
  const file = fileInput.files && fileInput.files[0];
  if (!file) { noteEl.textContent = 'Choose a file first.'; return; }

  const path = `club-downloads/${Date.now()}-${file.name}`;
  const { error: uploadError } = await sb.storage.from('site-files').upload(path, file);
  if (uploadError) { noteEl.textContent = uploadError.message; return; }
  const { data: urlData } = sb.storage.from('site-files').getPublicUrl(path);

  const { error } = await sb.from('club_downloads').insert({
    club_id: currentClubId,
    created_by: currentUser.id,
    title: document.getElementById('clubDownloadTitle').value.trim(),
    description: document.getElementById('clubDownloadDescription').value.trim(),
    file_url: urlData.publicUrl,
    file_type: file.type
  });
  if (error) { noteEl.textContent = error.message; return; }
  e.target.reset();
  noteEl.textContent = 'Uploaded.';
  setTimeout(() => noteEl.textContent = '', 2500);
  renderClubDownloads();
});

// --------------------------------------------------------------------------
// TIKAMBIRANE ROOM — text-only chat, refresh-based, with reply/edit/delete
// surfaced through a 3-second long press on a message, WhatsApp-style.
// --------------------------------------------------------------------------
async function renderChatMessages(isPoll) {
  if (!currentClubId) return;
  const canParticipate = clubIsMemberOrManager(currentClubId);
  document.getElementById('clubRoomNotice').style.display = canParticipate ? 'none' : 'block';
  document.getElementById('chatRoomWrap').style.display = canParticipate ? 'flex' : 'none';
  if (!canParticipate) return;

  const listEl = document.getElementById('chatMessagesList');
  const nearBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;

  const { data: messages, error } = await sb.from('club_room_messages')
    .select('*').eq('club_id', currentClubId).order('created_at', { ascending: true }).limit(300);
  if (error) { if (!isPoll) console.error(error); return; }

  chatMessages = messages || [];
  const msgMap = {};
  chatMessages.forEach(m => { msgMap[m.id] = m; });

  listEl.innerHTML = chatMessages.length
    ? chatMessages.map(m => chatBubbleHtml(m, msgMap)).join('')
    : '<p class="chat-empty">No messages yet — say something to get the conversation going.</p>';

  wireChatLongPress(listEl);

  if (!isPoll || nearBottom) listEl.scrollTop = listEl.scrollHeight;
}

function chatBubbleHtml(m, msgMap) {
  const own = currentUser && m.user_id === currentUser.id;
  const quoted = m.reply_to_id ? msgMap[m.reply_to_id] : null;
  const quotedHtml = quoted ? `
    <div class="chat-bubble__quote">
      <span>${escapeHtml(quoted.name)}</span>
      <p>${quoted.is_deleted ? 'This message was deleted' : escapeHtml(quoted.text)}</p>
    </div>` : '';
  const bodyText = m.is_deleted ? '<em>This message was deleted</em>' : escapeHtml(m.text).replace(/\n/g, '<br>');
  const time = new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `
    <div class="chat-bubble ${own ? 'chat-bubble--own' : ''} ${m.is_deleted ? 'chat-bubble--deleted' : ''}" data-msg-id="${m.id}">
      ${!own ? `<span class="chat-bubble__name">${escapeHtml(m.name)}</span>` : ''}
      ${quotedHtml}
      <p class="chat-bubble__text">${bodyText}</p>
      <span class="chat-bubble__meta">${(m.edited_at && !m.is_deleted) ? 'Edited &middot; ' : ''}${time}</span>
    </div>
  `;
}

// Long press (or right-click on desktop) opens Reply / Edit / Delete —
// exactly 3 seconds on touch, to feel deliberate rather than accidental.
function wireChatLongPress(container) {
  container.querySelectorAll('.chat-bubble[data-msg-id]').forEach(bubble => {
    if (bubble.classList.contains('chat-bubble--deleted')) return;
    let timer = null;
    let moved = false;
    const start = (e) => {
      moved = false;
      timer = setTimeout(() => { if (!moved) openChatContextMenu(bubble, e); }, 3000);
    };
    const cancel = () => { if (timer) clearTimeout(timer); timer = null; };
    const onMove = () => { moved = true; cancel(); };
    bubble.addEventListener('touchstart', start, { passive: true });
    bubble.addEventListener('touchend', cancel);
    bubble.addEventListener('touchmove', onMove);
    bubble.addEventListener('mousedown', start);
    bubble.addEventListener('mouseup', cancel);
    bubble.addEventListener('mouseleave', cancel);
    bubble.addEventListener('contextmenu', (e) => { e.preventDefault(); openChatContextMenu(bubble, e); });
  });
}

function openChatContextMenu(bubble, evt) {
  const id = bubble.dataset.msgId;
  const msg = chatMessages.find(m => m.id === id);
  if (!msg) return;
  chatCtxTargetId = id;
  const own = currentUser && msg.user_id === currentUser.id;
  const manages = isClubManagerOf(currentClubId);

  const menu = document.getElementById('chatContextMenu');
  document.getElementById('chatCtxEdit').style.display = own ? 'block' : 'none';
  document.getElementById('chatCtxDelete').style.display = (own || manages) ? 'block' : 'none';

  if (navigator.vibrate) navigator.vibrate(15);

  const wrap = document.getElementById('chatRoomWrap').getBoundingClientRect();
  const point = evt.touches && evt.touches[0] ? evt.touches[0] : evt;
  let top = point.clientY - wrap.top;
  let left = point.clientX - wrap.left;
  menu.style.display = 'block';
  const menuRect = menu.getBoundingClientRect();
  if (left + menuRect.width > wrap.width) left = wrap.width - menuRect.width - 8;
  if (top + menuRect.height > wrap.height) top = wrap.height - menuRect.height - 8;
  menu.style.top = Math.max(8, top) + 'px';
  menu.style.left = Math.max(8, left) + 'px';
}

function closeChatContextMenu() {
  document.getElementById('chatContextMenu').style.display = 'none';
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('#chatContextMenu') && !e.target.closest('.chat-bubble')) closeChatContextMenu();
});

document.getElementById('chatCtxReply').addEventListener('click', () => {
  const msg = chatMessages.find(m => m.id === chatCtxTargetId);
  closeChatContextMenu();
  if (!msg) return;
  chatEditingId = null;
  chatReplyToId = msg.id;
  document.getElementById('chatReplyPreviewName').textContent = msg.name;
  document.getElementById('chatReplyPreviewText').textContent = msg.text;
  document.getElementById('chatReplyPreview').style.display = 'flex';
  document.getElementById('chatComposerInput').focus();
});

document.getElementById('chatCtxEdit').addEventListener('click', () => {
  const msg = chatMessages.find(m => m.id === chatCtxTargetId);
  closeChatContextMenu();
  if (!msg) return;
  chatReplyToId = null;
  chatEditingId = msg.id;
  document.getElementById('chatReplyPreviewName').textContent = 'Editing your message';
  document.getElementById('chatReplyPreviewText').textContent = msg.text;
  document.getElementById('chatReplyPreview').style.display = 'flex';
  const input = document.getElementById('chatComposerInput');
  input.value = msg.text;
  input.focus();
});

document.getElementById('chatCtxDelete').addEventListener('click', async () => {
  const id = chatCtxTargetId;
  closeChatContextMenu();
  if (!id || !confirm('Delete this message?')) return;
  await sb.from('club_room_messages').update({ is_deleted: true, text: '' }).eq('id', id);
  renderChatMessages();
});

document.getElementById('chatReplyCancelBtn').addEventListener('click', clearChatCompose);
function clearChatCompose() {
  chatReplyToId = null;
  chatEditingId = null;
  document.getElementById('chatReplyPreview').style.display = 'none';
  document.getElementById('chatComposerInput').value = '';
}

document.getElementById('chatComposerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser || !currentClubId) return;
  const input = document.getElementById('chatComposerInput');
  const text = input.value.trim();
  if (!text) return;

  if (chatEditingId) {
    await sb.from('club_room_messages').update({ text, edited_at: new Date().toISOString() }).eq('id', chatEditingId);
  } else {
    await sb.from('club_room_messages').insert({
      club_id: currentClubId, user_id: currentUser.id, name: currentUser.name,
      text, reply_to_id: chatReplyToId
    });
  }
  clearChatCompose();
  renderChatMessages();
});

// Enter sends, Shift+Enter makes a new line — feels native on both mobile and desktop
document.getElementById('chatComposerInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('chatComposerForm').requestSubmit();
  }
});

// --------------------------------------------------------------------------
// CREATIVE ROOM — admin media (music / link / photo) + reviewed student
// writing (article / poem / blog / Bible verse)
// --------------------------------------------------------------------------
document.getElementById('creativeTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.creative-tab');
  if (!btn) return;
  document.querySelectorAll('.creative-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  creativeFilter = btn.dataset.ctype;
  renderCreativeFeed();
});

document.getElementById('showCreativeSubmitBtn').addEventListener('click', () => {
  const panel = document.getElementById('creativeSubmitPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('cancelCreativeSubmit').addEventListener('click', () => {
  document.getElementById('creativeSubmitForm').reset();
  document.getElementById('creativeSubmitPanel').style.display = 'none';
});

function creativeCardHtml(item) {
  const isOwn = currentUser && item.author_id === currentUser.id;
  const statusHtml = (item.status !== 'approved' && (isOwn || isClubManagerOf(currentClubId)))
    ? `<span class="writing-card__status writing-card__status--${item.status}">${item.status}</span>` : '';

  let bodyHtml = '';
  if (item.kind === 'music') {
    bodyHtml = `${item.media_url ? `<audio controls src="${escapeHtml(item.media_url)}" style="width:100%; margin:10px 0;"></audio>` : ''}`;
  } else if (item.kind === 'link') {
    bodyHtml = `<a href="${escapeHtml(item.link_url)}" target="_blank" rel="noopener" class="download-card__action" style="display:inline-block; margin-top:8px;">Open link</a>`;
  } else if (item.kind === 'photo') {
    bodyHtml = item.media_url ? `<img src="${escapeHtml(item.media_url)}" alt="" class="post-card__photo" />` : '';
  } else {
    bodyHtml = `<div class="writing-card__content">${escapeHtml(item.content || '')}</div>`;
  }

  return `
    <div class="writing-card" data-creative-id="${item.id}">
      <div class="writing-card__top">
        <div>
          <span class="writing-card__type">${escapeHtml(creativeKindLabel(item.kind))}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="writing-author">By ${escapeHtml(item.author_name)} &middot; ${new Date(item.created_at).toLocaleDateString()}</p>
        </div>
        ${statusHtml}
      </div>
      ${item.caption ? `<p class="writing-description">${escapeHtml(item.caption)}</p>` : ''}
      ${bodyHtml}
      ${item.status === 'approved' ? `
      <div class="post-card__actions" style="margin-top:14px;">
        <button class="like-btn creative-like-btn" data-id="${item.id}">${ICON_LIKE} <span class="cr-like-count">0</span></button>
      </div>` : ''}
      ${(isOwn && item.status === 'pending') || isClubManagerOf(currentClubId) ? `
      <div class="item-admin-controls">
        <button class="creative-delete-btn" data-id="${item.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `;
}

function creativeKindLabel(kind) {
  return { music: 'Music', link: 'Link', photo: 'Photo', article: 'Article', poem: 'Poem', blog: 'Blog', bible_verse: 'Bible Verse' }[kind] || kind;
}

async function renderCreativeFeed() {
  if (!currentClubId) return;
  const container = document.getElementById('creativeFeedList');
  const { data: items, error } = await sb.from('club_creative_items').select('*').eq('club_id', currentClubId).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  const writingKinds = ['article', 'poem', 'blog', 'bible_verse'];
  const filtered = (items || []).filter(i => {
    if (creativeFilter === 'all') return true;
    if (creativeFilter === 'media') return i.kind === 'music' || i.kind === 'link';
    if (creativeFilter === 'photo') return i.kind === 'photo';
    if (creativeFilter === 'writing') return writingKinds.includes(i.kind);
    return true;
  });

  container.innerHTML = filtered.length
    ? filtered.map(creativeCardHtml).join('')
    : emptyState('Nothing shared here yet.', 'spotlight');

  const ids = filtered.filter(i => i.status === 'approved').map(i => i.id);
  let likes = [];
  if (ids.length) {
    const { data: likeRows } = await sb.from('club_creative_likes').select('*').in('item_id', ids);
    likes = likeRows || [];
  }
  container.querySelectorAll('[data-creative-id]').forEach(card => {
    const id = card.dataset.creativeId;
    const count = likes.filter(l => l.item_id === id).length;
    const liked = currentUser && likes.some(l => l.item_id === id && l.user_id === currentUser.id);
    const btn = card.querySelector('.creative-like-btn');
    if (btn) { btn.classList.toggle('liked', liked); card.querySelector('.cr-like-count').textContent = count; }
  });

  container.querySelectorAll('.creative-like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleCreativeLike(btn.dataset.id));
  });
  container.querySelectorAll('.creative-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this permanently?')) return;
      await sb.from('club_creative_items').delete().eq('id', btn.dataset.id);
      renderCreativeFeed();
      renderClubCreativePending();
    });
  });
}

async function toggleCreativeLike(itemId) {
  if (!currentUser) return;
  const { data: existing } = await sb.from('club_creative_likes').select('*').eq('item_id', itemId).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await sb.from('club_creative_likes').delete().eq('item_id', itemId).eq('user_id', currentUser.id);
  } else {
    await sb.from('club_creative_likes').insert({ item_id: itemId, user_id: currentUser.id });
  }
  renderCreativeFeed();
}

document.getElementById('creativeSubmitForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser || !currentClubId) return;
  const noteEl = document.getElementById('creativeSubmitNote');
  const { error } = await sb.from('club_creative_items').insert({
    club_id: currentClubId,
    kind: document.getElementById('creativeSubmitKind').value,
    title: document.getElementById('creativeSubmitTitle').value.trim(),
    content: document.getElementById('creativeSubmitContent').value.trim(),
    author_id: currentUser.id,
    author_name: currentUser.name,
    status: 'pending'
  });
  if (error) { noteEl.textContent = error.message; return; }
  e.target.reset();
  document.getElementById('creativeSubmitPanel').style.display = 'none';
  noteEl.textContent = '';
  renderCreativeFeed();
});

// --------------------------------------------------------------------------
// SUGGESTION BOX TAB
// --------------------------------------------------------------------------
async function renderClubSuggestions() {
  if (!currentClubId || !currentUser) return;
  const container = document.getElementById('clubMySuggestionsList');
  const { data: messages, error } = await sb.from('club_suggestions').select('*').eq('club_id', currentClubId).eq('from_user', currentUser.id).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = messages.length ? messages.map(m => `
    <div class="admin-msg">
      <div><strong>You:</strong> ${escapeHtml(m.text)}</div>
      <div class="meta">${new Date(m.created_at).toLocaleString()}</div>
      ${m.admin_reply
        ? `<div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border);"><strong style="color:var(--accent-dark);">Reply:</strong> ${escapeHtml(m.admin_reply)}</div>`
        : `<p style="margin-top:8px; font-size:0.82rem; color:var(--text-muted); font-style:italic;">Awaiting a reply...</p>`}
    </div>
  `).join('') : emptyState("You haven't sent any messages yet.", 'message');
}

document.getElementById('clubSuggestionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser || !currentClubId) return;
  const textEl = document.getElementById('clubSuggestionText');
  const text = textEl.value.trim();
  if (!text) return;
  const { error } = await sb.from('club_suggestions').insert({
    club_id: currentClubId, from_user: currentUser.id, from_name: currentUser.name, from_email: currentUser.email, text
  });
  const noteEl = document.getElementById('clubSuggestionNote');
  if (error) { noteEl.textContent = error.message; return; }
  textEl.value = '';
  noteEl.textContent = 'Sent to the club managers.';
  setTimeout(() => noteEl.textContent = '', 3000);
  renderClubSuggestions();
});

// --------------------------------------------------------------------------
// ADMIN PANEL — content / creative / members / suggestions / profile
// --------------------------------------------------------------------------
function wireClubAdminSubTabs() {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.catab === clubAdminSubTab));
  document.querySelectorAll('.club-admin-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('clubadmin-' + clubAdminSubTab);
  if (panel) panel.style.display = 'block';
}

document.getElementById('clubAdminTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.admin-tab');
  if (!btn) return;
  clubAdminSubTab = btn.dataset.catab;
  wireClubAdminSubTabs();
  if (clubAdminSubTab === 'creative') renderClubCreativePending();
  if (clubAdminSubTab === 'members') renderClubAdminMembers(currentClubId);
  if (clubAdminSubTab === 'suggestions') renderClubAdminSuggestions();
  if (clubAdminSubTab === 'profile') fillClubProfileForm();
});

function renderClubAdminPanel() {
  if (!currentClubId || !isClubManagerOf(currentClubId)) return;
  clubAdminSubTab = 'content';
  wireClubAdminSubTabs();
}

// --- Creative Room moderation + manager uploads ---
document.getElementById('clubCreativeUploadKind').addEventListener('change', (e) => {
  document.getElementById('clubCreativeUploadLink').style.display = e.target.value === 'link' ? 'block' : 'none';
});

document.getElementById('clubCreativeUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser || !currentClubId) return;
  const noteEl = document.getElementById('clubCreativeUploadNote');
  const kind = document.getElementById('clubCreativeUploadKind').value;
  const updates = {
    club_id: currentClubId,
    kind,
    title: document.getElementById('clubCreativeUploadTitle').value.trim(),
    caption: document.getElementById('clubCreativeUploadCaption').value.trim(),
    author_id: currentUser.id,
    author_name: currentUser.name,
    status: 'approved'
  };

  if (kind === 'link') {
    updates.link_url = document.getElementById('clubCreativeUploadLink').value.trim();
    if (!updates.link_url) { noteEl.textContent = 'Add a link URL.'; return; }
  } else {
    const fileInput = document.getElementById('clubCreativeUploadFile');
    const file = fileInput.files && fileInput.files[0];
    if (!file) { noteEl.textContent = 'Choose a file to upload.'; return; }
    const bucket = kind === 'music' ? 'site-files' : 'site-images';
    const path = `club-creative/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from(bucket).upload(path, file);
    if (uploadError) { noteEl.textContent = uploadError.message; return; }
    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
    updates.media_url = urlData.publicUrl;
  }

  const { error } = await sb.from('club_creative_items').insert(updates);
  if (error) { noteEl.textContent = error.message; return; }
  e.target.reset();
  document.getElementById('clubCreativeUploadLink').style.display = 'none';
  noteEl.textContent = 'Uploaded.';
  setTimeout(() => noteEl.textContent = '', 2500);
  renderCreativeFeed();
});

async function renderClubCreativePending() {
  if (!currentClubId) return;
  const container = document.getElementById('clubCreativePendingList');
  const { data: pending, error } = await sb.from('club_creative_items').select('*').eq('club_id', currentClubId).eq('status', 'pending').order('created_at', { ascending: true });
  if (error) { console.error(error); return; }

  container.innerHTML = pending.length ? pending.map(w => `
    <div class="writing-card">
      <span class="writing-card__type">${escapeHtml(creativeKindLabel(w.kind))}</span>
      <h3>${escapeHtml(w.title)}</h3>
      <p class="writing-author">By ${escapeHtml(w.author_name)} &middot; ${new Date(w.created_at).toLocaleDateString()}</p>
      <div class="writing-card__content">${escapeHtml(w.content || '')}</div>
      <div class="item-admin-controls">
        <button class="creative-approve-btn" data-id="${w.id}">Approve</button>
        <button class="creative-reject-btn" data-id="${w.id}">Reject</button>
      </div>
    </div>
  `).join('') : emptyState('Nothing waiting for review.', 'admin');

  container.querySelectorAll('.creative-approve-btn').forEach(btn => {
    btn.addEventListener('click', () => moderateClubCreative(btn.dataset.id, 'approved'));
  });
  container.querySelectorAll('.creative-reject-btn').forEach(btn => {
    btn.addEventListener('click', () => moderateClubCreative(btn.dataset.id, 'rejected'));
  });
}

async function moderateClubCreative(id, status) {
  await sb.from('club_creative_items').update({ status }).eq('id', id);
  renderClubCreativePending();
  renderCreativeFeed();
}

// --- Members ---
async function renderClubAdminMembers(clubId) {
  if (!clubId) return;
  const container = document.getElementById('clubAdminMembersList');
  const [{ data: members }, { data: managers }, { data: profiles }] = await Promise.all([
    sb.from('club_members').select('*').eq('club_id', clubId),
    sb.from('club_managers').select('*').eq('club_id', clubId),
    sb.from('profiles').select('id, name')
  ]);
  const managerIds = new Set((managers || []).map(m => m.user_id));
  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p.name; });

  const pending = (members || []).filter(m => m.status === 'pending');
  const approved = (members || []).filter(m => m.status !== 'pending');
  updateClubMembersPendingBadge(pending.length);

  const pendingHtml = pending.length ? `
    <h4 class="club-detail__heading" style="margin-top:0;">Waiting for approval (${pending.length})</h4>
    ${pending.map(m => `
      <div class="club-member-row">
        <span>${escapeHtml(profileMap[m.user_id] || 'Unknown student')}</span>
        <div class="club-member-row__actions">
          <button class="club-member-approve-btn" data-club-id="${clubId}" data-user-id="${m.user_id}">Approve</button>
          <button class="club-member-remove-btn" data-club-id="${clubId}" data-user-id="${m.user_id}">Decline</button>
        </div>
      </div>
    `).join('')}
  ` : '';

  const rows = approved.map(m => {
    const isManager = managerIds.has(m.user_id);
    const name = profileMap[m.user_id] || 'Unknown student';
    const isLastManager = isManager && managerIds.size <= 1;
    return `
      <div class="club-member-row">
        <span>${escapeHtml(name)} ${isManager ? '<span class="club-member-row__badge">Manager</span>' : ''}</span>
        <div class="club-member-row__actions">
          <button class="club-manager-toggle-btn" data-club-id="${clubId}" data-user-id="${m.user_id}" data-is-manager="${isManager}" ${isLastManager ? 'disabled title="A club needs at least one manager"' : ''}>${isManager ? 'Remove as manager' : 'Make manager'}</button>
          <button class="club-member-remove-btn" data-club-id="${clubId}" data-user-id="${m.user_id}">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = pendingHtml +
    `<h4 class="club-detail__heading">Members (${approved.length})</h4>` +
    (rows || emptyState('No members yet.', 'clubs'));

  container.querySelectorAll('.club-member-approve-btn').forEach(btn => {
    btn.addEventListener('click', () => approveClubMember(btn.dataset.clubId, btn.dataset.userId));
  });
  container.querySelectorAll('.club-manager-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleClubManagerStatus(btn.dataset.clubId, btn.dataset.userId, btn.dataset.isManager === 'true'));
  });
  container.querySelectorAll('.club-member-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeClubMember(btn.dataset.clubId, btn.dataset.userId));
  });
}

function updateClubMembersPendingBadge(count) {
  const badge = document.getElementById('clubAdminMembersPendingCount');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

async function approveClubMember(clubId, userId) {
  const { error } = await sb.from('club_members').update({ status: 'approved' }).eq('club_id', clubId).eq('user_id', userId);
  if (error) { alert(error.message); return; }
  renderClubAdminMembers(clubId);
  renderClubs();
}

// --- Suggestion box (manager view) ---
async function renderClubAdminSuggestions() {
  if (!currentClubId) return;
  const container = document.getElementById('clubAdminSuggestionsList');
  const { data: messages, error } = await sb.from('club_suggestions').select('*').eq('club_id', currentClubId).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = messages.length ? messages.map(m => `
    <div class="admin-msg">
      <div>${escapeHtml(m.text)}</div>
      <div class="meta">From ${escapeHtml(m.from_name)} &middot; ${new Date(m.created_at).toLocaleString()}</div>
      <form class="club-suggestion-reply-form" data-id="${m.id}" style="margin-top:12px;">
        <textarea rows="2" placeholder="Write a private reply...">${escapeHtml(m.admin_reply || '')}</textarea>
        <div class="item-admin-controls" style="margin-top:8px;">
          <button type="submit" class="btn btn--primary" style="width:fit-content;">${m.admin_reply ? 'Update reply' : 'Send reply'}</button>
        </div>
      </form>
      <div class="item-admin-controls">
        <button class="club-suggestion-delete-btn" data-id="${m.id}">${ICON_DELETE} Delete</button>
      </div>
    </div>
  `).join('') : emptyState('No messages yet.', 'message');

  container.querySelectorAll('.club-suggestion-reply-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = form.querySelector('textarea').value.trim();
      if (!text) return;
      await sb.from('club_suggestions').update({ admin_reply: text, replied_at: new Date().toISOString() }).eq('id', form.dataset.id);
      renderClubAdminSuggestions();
    });
  });
  container.querySelectorAll('.club-suggestion-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this message?')) return;
      await sb.from('club_suggestions').delete().eq('id', btn.dataset.id);
      renderClubAdminSuggestions();
    });
  });
}

// --- Club profile ---
function fillClubProfileForm() {
  if (!currentClub) return;
  document.getElementById('clubProfileEditTitle').value = currentClub.title;
  document.getElementById('clubProfileEditCategory').value = currentClub.category;
  document.getElementById('clubProfileEditDescription').value = currentClub.description;

  const mode = currentClub.join_mode === 'open' ? 'open' : 'approval';
  document.querySelectorAll('input[name="clubProfileJoinMode"]').forEach(input => {
    input.checked = input.value === mode;
    input.closest('.join-mode-option').classList.toggle('is-selected', input.value === mode);
  });
}

document.getElementById('clubProfileEditForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentClubId) return;
  const noteEl = document.getElementById('clubProfileEditNote');
  const joinModeInput = document.querySelector('input[name="clubProfileJoinMode"]:checked');
  const updates = {
    title: document.getElementById('clubProfileEditTitle').value.trim(),
    category: document.getElementById('clubProfileEditCategory').value,
    description: document.getElementById('clubProfileEditDescription').value.trim(),
    join_mode: joinModeInput ? joinModeInput.value : 'approval'
  };
  const fileInput = document.getElementById('clubProfileEditPhoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `club-photos/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }
  const { error } = await sb.from('clubs').update(updates).eq('id', currentClubId);
  if (error) { noteEl.textContent = error.message; return; }
  currentClub = { ...currentClub, ...updates };
  noteEl.textContent = 'Saved.';
  setTimeout(() => noteEl.textContent = '', 2500);
  renderClubHomeHeader();
  renderClubs();
});
