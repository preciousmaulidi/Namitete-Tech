// ==========================================================================
// NATECO Digital Solution — app logic (Supabase-backed)
//
// This version talks to a real Supabase database instead of localStorage.
// Data is shared across every device — this is the version meant to go live.
// ==========================================================================

const SUPABASE_URL = 'https://zhawyqrtrpdivvaqhhhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cumJP_IiPBI-DFSH66lLMg_8VddgP3e';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const THEME_KEY = 'nt_theme'; // theme preference stays local — it's per-device, not shared data

// --- Small inline SVG icons, used instead of emoji throughout the UI ---
const ICON_EDIT = `<svg class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 3.5L16.5 6.5M2.5 17.5L3.2 14.2C3.3 13.7 3.55 13.25 3.9 12.9L12.4 4.4C13 3.8 14 3.8 14.6 4.4L15.6 5.4C16.2 6 16.2 7 15.6 7.6L7.1 16.1C6.75 16.45 6.3 16.7 5.8 16.8L2.5 17.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_DELETE = `<svg class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5.5H17M8 5.5V3.8C8 3.35 8.35 3 8.8 3H11.2C11.65 3 12 3.35 12 3.8V5.5M14.5 5.5V16C14.5 16.55 14.05 17 13.5 17H6.5C5.95 17 5.5 16.55 5.5 16V5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.3 8.7V13.3M11.7 8.7V13.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const ICON_LIKE = `<svg class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 8.5V16.5H4.5C4 16.5 3.5 16 3.5 15.5V9.5C3.5 9 4 8.5 4.5 8.5H7.5ZM7.5 8.5L10.7 3.3C10.9 3 11.3 2.9 11.6 3.1C12.3 3.5 12.7 4.3 12.5 5.1L11.8 8H15.2C16 8 16.6 8.75 16.4 9.5L15 15C14.85 15.6 14.3 16 13.7 16H7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let currentUser = null; // { id, name, email, role, bio }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}
function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'assistant_admin') return 'Assistant Admin';
  return 'Student';
}
function canManageContent(user) {
  return !!user && (user.role === 'admin' || user.role === 'assistant_admin');
}
function showError(el, message) {
  if (el) el.textContent = message;
}

document.getElementById('footerYear').textContent = new Date().getFullYear();

// --- Apply saved theme immediately, even before login ---
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

// ==========================================================================
// SESSION HANDLING — check if someone's already logged in when the page loads
// ==========================================================================
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await loadProfileAndEnter(session.user.id);
  }
}

async function loadProfileAndEnter(userId) {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) {
    console.error('Could not load profile', error);
    return;
  }
  currentUser = data;
  enterApp();
}

checkSession();

// ==========================================================================
// AUTH
// ==========================================================================
const authBackdrop = document.getElementById('authBackdrop');
const authPanes = {
  login: document.getElementById('loginPane'),
  signup: document.getElementById('signupPane'),
  checkEmail: document.getElementById('checkEmailPane'),
  forgotPassword: document.getElementById('forgotPasswordPane'),
  resetPassword: document.getElementById('resetPasswordPane')
};

function showAuthPane(name) {
  Object.values(authPanes).forEach(pane => pane.style.display = 'none');
  authPanes[name].style.display = 'block';
}

function openAuth() { authBackdrop.classList.add('open'); showAuthPane('login'); }
function closeAuth() { authBackdrop.classList.remove('open'); }

document.getElementById('loginNavBtn').addEventListener('click', openAuth);
document.getElementById('heroLoginBtn').addEventListener('click', openAuth);
document.getElementById('authClose').addEventListener('click', closeAuth);
authBackdrop.addEventListener('click', (e) => { if (e.target === authBackdrop) closeAuth(); });

document.getElementById('showSignup').addEventListener('click', (e) => {
  e.preventDefault(); showAuthPane('signup');
});
document.getElementById('showLogin').addEventListener('click', (e) => {
  e.preventDefault(); showAuthPane('login');
});
document.getElementById('showForgotPassword').addEventListener('click', (e) => {
  e.preventDefault(); showAuthPane('forgotPassword');
});
document.getElementById('backToLoginFromCheckEmail').addEventListener('click', (e) => {
  e.preventDefault(); showAuthPane('login');
});
document.getElementById('backToLoginFromForgot').addEventListener('click', (e) => {
  e.preventDefault(); showAuthPane('login');
});

// Asks the browser to offer saving these credentials in its built-in password
// manager — this is what makes "remember me next time" work, the same way
// most sites do it. Supported in Chrome/Edge/Android; harmless if unsupported.
async function offerToSaveCredentials(email, password, name) {
  if ('PasswordCredential' in window && 'credentials' in navigator) {
    try {
      const cred = new PasswordCredential({ id: email, password, name: name || email });
      await navigator.credentials.store(cred);
    } catch (err) {
      console.log('Could not offer to save credentials', err);
    }
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  showError(errorEl, '');

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    showError(errorEl, 'Incorrect email or password.');
    document.getElementById('forgotPasswordRow').style.display = 'block';
    return;
  }

  await loadProfileAndEnter(data.user.id);
  offerToSaveCredentials(email, password, currentUser ? currentUser.name : email);
  closeAuth();
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;
  const errorEl = document.getElementById('signupError');
  showError(errorEl, '');

  if (password !== confirmPassword) {
    showError(errorEl, 'Passwords do not match.');
    return;
  }

  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { name } }
  });
  if (error) { showError(errorEl, error.message); return; }

  if (!data.session) {
    // Email confirmation is required before login — show the check-your-email screen
    showAuthPane('checkEmail');
    return;
  }

  await loadProfileAndEnter(data.user.id);
  offerToSaveCredentials(email, password, name);
  closeAuth();
});

document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  const errorEl = document.getElementById('forgotPasswordError');
  const noteEl = document.getElementById('forgotPasswordNote');
  showError(errorEl, ''); noteEl.textContent = '';

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) { showError(errorEl, error.message); return; }

  noteEl.textContent = 'Check your email for a link to reset your password.';
});

// When someone clicks the password-reset link in their email, Supabase fires this event
sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    openAuth();
    showAuthPane('resetPassword');
  }
});

document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('resetNewPassword').value;
  const confirmPassword = document.getElementById('resetConfirmPassword').value;
  const errorEl = document.getElementById('resetPasswordError');
  showError(errorEl, '');

  if (newPassword !== confirmPassword) {
    showError(errorEl, 'Passwords do not match.');
    return;
  }

  const { data, error } = await sb.auth.updateUser({ password: newPassword });
  if (error) { showError(errorEl, error.message); return; }

  closeAuth();
  await loadProfileAndEnter(data.user.id);
});

async function performLogout() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('appView').style.display = 'none';
  document.getElementById('publicView').style.display = 'block';
  document.getElementById('navRight').innerHTML = '<button class="btn btn--ghost" id="loginNavBtn">Log in</button>';
  document.getElementById('loginNavBtn').addEventListener('click', openAuth);
}

document.getElementById('logoutNavBtn').addEventListener('click', performLogout);

// ==========================================================================
// APP ENTRY
// ==========================================================================
async function enterApp() {
  if (!currentUser) return;

  document.getElementById('publicView').style.display = 'none';
  document.getElementById('appView').style.display = 'block';
  document.getElementById('navRight').innerHTML = '';
  document.getElementById('homeUserName').textContent = ', ' + currentUser.name.split(' ')[0];
  document.getElementById('adminNavLink').style.display = canManageContent(currentUser) ? 'block' : 'none';
  document.getElementById('assistantAdminSection').style.display = currentUser.role === 'admin' ? 'block' : 'none';

  fillProfileForm();
  await Promise.all([
    renderPosts(),
    renderEvents(),
    renderBooks(),
    renderListings(),
    renderSports(),
    renderDownloads(),
    renderSpotlight(),
    renderSongs(),
    renderSongOfWeek(),
    renderHomeHighlights(),
    renderMyMessages(),
    renderDocument('timetable', 'timetableViewer'),
    renderDocument('academic_calendar', 'academicCalendarViewer')
  ]);
  if (canManageContent(currentUser)) {
    renderAdminMessages();
    renderRegisteredUsers();
  }
  if (currentUser.role === 'admin') {
    renderAssistantAdminManager();
  }
}

// --- View switching (works for sidebar links AND home-page quick cards) ---
function switchView(viewName) {
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
  const matchingLink = document.querySelector(`.sidebar__link[data-view="${viewName}"]`);
  if (matchingLink) matchingLink.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + viewName).style.display = 'block';
  document.querySelector('.app__content').scrollTo({ top: 0, behavior: 'auto' });
  closeMobileMenu();
}

function openMobileMenu() {
  document.getElementById('sidebarNav').classList.add('open');
  document.getElementById('sidebarMenuToggle').classList.add('hidden');
}
function closeMobileMenu() {
  document.getElementById('sidebarNav').classList.remove('open');
  document.getElementById('sidebarMenuToggle').classList.remove('hidden');
}

document.querySelectorAll('.sidebar__link').forEach(link => {
  link.addEventListener('click', () => switchView(link.dataset.view));
});
document.querySelectorAll('.home-card').forEach(card => {
  card.addEventListener('click', () => switchView(card.dataset.view));
});
document.getElementById('sidebarMenuToggle').addEventListener('click', openMobileMenu);
document.getElementById('sidebarNavClose').addEventListener('click', closeMobileMenu);

// ==========================================================================
// UPDATES / POSTS (with likes + comments)
// ==========================================================================
async function renderPosts() {
  const container = document.getElementById('postsList');
  const { data: posts, error } = await sb.from('posts').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  const postIds = posts.map(p => p.id);
  let likes = [], comments = [];
  if (postIds.length) {
    const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
      sb.from('post_likes').select('*').in('post_id', postIds),
      sb.from('post_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true })
    ]);
    likes = likeRows || [];
    comments = commentRows || [];
  }

  container.innerHTML = '';
  posts.forEach(post => {
    const postLikes = likes.filter(l => l.post_id === post.id);
    const postComments = comments.filter(c => c.post_id === post.id);
    const liked = currentUser && postLikes.some(l => l.user_id === currentUser.id);

    const card = document.createElement('div');
    card.className = 'post-card';
    card.style.fontFamily = `'${post.font_family || 'Inter'}', sans-serif`;
    card.style.background = post.bg_color || '#FFFFFF';
    card.innerHTML = `
      ${post.photo_url ? `<img src="${escapeHtml(post.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.body)}</p>
      <div class="post-card__actions">
        <button class="like-btn ${liked ? 'liked' : ''}" data-id="${post.id}">${ICON_LIKE} ${postLikes.length} Like${postLikes.length === 1 ? '' : 's'}</button>
        <span style="font-size:0.85rem; color:var(--text-muted);">${postComments.length} comment${postComments.length === 1 ? '' : 's'}</span>
      </div>
      <div class="comment-list">
        ${postComments.map(c => `<div class="comment-item"><strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(c.text)}</div>`).join('')}
      </div>
      <form class="comment-form" data-id="${post.id}">
        <input type="text" placeholder="Write a comment..." required />
        <button type="submit">Post</button>
      </form>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="edit-btn" data-id="${post.id}" data-title="${escapeHtml(post.title)}" data-body="${escapeHtml(post.body)}" data-font="${escapeHtml(post.font_family || 'Inter')}" data-bgcolor="${escapeHtml(post.bg_color || '#FFFFFF')}">${ICON_EDIT} Edit</button>
        <button class="delete-btn" data-id="${post.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleLike(btn.dataset.id));
  });
  container.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      addComment(form.dataset.id, input.value.trim());
      input.value = '';
    });
  });
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editPost(btn.dataset.id, btn.dataset.title, btn.dataset.body, btn.dataset.font, btn.dataset.bgcolor));
  });
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePost(btn.dataset.id));
  });
}

async function toggleLike(postId) {
  if (!currentUser) return;
  const { data: existing } = await sb.from('post_likes').select('*').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
  } else {
    await sb.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
  }
  renderPosts();
}

async function addComment(postId, text) {
  if (!text || !currentUser) return;
  await sb.from('post_comments').insert({ post_id: postId, user_id: currentUser.id, name: currentUser.name, text });
  renderPosts();
}

function editPost(id, title, body, font, bgColor) {
  switchView('admin');
  document.getElementById('editingPostId').value = id;
  document.getElementById('newPostTitle').value = title;
  document.getElementById('newPostBody').value = body;
  document.getElementById('newPostFont').value = font || 'Inter';
  document.getElementById('newPostBgColor').value = bgColor || '#ffffff';
  document.getElementById('postFormHeading').textContent = 'Editing update';
  document.getElementById('postSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelPostEdit').style.display = 'inline-block';
}

async function deletePost(id) {
  if (!confirm('Delete this update? This cannot be undone.')) return;
  await sb.from('posts').delete().eq('id', id);
  renderPosts();
  renderHomeHighlights();
}

document.getElementById('newPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newPostTitle').value.trim();
  const body = document.getElementById('newPostBody').value.trim();
  const font_family = document.getElementById('newPostFont').value;
  const bg_color = document.getElementById('newPostBgColor').value;
  const editingId = document.getElementById('editingPostId').value;
  const fileInput = document.getElementById('newPostPhoto');
  const updates = { title, body, font_family, bg_color };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `posts/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }

  if (editingId) {
    await sb.from('posts').update(updates).eq('id', editingId);
  } else {
    await sb.from('posts').insert(updates);
  }
  resetPostForm();
  renderPosts();
  renderHomeHighlights();
});

