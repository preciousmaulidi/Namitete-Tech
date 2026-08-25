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

  document.getElementById('zcApp').style.display = 'block';
  renderPrivacyPanel();
  renderAnonBanner();
  wireTabs();
  wireForms();
  loadFriends();
  loadRequests();
}

function renderAnonBanner() {
  document.getElementById('zcAnonBanner').style.display = currentZcProfile.discoverable ? 'none' : 'block';
}

// ---------------------------------------------------------------------
// TABS
// ---------------------------------------------------------------------
function wireTabs() {
  document.getElementById('zcTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-panel]');
    if (!btn) return;
    document.querySelectorAll('#zcTabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.zc-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
  });
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

  // Figure out existing friendship/request state for each result in one query
  const ids = students.map(s => s.user_id);
  const { data: existing } = await sb.from('zc_friendships')
    .select('*')
    .or(`requester_id.in.(${ids.join(',')}),recipient_id.in.(${ids.join(',')})`)
    .or(`requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);

  wrap.innerHTML = students.map(s => {
    const rel = (existing || []).find(f =>
      (f.requester_id === currentUser.id && f.recipient_id === s.user_id) ||
      (f.recipient_id === currentUser.id && f.requester_id === s.user_id)
    );
    let actionHtml = `<button class="btn btn--primary zc-add-friend" data-id="${s.user_id}">Add Friend</button>`;
    if (rel && rel.status === 'pending') actionHtml = `<span class="zc-note">Request pending</span>`;
    if (rel && rel.status === 'accepted') actionHtml = `<span class="zc-note">Friends</span>`;

    return `
      <div class="zc-student-card">
        <div class="zc-student-card__info">
          <span class="zc-student-card__name">${escapeHtml(s.profiles.name)}</span>
          <span class="zc-student-card__meta">${escapeHtml([s.programme, s.department, s.year_of_study ? 'Year ' + s.year_of_study : null].filter(Boolean).join(' · '))}</span>
        </div>
        ${actionHtml}
      </div>`;
  }).join('');

  wrap.querySelectorAll('.zc-add-friend').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await sb.from('zc_friendships').insert({ requester_id: currentUser.id, recipient_id: btn.dataset.id });
      if (error) { alert(friendlyError(error)); return; }
      btn.outerHTML = '<span class="zc-note">Request pending</span>';
    });
  });
}

// ---------------------------------------------------------------------
// FRIENDS & REQUESTS
// ---------------------------------------------------------------------
async function loadFriends() {
  const wrap = document.getElementById('zcFriendsList');
  const { data, error } = await sb.from('zc_friendships')
    .select('id, requester_id, recipient_id, requester_profile:profiles!zc_friendships_requester_id_fkey(id,name), recipient_profile:profiles!zc_friendships_recipient_id_fkey(id,name)')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);
  if (error) { wrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(error))}</p>`; return; }
  if (!data || !data.length) { wrap.innerHTML = '<p class="zc-empty">No friends yet — try Find Students.</p>'; return; }

  wrap.innerHTML = data.map(f => {
    const isRequester = f.requester_id === currentUser.id;
    const other = isRequester ? f.recipient_profile : f.requester_profile;
    const name = other ? other.name : 'Student';
    return `
      <div class="zc-student-card">
        <div class="zc-student-card__info"><span class="zc-student-card__name">${escapeHtml(name)}</span></div>
        <button class="btn btn--ghost zc-remove-friend" data-id="${f.id}">Remove</button>
      </div>`;
  }).join('');

  wrap.querySelectorAll('.zc-remove-friend').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this friend?')) return;
      const { error } = await sb.from('zc_friendships').delete().eq('id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      loadFriends();
    });
  });
}

async function loadRequests() {
  const incWrap = document.getElementById('zcIncomingRequests');
  const outWrap = document.getElementById('zcOutgoingRequests');

  const { data: incoming, error: incError } = await sb.from('zc_friendships')
    .select('id, requester_id, requester_profile:profiles!zc_friendships_requester_id_fkey(name)')
    .eq('recipient_id', currentUser.id).eq('status', 'pending');
  if (incError) { incWrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(incError))}</p>`; }
  else if (!incoming || !incoming.length) { incWrap.innerHTML = '<p class="zc-empty">No incoming requests.</p>'; }
  else {
    incWrap.innerHTML = incoming.map(r => `
      <div class="zc-student-card">
        <div class="zc-student-card__info"><span class="zc-student-card__name">${escapeHtml(r.requester_profile.name)}</span></div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn--primary zc-accept" data-id="${r.id}">Accept</button>
          <button class="btn btn--ghost zc-reject" data-id="${r.id}">Reject</button>
        </div>
      </div>`).join('');
    incWrap.querySelectorAll('.zc-accept').forEach(btn => btn.addEventListener('click', () => respondToRequest(btn.dataset.id, 'accepted')));
    incWrap.querySelectorAll('.zc-reject').forEach(btn => btn.addEventListener('click', () => respondToRequest(btn.dataset.id, 'rejected')));
  }

  const { data: outgoing, error: outError } = await sb.from('zc_friendships')
    .select('id, recipient_id, recipient_profile:profiles!zc_friendships_recipient_id_fkey(name)')
    .eq('requester_id', currentUser.id).eq('status', 'pending');
  if (outError) { outWrap.innerHTML = `<p class="zc-empty">${escapeHtml(friendlyError(outError))}</p>`; }
  else if (!outgoing || !outgoing.length) { outWrap.innerHTML = '<p class="zc-empty">No pending sent requests.</p>'; }
  else {
    outWrap.innerHTML = outgoing.map(r => `
      <div class="zc-student-card">
        <div class="zc-student-card__info"><span class="zc-student-card__name">${escapeHtml(r.recipient_profile.name)}</span></div>
        <button class="btn btn--ghost zc-cancel" data-id="${r.id}">Cancel</button>
      </div>`).join('');
    outWrap.querySelectorAll('.zc-cancel').forEach(btn => btn.addEventListener('click', async () => {
      const { error } = await sb.from('zc_friendships').delete().eq('id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      loadRequests();
    }));
  }
}

async function respondToRequest(id, status) {
  const { error } = await sb.from('zc_friendships').update({ status, responded_at: new Date().toISOString() }).eq('id', id);
  if (error) { alert(friendlyError(error)); return; }
  loadRequests();
  loadFriends();
}

document.addEventListener('DOMContentLoaded', init);