function resetPostForm() {
  document.getElementById('newPostForm').reset();
  document.getElementById('editingPostId').value = '';
  document.getElementById('newPostFont').value = 'Inter';
  document.getElementById('newPostBgColor').value = '#ffffff';
  document.getElementById('postFormHeading').textContent = 'Post an update';
  document.getElementById('postSubmitBtn').textContent = 'Publish';
  document.getElementById('cancelPostEdit').style.display = 'none';
}
document.getElementById('cancelPostEdit').addEventListener('click', resetPostForm);

// ==========================================================================
// EVENTS & ANNOUNCEMENTS
// ==========================================================================
async function renderEvents() {
  const container = document.getElementById('eventsList');
  const { data: events, error } = await sb.from('events').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = events.map(ev => `
    <div class="post-card">
      ${ev.photo_url ? `<img src="${escapeHtml(ev.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${escapeHtml(ev.event_date)}</span>
      <h3>${escapeHtml(ev.title)}</h3>
      <p>${escapeHtml(ev.body)}</p>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="event-edit-btn" data-id="${ev.id}">${ICON_EDIT} Edit</button>
        <button class="event-delete-btn" data-id="${ev.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.event-edit-btn').forEach(btn => {
    const ev = events.find(x => x.id === btn.dataset.id);
    btn.addEventListener('click', () => editEvent(ev));
  });
  container.querySelectorAll('.event-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
  });
}

function editEvent(ev) {
  if (!ev) return;
  switchView('admin');
  document.getElementById('editingEventId').value = ev.id;
  document.getElementById('newEventTitle').value = ev.title;
  document.getElementById('newEventDate').value = ev.event_date;
  document.getElementById('newEventBody').value = ev.body;
  document.getElementById('eventFormHeading').textContent = 'Editing event/announcement';
  document.getElementById('eventSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelEventEdit').style.display = 'inline-block';
}

async function deleteEvent(id) {
  if (!confirm('Delete this event/announcement? This cannot be undone.')) return;
  await sb.from('events').delete().eq('id', id);
  renderEvents();
}

document.getElementById('newEventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newEventTitle').value.trim();
  const event_date = document.getElementById('newEventDate').value.trim();
  const body = document.getElementById('newEventBody').value.trim();
  const editingId = document.getElementById('editingEventId').value;
  const fileInput = document.getElementById('newEventPhoto');
  const updates = { title, event_date, body };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `events/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }

  if (editingId) {
    await sb.from('events').update(updates).eq('id', editingId);
  } else {
    await sb.from('events').insert(updates);
  }
  resetEventForm();
  renderEvents();
});

function resetEventForm() {
  document.getElementById('newEventForm').reset();
  document.getElementById('editingEventId').value = '';
  document.getElementById('eventFormHeading').textContent = 'Post an event or announcement';
  document.getElementById('eventSubmitBtn').textContent = 'Publish';
  document.getElementById('cancelEventEdit').style.display = 'none';
}
document.getElementById('cancelEventEdit').addEventListener('click', resetEventForm);

// ==========================================================================
// LIBRARY (books)
// ==========================================================================
let allLibraryItems = [];
let bookSearchTerm = '';
let paperSearchTerm = '';

async function renderBooks() {
  const { data: items, error } = await sb.from('books').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allLibraryItems = items;
  renderBookGrid();
  renderPaperGrid();
}

function bookCardHtml(b) {
  return `
    <div class="book-card">
      <div class="book-card__cover"></div>
      <h3>${escapeHtml(b.title)}</h3>
      <p class="author">${escapeHtml(b.author)}</p>
      <p>${escapeHtml(b.description)}</p>
      ${b.file_url ? `<a class="download-card__action" style="display:inline-block; margin-top:10px;" href="${escapeHtml(b.file_url)}" target="_blank" rel="noopener">${b.category === 'past_paper' ? 'Open paper' : 'Open book'}</a>` : ''}
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="book-edit-btn" data-id="${b.id}">${ICON_EDIT} Edit</button>
        <button class="book-delete-btn" data-id="${b.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>`;
}

function matchesLibrarySearch(item, term) {
  if (!term) return true;
  return (item.title + ' ' + item.author).toLowerCase().includes(term.toLowerCase());
}

function wireLibraryButtons(grid) {
  grid.querySelectorAll('.book-edit-btn').forEach(btn => {
    const book = allLibraryItems.find(x => x.id === btn.dataset.id);
    btn.addEventListener('click', () => editBook(book));
  });
  grid.querySelectorAll('.book-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteBook(btn.dataset.id));
  });
}

function renderBookGrid() {
  const grid = document.getElementById('bookGrid');
  const books = allLibraryItems.filter(b => b.category !== 'past_paper' && matchesLibrarySearch(b, bookSearchTerm));
  grid.innerHTML = books.length
    ? books.map(bookCardHtml).join('')
    : `<p style="color:var(--text-muted); font-size:0.9rem;">${bookSearchTerm ? 'No books match your search.' : 'No books added yet.'}</p>`;
  wireLibraryButtons(grid);
}

function renderPaperGrid() {
  const grid = document.getElementById('pastPapersGrid');
  const papers = allLibraryItems.filter(b => b.category === 'past_paper' && matchesLibrarySearch(b, paperSearchTerm));
  grid.innerHTML = papers.length
    ? papers.map(bookCardHtml).join('')
    : `<p style="color:var(--text-muted); font-size:0.9rem;">${paperSearchTerm ? 'No past papers match your search.' : 'No past papers added yet.'}</p>`;
  wireLibraryButtons(grid);
}

document.getElementById('bookSearchInput').addEventListener('input', (e) => {
  bookSearchTerm = e.target.value.trim();
  renderBookGrid();
});
document.getElementById('paperSearchInput').addEventListener('input', (e) => {
  paperSearchTerm = e.target.value.trim();
  renderPaperGrid();
});

function editBook(book) {
  if (!book) return;
  switchView('admin');
  document.getElementById('editingBookId').value = book.id;
  document.getElementById('newBookCategory').value = book.category || 'book';
  document.getElementById('newBookTitle').value = book.title;
  document.getElementById('newBookAuthor').value = book.author;
  document.getElementById('newBookDesc').value = book.description;
  document.getElementById('bookFormHeading').textContent = 'Editing library item';
  document.getElementById('bookSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelBookEdit').style.display = 'inline-block';
}

async function deleteBook(id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  await sb.from('books').delete().eq('id', id);
  renderBooks();
}

document.getElementById('newBookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const category = document.getElementById('newBookCategory').value;
  const title = document.getElementById('newBookTitle').value.trim();
  const author = document.getElementById('newBookAuthor').value.trim();
  const description = document.getElementById('newBookDesc').value.trim();
  const editingId = document.getElementById('editingBookId').value;
  const fileInput = document.getElementById('newBookFile');
  const noteEl = document.getElementById('bookUploadNote');
  const updates = { category, title, author, description };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `books/${Date.now()}-${file.name}`;
    noteEl.textContent = 'Uploading file...';
    const { error: uploadError } = await sb.storage.from('site-files').upload(path, file);
    if (uploadError) { noteEl.textContent = 'Upload failed: ' + uploadError.message; return; }
    const { data: urlData } = sb.storage.from('site-files').getPublicUrl(path);
    updates.file_url = urlData.publicUrl;
  }

  if (editingId) {
    await sb.from('books').update(updates).eq('id', editingId);
  } else {
    await sb.from('books').insert(updates);
  }
  noteEl.textContent = '';
  resetBookForm();
  renderBooks();
});

function resetBookForm() {
  document.getElementById('newBookForm').reset();
  document.getElementById('editingBookId').value = '';
  document.getElementById('bookFormHeading').textContent = 'Add a library item';
  document.getElementById('bookSubmitBtn').textContent = 'Add item';
  document.getElementById('cancelBookEdit').style.display = 'none';
  document.getElementById('bookUploadNote').textContent = '';
}
document.getElementById('cancelBookEdit').addEventListener('click', resetBookForm);

// ==========================================================================
// ACCOMMODATION
// ==========================================================================
async function renderListings() {
  const grid = document.getElementById('listingGrid');
  const { data: listings, error } = await sb.from('listings').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  grid.innerHTML = listings.map(l => `
    <div class="listing-card">
      <h3>${escapeHtml(l.title)}</h3>
      <p class="price">${escapeHtml(l.price)}</p>
      <p>${escapeHtml(l.description)}</p>
      <p class="contact">${escapeHtml(l.contact)}</p>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="listing-edit-btn" data-id="${l.id}">${ICON_EDIT} Edit</button>
        <button class="listing-delete-btn" data-id="${l.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  grid.querySelectorAll('.listing-edit-btn').forEach(btn => {
    const listing = listings.find(x => x.id === btn.dataset.id);
    btn.addEventListener('click', () => editListing(listing));
  });
  grid.querySelectorAll('.listing-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteListing(btn.dataset.id));
  });
}

function editListing(listing) {
  if (!listing) return;
  switchView('admin');
  document.getElementById('editingListingId').value = listing.id;
  document.getElementById('newListingTitle').value = listing.title;
  document.getElementById('newListingPrice').value = listing.price;
  document.getElementById('newListingContact').value = listing.contact;
  document.getElementById('newListingDesc').value = listing.description;
  document.getElementById('listingFormHeading').textContent = 'Editing accommodation listing';
  document.getElementById('listingSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelListingEdit').style.display = 'inline-block';
}

async function deleteListing(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  await sb.from('listings').delete().eq('id', id);
  renderListings();
}

document.getElementById('newListingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newListingTitle').value.trim();
  const price = document.getElementById('newListingPrice').value.trim();
  const contact = document.getElementById('newListingContact').value.trim();
  const description = document.getElementById('newListingDesc').value.trim();
  const editingId = document.getElementById('editingListingId').value;

  if (editingId) {
    await sb.from('listings').update({ title, price, contact, description }).eq('id', editingId);
  } else {
    await sb.from('listings').insert({ title, price, contact, description });
  }
  resetListingForm();
  renderListings();
});

function resetListingForm() {
  document.getElementById('newListingForm').reset();
  document.getElementById('editingListingId').value = '';
  document.getElementById('listingFormHeading').textContent = 'Add an accommodation listing';
  document.getElementById('listingSubmitBtn').textContent = 'Add listing';
  document.getElementById('cancelListingEdit').style.display = 'none';
}
document.getElementById('cancelListingEdit').addEventListener('click', resetListingForm);

// ==========================================================================
// OPEN MIC — songs, anonymous weekly voting, Song of the Week
// ==========================================================================

// Monday-based week key so Wed/Thu/Fri of the same week always match
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function isVotingOpen() {
  const day = new Date().getDay(); // 3 = Wed, 4 = Thu, 5 = Fri
  return day === 3 || day === 4 || day === 5;
}

let allSongs = [];
let myCurrentVote = null; // { song_id, week_start } or null
let songVoteCounts = {}; // song_id -> count, for the current week

async function renderSongs() {
  const premiereEl = document.getElementById('premiereSongsList');
  const hitEl = document.getElementById('hitSongsList');
  const noteEl = document.getElementById('votingWindowNote');

  const { data: songs, error } = await sb.from('open_mic_songs').select('*').order('uploaded_at', { ascending: false });
  if (error) { console.error(error); return; }
  allSongs = songs;

  const weekStart = getWeekStart();
  const votingOpen = isVotingOpen();
  noteEl.textContent = votingOpen
    ? "Voting is open now through Friday — pick your favorite! Only the vote count is ever shown, never who voted."
    : "Voting opens Wednesday and runs through Friday each week.";

  // Get this week's vote counts (counts only — never voter identities)
  const { data: counts } = await sb.rpc('get_song_vote_counts', { p_week_start: weekStart });
  songVoteCounts = {};
  (counts || []).forEach(c => { songVoteCounts[c.song_id] = c.vote_count; });

  // Get the student's own vote (if any) for this week, so we can highlight it
  if (currentUser) {
    const { data: myVote } = await sb.from('song_votes').select('*').eq('user_id', currentUser.id).eq('week_start', weekStart).maybeSingle();
    myCurrentVote = myVote || null;
  }

  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const premiere = songs.filter(s => (now - new Date(s.uploaded_at).getTime()) < twoDaysMs);
  const hits = songs.filter(s => (now - new Date(s.uploaded_at).getTime()) >= twoDaysMs);

  premiereEl.innerHTML = premiere.length
    ? premiere.map(songCardHtml).join('')
    : '<p style="color:var(--text-muted); font-size:0.9rem;">No new songs this week.</p>';
  hitEl.innerHTML = hits.length
    ? hits.map(songCardHtml).join('')
    : '<p style="color:var(--text-muted); font-size:0.9rem;">No songs here yet.</p>';

  [premiereEl, hitEl].forEach(container => {
    container.querySelectorAll('.song-card__vote-btn').forEach(btn => {
      btn.addEventListener('click', () => castVote(btn.dataset.id));
    });
    container.querySelectorAll('.song-edit-btn').forEach(btn => {
      const song = allSongs.find(s => s.id === btn.dataset.id);
      btn.addEventListener('click', () => editSong(song));
    });
    container.querySelectorAll('.song-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteSong(btn.dataset.id));
    });
  });
}

function songCardHtml(s) {
  const count = songVoteCounts[s.id] || 0;
  const hasVoted = myCurrentVote && myCurrentVote.song_id === s.id;
  const votingOpen = isVotingOpen();
  return `
    <div class="song-card">
      <div class="song-card__top">
        <div>
          <h3>${s.cover_url ? `<img src="${escapeHtml(s.cover_url)}" alt="" class="song-card__cover" />` : ''}${escapeHtml(s.title)}</h3>
          <p class="artist">${escapeHtml(s.artist)}</p>
        </div>
        ${canManageContent(currentUser) ? `
        <div class="item-admin-controls">
          <button class="song-edit-btn" data-id="${s.id}">${ICON_EDIT} Edit</button>
          <button class="song-delete-btn" data-id="${s.id}">${ICON_DELETE} Delete</button>
        </div>` : ''}
      </div>
      <audio controls src="${escapeHtml(s.file_url)}"></audio>
      <div class="song-card__vote-row">
        ${votingOpen ? `<button class="song-card__vote-btn ${hasVoted ? 'voted' : ''}" data-id="${s.id}">${hasVoted ? 'Voted ✓' : 'Vote for this'}</button>` : ''}
        <span class="song-card__vote-count">${count} vote${count === 1 ? '' : 's'} this week</span>
      </div>
    </div>
  `;
}

async function castVote(songId) {
  if (!currentUser) return;
  const weekStart = getWeekStart();
  const { error } = await sb.from('song_votes').upsert(
    { user_id: currentUser.id, song_id: songId, week_start: weekStart },
    { onConflict: 'user_id,week_start' }
  );
  if (error) { alert(error.message); return; }
  renderSongs();
}

function editSong(song) {
  if (!song) return;
  switchView('admin');
  document.getElementById('editingSongId').value = song.id;
  document.getElementById('newSongTitle').value = song.title;
  document.getElementById('newSongArtist').value = song.artist;
  document.getElementById('songFormHeading').textContent = 'Editing song';
  document.getElementById('songSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelSongEdit').style.display = 'inline-block';
}

async function deleteSong(id) {
  if (!confirm('Delete this song? This cannot be undone.')) return;
  await sb.from('open_mic_songs').delete().eq('id', id);
  renderSongs();
}

document.getElementById('newSongForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newSongTitle').value.trim();
  const artist = document.getElementById('newSongArtist').value.trim();
  const editingId = document.getElementById('editingSongId').value;
  const fileInput = document.getElementById('newSongFile');
  const noteEl = document.getElementById('songUploadNote');
  const updates = { title, artist };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `songs/${Date.now()}-${file.name}`;
    noteEl.textContent = 'Uploading audio...';
    const { error: uploadError } = await sb.storage.from('site-files').upload(path, file);
    if (uploadError) { noteEl.textContent = 'Upload failed: ' + uploadError.message; return; }
    const { data: urlData } = sb.storage.from('site-files').getPublicUrl(path);
    updates.file_url = urlData.publicUrl;
  } else if (!editingId) {
    noteEl.textContent = 'Please choose an audio file.';
    return;
  }

  const coverInput = document.getElementById('newSongCover');
  if (coverInput.files && coverInput.files[0]) {
    const coverFile = coverInput.files[0];
    const coverPath = `songs-covers/${Date.now()}-${coverFile.name}`;
    noteEl.textContent = 'Uploading artwork...';
    const { error: coverError } = await sb.storage.from('site-images').upload(coverPath, coverFile);
    if (!coverError) {
      const { data: coverUrlData } = sb.storage.from('site-images').getPublicUrl(coverPath);
      updates.cover_url = coverUrlData.publicUrl;
    }
  }

  if (editingId) {
    await sb.from('open_mic_songs').update(updates).eq('id', editingId);
  } else {
    await sb.from('open_mic_songs').insert(updates);
  }
  noteEl.textContent = '';
  resetSongForm();
  renderSongs();
});

function resetSongForm() {
  document.getElementById('newSongForm').reset();
  document.getElementById('editingSongId').value = '';
  document.getElementById('songFormHeading').textContent = 'Upload a song/poetry';
  document.getElementById('songSubmitBtn').textContent = 'Upload';
  document.getElementById('cancelSongEdit').style.display = 'none';
  document.getElementById('songUploadNote').textContent = '';
}
document.getElementById('cancelSongEdit').addEventListener('click', resetSongForm);

// --- Song of the Week widget on Home ---
async function renderSongOfWeek() {
  const card = document.getElementById('songOfWeekCard');
  const { data, error } = await sb.rpc('get_latest_song_of_week');
  if (error || !data || data.length === 0) { card.style.display = 'none'; return; }

  const winner = data[0];
  const { data: song, error: songError } = await sb.from('open_mic_songs').select('*').eq('id', winner.song_id).single();
  if (songError || !song) { card.style.display = 'none'; return; }

  card.style.display = 'block';
  card.innerHTML = `
    <span class="song-of-week-card__label">Song of the Week</span>
    <h3>${escapeHtml(song.title)}</h3>
    <p class="artist">${escapeHtml(song.artist)}</p>
    <audio controls src="${escapeHtml(song.file_url)}"></audio>
    <p class="vote-count">${winner.vote_count} vote${winner.vote_count === 1 ? '' : 's'}</p>
  `;
}

// ==========================================================================
// TIMETABLE & ACADEMIC CALENDAR — shown directly on the page, no click needed
// ==========================================================================
async function renderDocument(docId, containerId) {
  const container = document.getElementById(containerId);
  const { data, error } = await sb.from('site_documents').select('*').eq('id', docId).maybeSingle();

  if (error || !data || !data.file_url) {
    container.innerHTML = `<p class="doc-viewer__empty">Nothing has been uploaded here yet.</p>`;
    return;
  }

  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(data.file_url)}&embedded=true`;
  container.innerHTML = `
    <iframe src="${viewerUrl}" title="Document"></iframe>
    <a class="doc-viewer__download" href="${escapeHtml(data.file_url)}" target="_blank" rel="noopener">Open in a new tab / download</a>
  `;
}

async function uploadDocument(docId, file, noteEl) {
  noteEl.textContent = 'Uploading...';
  const path = `documents/${docId}-${Date.now()}-${file.name}`;
  const { error: uploadError } = await sb.storage.from('site-files').upload(path, file);
  if (uploadError) { noteEl.textContent = 'Upload failed: ' + uploadError.message; return false; }
  const { data: urlData } = sb.storage.from('site-files').getPublicUrl(path);
  const { error: dbError } = await sb.from('site_documents').upsert({ id: docId, file_url: urlData.publicUrl, updated_at: new Date().toISOString() });
  if (dbError) { noteEl.textContent = 'Save failed: ' + dbError.message; return false; }
  noteEl.textContent = 'Uploaded successfully.';
  setTimeout(() => noteEl.textContent = '', 3000);
  return true;
}

document.getElementById('timetableUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('timetableFile');
  const noteEl = document.getElementById('timetableUploadNote');
  if (!fileInput.files[0]) return;
  const ok = await uploadDocument('timetable', fileInput.files[0], noteEl);
  if (ok) { e.target.reset(); renderDocument('timetable', 'timetableViewer'); }
});

document.getElementById('academicCalendarUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('academicCalendarFile');
  const noteEl = document.getElementById('academicCalendarUploadNote');
  if (!fileInput.files[0]) return;
  const ok = await uploadDocument('academic_calendar', fileInput.files[0], noteEl);
  if (ok) { e.target.reset(); renderDocument('academic_calendar', 'academicCalendarViewer'); }
});

// ==========================================================================
// SPORTS
// ==========================================================================
async function renderSports() {
  const container = document.getElementById('sportsList');
  const { data: sports, error } = await sb.from('sports').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = sports.map(s => `
    <div class="post-card">
      ${s.photo_url ? `<img src="${escapeHtml(s.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${escapeHtml(s.event_date)}</span>
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.body)}</p>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="sports-edit-btn" data-id="${s.id}">${ICON_EDIT} Edit</button>
        <button class="sports-delete-btn" data-id="${s.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.sports-edit-btn').forEach(btn => {
    const item = sports.find(x => x.id === btn.dataset.id);
    btn.addEventListener('click', () => editSports(item));
  });
  container.querySelectorAll('.sports-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteSports(btn.dataset.id));
  });
}

function editSports(item) {
  if (!item) return;
  switchView('admin');
  document.getElementById('editingSportsId').value = item.id;
  document.getElementById('newSportsTitle').value = item.title;
  document.getElementById('newSportsDate').value = item.event_date;
  document.getElementById('newSportsBody').value = item.body;
  document.getElementById('sportsFormHeading').textContent = 'Editing sports update';
  document.getElementById('sportsSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelSportsEdit').style.display = 'inline-block';
}

async function deleteSports(id) {
  if (!confirm('Delete this sports update? This cannot be undone.')) return;
  await sb.from('sports').delete().eq('id', id);
  renderSports();
  renderHomeHighlights();
}

document.getElementById('newSportsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newSportsTitle').value.trim();
  const event_date = document.getElementById('newSportsDate').value.trim();
  const body = document.getElementById('newSportsBody').value.trim();
  const editingId = document.getElementById('editingSportsId').value;
  const fileInput = document.getElementById('newSportsPhoto');
  const updates = { title, event_date, body };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `sports/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }

  if (editingId) {
    await sb.from('sports').update(updates).eq('id', editingId);
  } else {
    await sb.from('sports').insert(updates);
  }
  resetSportsForm();
  renderSports();
  renderHomeHighlights();
});

function resetSportsForm() {
  document.getElementById('newSportsForm').reset();
  document.getElementById('editingSportsId').value = '';
  document.getElementById('sportsFormHeading').textContent = 'Post a sports update';
  document.getElementById('sportsSubmitBtn').textContent = 'Publish';
  document.getElementById('cancelSportsEdit').style.display = 'none';
}
document.getElementById('cancelSportsEdit').addEventListener('click', resetSportsForm);

// ==========================================================================
// DOWNLOADS
// ==========================================================================
async function renderDownloads() {
  const container = document.getElementById('downloadsList');
  const { data: downloads, error } = await sb.from('downloads').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = downloads.map(d => `
    <div class="download-card">
      <div class="download-card__info">
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.description)}</p>
      </div>
      <a class="download-card__action" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">Download</a>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="download-edit-btn" data-id="${d.id}">${ICON_EDIT} Edit</button>
        <button class="download-delete-btn" data-id="${d.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.download-edit-btn').forEach(btn => {
    const item = downloads.find(x => x.id === btn.dataset.id);
    btn.addEventListener('click', () => editDownload(item));
  });
  container.querySelectorAll('.download-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteDownload(btn.dataset.id));
  });
}

function editDownload(item) {
  if (!item) return;
  switchView('admin');
  document.getElementById('editingDownloadId').value = item.id;
  document.getElementById('newDownloadTitle').value = item.title;
  document.getElementById('newDownloadDesc').value = item.description;
  document.getElementById('newDownloadUrl').value = item.url;
  document.getElementById('downloadFormHeading').textContent = 'Editing download';
  document.getElementById('downloadSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelDownloadEdit').style.display = 'inline-block';
}

async function deleteDownload(id) {
  if (!confirm('Delete this download? This cannot be undone.')) return;
  await sb.from('downloads').delete().eq('id', id);
  renderDownloads();
}

document.getElementById('newDownloadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newDownloadTitle').value.trim();
  const description = document.getElementById('newDownloadDesc').value.trim();
  let url = document.getElementById('newDownloadUrl').value.trim();
  const editingId = document.getElementById('editingDownloadId').value;
  const fileInput = document.getElementById('newDownloadFile');
  const noteEl = document.getElementById('downloadUploadNote');

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `downloads/${Date.now()}-${file.name}`;
    noteEl.textContent = 'Uploading file...';
    const { error: uploadError } = await sb.storage.from('site-files').upload(path, file);
    if (uploadError) { noteEl.textContent = 'Upload failed: ' + uploadError.message; return; }
    const { data: urlData } = sb.storage.from('site-files').getPublicUrl(path);
    url = urlData.publicUrl;
  }

  if (!url && !editingId) {
    noteEl.textContent = 'Please upload a file or paste a link.';
    return;
  }

  const updates = { title, description };
  if (url) updates.url = url;

  if (editingId) {
    await sb.from('downloads').update(updates).eq('id', editingId);
  } else {
    await sb.from('downloads').insert(updates);
  }
  noteEl.textContent = '';
  resetDownloadForm();
  renderDownloads();
});

function resetDownloadForm() {
  document.getElementById('newDownloadForm').reset();
  document.getElementById('editingDownloadId').value = '';
  document.getElementById('downloadFormHeading').textContent = 'Add a download';
  document.getElementById('downloadSubmitBtn').textContent = 'Add download';
  document.getElementById('cancelDownloadEdit').style.display = 'none';
  document.getElementById('downloadUploadNote').textContent = '';
}
document.getElementById('cancelDownloadEdit').addEventListener('click', resetDownloadForm);

// ==========================================================================
// STUDENT OF THE MOMENT (spotlight) + HOME HIGHLIGHTS
// ==========================================================================

// Generates a consistent color from a name, so the placeholder avatar always
// looks intentional rather than a random gray blank when there's no photo
function colorFromName(name) {
  const palette = ['#B8850F', '#10243E', '#6B8F71', '#8A4B3B', '#3A5A8C', '#7A5C9E'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
function initialsFromName(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

async function renderSpotlight() {
  const card = document.getElementById('spotlightCard');
  const { data: spotlight, error } = await sb.from('spotlight').select('*').eq('id', 1).single();
  if (error || !spotlight) { card.innerHTML = ''; return; }

  const photoHtml = spotlight.photo_url
    ? `<img class="spotlight-card__photo" src="${escapeHtml(spotlight.photo_url)}" alt="${escapeHtml(spotlight.name)}" />`
    : `<div class="spotlight-card__avatar" style="background:${colorFromName(spotlight.name || 'Student')};">${escapeHtml(initialsFromName(spotlight.name || 'S'))}</div>`;

  card.innerHTML = `
    ${photoHtml}
    <div class="spotlight-card__body">
      <span class="spotlight-card__label">Student of the moment</span>
      <h3>${escapeHtml(spotlight.name)}</h3>
      <p class="achievement">${escapeHtml(spotlight.achievement)}</p>
      ${spotlight.quote ? `<p>&ldquo;${escapeHtml(spotlight.quote)}&rdquo;</p>` : ''}
    </div>
  `;

  const nameField = document.getElementById('spotlightName');
  if (nameField) {
    nameField.value = spotlight.name;
    document.getElementById('spotlightAchievement').value = spotlight.achievement;
    document.getElementById('spotlightQuote').value = spotlight.quote || '';
  }
}

const spotlightFormEl = document.getElementById('spotlightForm');
if (spotlightFormEl) {
  spotlightFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('spotlightName').value.trim();
    const achievement = document.getElementById('spotlightAchievement').value.trim();
    const quote = document.getElementById('spotlightQuote').value.trim();
    const fileInput = document.getElementById('spotlightPhoto');
    const noteEl = document.getElementById('spotlightNote');
    const updates = { name, achievement, quote };

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop();
      const path = `spotlight/current.${ext}`;
      const { error: uploadError } = await sb.storage.from('site-images').upload(path, file, { upsert: true });
      if (uploadError) {
        noteEl.textContent = 'Photo upload failed: ' + uploadError.message;
        return;
      }
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      // add a cache-busting query so the new photo shows immediately, not a cached old one
      updates.photo_url = urlData.publicUrl + '?t=' + Date.now();
    }

    await sb.from('spotlight').update(updates).eq('id', 1);
    fileInput.value = '';
    noteEl.textContent = 'Spotlight updated.';
    setTimeout(() => noteEl.textContent = '', 3000);
    renderSpotlight();
  });
}

async function renderHomeHighlights() {
  const [{ data: posts }, { data: events }, { data: sports }] = await Promise.all([
    sb.from('posts').select('*').order('created_at', { ascending: false }).limit(1),
    sb.from('events').select('*').order('created_at', { ascending: false }).limit(1),
    sb.from('sports').select('*').order('created_at', { ascending: false }).limit(1)
  ]);

  function highlightHtml(item) {
    if (!item) return null;
    const photo = item.photo_url ? `<img src="${escapeHtml(item.photo_url)}" alt="" class="highlight-card__photo" />` : '';
    return `${photo}<h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.body)}</p>`;
  }

  const latestUpdateEl = document.getElementById('homeLatestUpdate');
  latestUpdateEl.innerHTML = (posts && posts[0]) ? highlightHtml(posts[0]) : '<p>No updates yet.</p>';

  const latestEventEl = document.getElementById('homeLatestEvent');
  latestEventEl.innerHTML = (events && events[0]) ? highlightHtml(events[0]) : '<p>No events or announcements yet.</p>';

  const latestSportsEl = document.getElementById('homeLatestSports');
  latestSportsEl.innerHTML = (sports && sports[0]) ? highlightHtml(sports[0]) : '<p>No sports news yet.</p>';
}

// ==========================================================================
// MESSAGE ADMIN (private, with replies)
// ==========================================================================
document.getElementById('messageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const textEl = document.getElementById('messageText');
  const text = textEl.value.trim();
  if (!text || !currentUser) return;

  await sb.from('messages').insert({
    from_user: currentUser.id, from_name: currentUser.name, from_email: currentUser.email, text
  });

  textEl.value = '';
  const note = document.getElementById('messageNote');
  note.textContent = 'Sent privately to the admin.';
  setTimeout(() => note.textContent = '', 3000);
  renderMyMessages();
});

// Shows a student their own past messages and any private reply from the admin
async function renderMyMessages() {
  const container = document.getElementById('myMessagesList');
  if (!container || !currentUser) return;

  const { data: messages, error } = await sb.from('messages')
    .select('*').eq('from_user', currentUser.id).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">You haven\'t sent any messages yet.</p>';
    return;
  }
  container.innerHTML = messages.map(m => `
    <div class="admin-msg">
      <div><strong>You:</strong> ${escapeHtml(m.text)}</div>
      <div class="meta">${new Date(m.created_at).toLocaleString()}</div>
      ${m.admin_reply ? `
        <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
          <strong style="color:var(--accent-dark);">Admin reply:</strong> ${escapeHtml(m.admin_reply)}
        </div>
      ` : `<p style="margin-top:8px; font-size:0.82rem; color:var(--text-muted); font-style:italic;">Awaiting a reply...</p>`}
    </div>
  `).join('');
}

async function renderAdminMessages() {
  const container = document.getElementById('adminMessagesList');
  const { data: messages, error } = await sb.from('messages').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No private messages yet.</p>';
    return;
  }
  container.innerHTML = messages.map(m => `
    <div class="admin-msg">
      <div>${escapeHtml(m.text)}</div>
      <div class="meta">From ${escapeHtml(m.from_name)} (${escapeHtml(m.from_email)}) &middot; ${new Date(m.created_at).toLocaleString()}</div>
      <form class="reply-form" data-id="${m.id}" style="margin-top:12px;">
        <textarea rows="2" placeholder="Write a private reply...">${escapeHtml(m.admin_reply || '')}</textarea>
        <div class="item-admin-controls" style="margin-top:8px;">
          <button type="submit" class="btn btn--primary" style="width:fit-content;">${m.admin_reply ? 'Update reply' : 'Send reply'}</button>
        </div>
      </form>
      <div class="item-admin-controls">
        <button class="message-delete-btn" data-id="${m.id}">${ICON_DELETE} Delete message</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.reply-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const textarea = form.querySelector('textarea');
      replyToMessage(form.dataset.id, textarea.value.trim());
    });
  });
  container.querySelectorAll('.message-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteMessage(btn.dataset.id));
  });
}

async function deleteMessage(id) {
  if (!confirm('Delete this message permanently? This cannot be undone.')) return;
  await sb.from('messages').delete().eq('id', id);
  renderAdminMessages();
}

async function replyToMessage(id, replyText) {
  if (!replyText) return;
  await sb.from('messages').update({ admin_reply: replyText, replied_at: new Date().toISOString() }).eq('id', id);
  renderAdminMessages();
}

// ==========================================================================
// REGISTERED USERS & ASSISTANT ADMIN MANAGEMENT
// ==========================================================================
async function renderRegisteredUsers() {
  const { data: users, error } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
  if (error) { console.error(error); return; }

  document.getElementById('userCount').textContent = users.length;
  const container = document.getElementById('registeredUsersList');
  container.innerHTML = users.map(u => `
    <div class="user-row">
      <span>${escapeHtml(u.name)} &middot; ${escapeHtml(u.email)}</span>
      <span class="role-tag ${u.role !== 'student' ? 'role-tag--admin' : ''}">${roleLabel(u.role)}</span>
    </div>
  `).join('');
}

async function renderAssistantAdminManager() {
  const { data: users, error } = await sb.from('profiles').select('*');
  if (error) { console.error(error); return; }

  const students = users.filter(u => u.role === 'student');
  const assistants = users.filter(u => u.role === 'assistant_admin');

  const select = document.getElementById('promoteStudentSelect');
  select.innerHTML = students.length
    ? students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.email)})</option>`).join('')
    : '<option value="">No students available</option>';

  const list = document.getElementById('assistantAdminsList');
  if (assistants.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No assistant admins yet.</p>';
  } else {
    list.innerHTML = assistants.map(a => `
      <div class="user-row">
        <span>${escapeHtml(a.name)} &middot; ${escapeHtml(a.email)}</span>
        <button class="btn-link remove-assistant-btn" data-id="${a.id}">Remove</button>
      </div>
    `).join('');
    list.querySelectorAll('.remove-assistant-btn').forEach(btn => {
      btn.addEventListener('click', () => demoteAssistantAdmin(btn.dataset.id));
    });
  }
}

document.getElementById('promoteBtn').addEventListener('click', async () => {
  const id = document.getElementById('promoteStudentSelect').value;
  if (!id) return;
  const { error } = await sb.from('profiles').update({ role: 'assistant_admin' }).eq('id', id);
  if (error) { alert(error.message); return; }
  renderAssistantAdminManager();
  renderRegisteredUsers();
});

async function demoteAssistantAdmin(id) {
  if (!confirm('Remove assistant admin access for this user?')) return;
  const { error } = await sb.from('profiles').update({ role: 'student' }).eq('id', id);
  if (error) { alert(error.message); return; }
  renderAssistantAdminManager();
  renderRegisteredUsers();
}

// ==========================================================================
// PROFILE / SETTINGS
// ==========================================================================
function fillProfileForm() {
  if (!currentUser) return;
  document.getElementById('profileName').value = currentUser.name || '';
  document.getElementById('profileBio').value = currentUser.bio || '';
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newName = document.getElementById('profileName').value.trim();
  const newBio = document.getElementById('profileBio').value.trim();

  const { error } = await sb.from('profiles').update({ name: newName, bio: newBio }).eq('id', currentUser.id);
  const note = document.getElementById('profileNote');
  if (error) { note.textContent = error.message; return; }

  currentUser.name = newName;
  currentUser.bio = newBio;
  document.getElementById('homeUserName').textContent = ', ' + currentUser.name.split(' ')[0];

  note.textContent = 'Profile updated.';
  setTimeout(() => note.textContent = '', 3000);
});

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('passwordError');
  showError(errorEl, '');

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showError(errorEl, 'New passwords do not match.');
    return;
  }

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) { showError(errorEl, error.message); return; }

  e.target.reset();
  alert('Password updated successfully.');
});

// ==========================================================================
// THEME (dark / light mode)
// ==========================================================================
function syncThemeSwitchUI() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('themeSwitch').setAttribute('aria-pressed', String(isDark));
}

document.getElementById('themeSwitch').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
  }
  syncThemeSwitchUI();
});

syncThemeSwitchUI();
