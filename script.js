// ==========================================================================
// Namitete Tech Student Portal — app logic
//
// IMPORTANT LIMITATION: this uses the browser's localStorage as a stand-in
// database. That means data only lives on the device/browser it was created
// on — it will not sync between different students' phones or computers.
// It's ideal for demoing and testing the whole flow. To go live with real
// students, this data layer needs to be swapped for a real backend
// (e.g. Firebase, Supabase, or a custom server + database).
// ==========================================================================

const STORAGE_KEYS = {
  users: 'nt_users',
  currentUser: 'nt_currentUser',
  posts: 'nt_posts',
  events: 'nt_events',
  books: 'nt_books',
  listings: 'nt_listings',
  messages: 'nt_messages',
  sports: 'nt_sports',
  downloads: 'nt_downloads',
  spotlight: 'nt_spotlight',
  theme: 'nt_theme'
};

// --- Small inline SVG icons, used instead of emoji throughout the UI ---
const ICON_EDIT = `<svg class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 3.5L16.5 6.5M2.5 17.5L3.2 14.2C3.3 13.7 3.55 13.25 3.9 12.9L12.4 4.4C13 3.8 14 3.8 14.6 4.4L15.6 5.4C16.2 6 16.2 7 15.6 7.6L7.1 16.1C6.75 16.45 6.3 16.7 5.8 16.8L2.5 17.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_DELETE = `<svg class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5.5H17M8 5.5V3.8C8 3.35 8.35 3 8.8 3H11.2C11.65 3 12 3.35 12 3.8V5.5M14.5 5.5V16C14.5 16.55 14.05 17 13.5 17H6.5C5.95 17 5.5 16.55 5.5 16V5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.3 8.7V13.3M11.7 8.7V13.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const ICON_LIKE = `<svg class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 8.5V16.5H4.5C4 16.5 3.5 16 3.5 15.5V9.5C3.5 9 4 8.5 4.5 8.5H7.5ZM7.5 8.5L10.7 3.3C10.9 3 11.3 2.9 11.6 3.1C12.3 3.5 12.7 4.3 12.5 5.1L11.8 8H15.2C16 8 16.6 8.75 16.4 9.5L15 15C14.85 15.6 14.3 16 13.7 16H7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_MENU = `<svg class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

function load(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Seed default data on first run ---
function seedIfEmpty() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    save(STORAGE_KEYS.users, [
      { name: 'Admin', email: 'admin@namitetetech.edu.mw', password: 'admin123', role: 'admin' }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.posts)) {
    save(STORAGE_KEYS.posts, [
      {
        id: cryptoId(), title: '2026 intake applications now open', date: 'Jun 2026',
        body: 'Applications for the new academic year are open across all programs.',
        likes: [], comments: []
      },
      {
        id: cryptoId(), title: 'New computer lab commissioned', date: 'May 2026',
        body: '50 new workstations added to support the growing IT department.',
        likes: [], comments: []
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.events)) {
    save(STORAGE_KEYS.events, [
      {
        id: cryptoId(), title: 'Orientation week for new students', date: '20 July 2026',
        body: 'All new intake students should report to the main hall at 8:00 AM for orientation.'
      },
      {
        id: cryptoId(), title: 'Career fair', date: '2 August 2026',
        body: 'Local employers will be on campus to meet final-year students. Bring your CV.'
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.sports)) {
    save(STORAGE_KEYS.sports, [
      {
        id: cryptoId(), title: 'Namitete Tech wins regional football cup', date: '10 July 2026',
        body: 'Our football team beat Kasungu Vocational College 2-1 in the regional final.'
      },
      {
        id: cryptoId(), title: 'Netball tryouts announced', date: '18 July 2026',
        body: 'Open tryouts for the netball team will be held at the main field this weekend.'
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.downloads)) {
    save(STORAGE_KEYS.downloads, [
      { id: cryptoId(), title: 'Application Form', description: 'Official 2026 intake application form.', url: 'https://example.com/application-form.pdf' },
      { id: cryptoId(), title: 'Fee Structure', description: 'Full breakdown of fees per program.', url: 'https://example.com/fee-structure.pdf' }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.spotlight)) {
    save(STORAGE_KEYS.spotlight, {
      name: 'Grace Chirwa',
      achievement: 'Top graduate, Computer Science & IT, 2026',
      quote: 'This college gave me the practical skills I needed to get hired before I even graduated.'
    });
  }
  if (!localStorage.getItem(STORAGE_KEYS.books)) {
    save(STORAGE_KEYS.books, [
      { id: cryptoId(), title: 'Basic Electrical Principles', author: 'J. Mwale', description: 'Foundations of circuits, wiring, and safety.' },
      { id: cryptoId(), title: 'Introduction to Programming', author: 'T. Banda', description: 'Core programming logic using simple examples.' },
      { id: cryptoId(), title: 'Automotive Systems Handbook', author: 'F. Phiri', description: 'Engines, transmissions, and diagnostics.' }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.listings)) {
    save(STORAGE_KEYS.listings, [
      { id: cryptoId(), title: 'Single room near main gate', price: 'MK 35,000/month', contact: '+265 991 234 567', description: '5 min walk to campus, shared bathroom.' },
      { id: cryptoId(), title: '2-bedroom house, Chigwirizano', price: 'MK 70,000/month', contact: '+265 888 765 432', description: 'Good for 2-3 students sharing, water included.' }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.messages)) {
    save(STORAGE_KEYS.messages, []);
  }
}

function cryptoId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

seedIfEmpty();
document.getElementById('footerYear').textContent = new Date().getFullYear();

// --- Apply saved theme immediately, even before login (affects public landing page too) ---
const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

// ==========================================================================
// AUTH
// ==========================================================================
const authBackdrop = document.getElementById('authBackdrop');
const loginPane = document.getElementById('loginPane');
const signupPane = document.getElementById('signupPane');

function openAuth() { authBackdrop.classList.add('open'); }
function closeAuth() { authBackdrop.classList.remove('open'); }

document.getElementById('loginNavBtn').addEventListener('click', openAuth);
document.getElementById('heroLoginBtn').addEventListener('click', openAuth);
document.getElementById('authClose').addEventListener('click', closeAuth);
authBackdrop.addEventListener('click', (e) => { if (e.target === authBackdrop) closeAuth(); });

document.getElementById('showSignup').addEventListener('click', (e) => {
  e.preventDefault(); loginPane.style.display = 'none'; signupPane.style.display = 'block';
});
document.getElementById('showLogin').addEventListener('click', (e) => {
  e.preventDefault(); signupPane.style.display = 'none'; loginPane.style.display = 'block';
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const users = load(STORAGE_KEYS.users, []);
  const user = users.find(u => u.email.toLowerCase() === email && u.password === password);
  const errorEl = document.getElementById('loginError');

  if (!user) {
    errorEl.textContent = 'Incorrect email or password.';
    return;
  }
  errorEl.textContent = '';
  save(STORAGE_KEYS.currentUser, user);
  closeAuth();
  enterApp();
});

document.getElementById('signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const users = load(STORAGE_KEYS.users, []);
  const errorEl = document.getElementById('signupError');

  if (users.some(u => u.email.toLowerCase() === email)) {
    errorEl.textContent = 'An account with this email already exists.';
    return;
  }
  const newUser = { name, email, password, role: 'student' };
  users.push(newUser);
  save(STORAGE_KEYS.users, users);
  save(STORAGE_KEYS.currentUser, newUser);
  errorEl.textContent = '';
  closeAuth();
  enterApp();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  document.getElementById('appView').style.display = 'none';
  document.getElementById('publicView').style.display = 'block';
  document.getElementById('navRight').innerHTML = '<button class="btn btn--ghost" id="loginNavBtn">Log in</button>';
  document.getElementById('loginNavBtn').addEventListener('click', openAuth);
});

// ==========================================================================
// APP ENTRY
// ==========================================================================
function enterApp() {
  const user = load(STORAGE_KEYS.currentUser, null);
  if (!user) return;

  document.getElementById('publicView').style.display = 'none';
  document.getElementById('appView').style.display = 'block';
  document.getElementById('navRight').innerHTML = '';
  document.getElementById('sidebarUserName').textContent = user.name + (user.role !== 'student' ? ' (' + roleLabel(user.role) + ')' : '');
  document.getElementById('homeUserName').textContent = ', ' + user.name.split(' ')[0];
  document.getElementById('adminNavLink').style.display = canManageContent(user) ? 'block' : 'none';
  document.getElementById('assistantAdminSection').style.display = user.role === 'admin' ? 'block' : 'none';

  renderPosts();
  renderEvents();
  renderBooks();
  renderListings();
  renderSports();
  renderDownloads();
  renderSpotlight();
  renderHomeHighlights();
  fillProfileForm();
  if (canManageContent(user)) {
    renderAdminMessages();
    renderRegisteredUsers();
  }
  if (user.role === 'admin') {
    renderAssistantAdminManager();
  }
}

// --- Role helpers ---
function canManageContent(user) {
  return !!user && (user.role === 'admin' || user.role === 'assistant_admin');
}
function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'assistant_admin') return 'Assistant Admin';
  return 'Student';
}

// --- View switching (works for sidebar links AND home-page quick cards) ---
function switchView(viewName) {
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
  const matchingLink = document.querySelector(`.sidebar__link[data-view="${viewName}"]`);
  if (matchingLink) matchingLink.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + viewName).style.display = 'block';
  // collapse mobile menu after choosing a view
  document.getElementById('sidebarNav').classList.remove('open');
}

document.querySelectorAll('.sidebar__link').forEach(link => {
  link.addEventListener('click', () => switchView(link.dataset.view));
});
document.querySelectorAll('.home-card').forEach(card => {
  card.addEventListener('click', () => switchView(card.dataset.view));
});

// --- Mobile menu toggle ---
document.getElementById('sidebarMenuToggle').addEventListener('click', () => {
  document.getElementById('sidebarNav').classList.toggle('open');
});

// ==========================================================================
// UPDATES / POSTS
// ==========================================================================
function renderPosts() {
  const posts = load(STORAGE_KEYS.posts, []);
  const user = load(STORAGE_KEYS.currentUser, null);
  const container = document.getElementById('postsList');
  container.innerHTML = '';

  posts.slice().reverse().forEach(post => {
    const liked = user && post.likes.includes(user.email);
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <span class="post-card__date">${post.date}</span>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.body)}</p>
      <div class="post-card__actions">
        <button class="like-btn ${liked ? 'liked' : ''}" data-id="${post.id}">${ICON_LIKE} ${post.likes.length} Like${post.likes.length === 1 ? '' : 's'}</button>
        <span style="font-size:0.85rem; color:var(--text-muted);">${post.comments.length} comment${post.comments.length === 1 ? '' : 's'}</span>
      </div>
      <div class="comment-list">
        ${post.comments.map(c => `<div class="comment-item"><strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(c.text)}</div>`).join('')}
      </div>
      <form class="comment-form" data-id="${post.id}">
        <input type="text" placeholder="Write a comment..." required />
        <button type="submit">Post</button>
      </form>
      ${canManageContent(user) ? `
      <div class="item-admin-controls">
        <button class="edit-btn" data-id="${post.id}">${ICON_EDIT} Edit</button>
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
    btn.addEventListener('click', () => editPost(btn.dataset.id));
  });
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePost(btn.dataset.id));
  });
}

function editPost(id) {
  const posts = load(STORAGE_KEYS.posts, []);
  const post = posts.find(p => p.id === id);
  if (!post) return;
  switchView('admin');
  document.getElementById('editingPostId').value = post.id;
  document.getElementById('newPostTitle').value = post.title;
  document.getElementById('newPostBody').value = post.body;
  document.getElementById('postFormHeading').textContent = 'Editing update';
  document.getElementById('postSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelPostEdit').style.display = 'inline-block';
}

function deletePost(id) {
  if (!confirm('Delete this update? This cannot be undone.')) return;
  let posts = load(STORAGE_KEYS.posts, []);
  posts = posts.filter(p => p.id !== id);
  save(STORAGE_KEYS.posts, posts);
  renderPosts();
}

function toggleLike(postId) {
  const user = load(STORAGE_KEYS.currentUser, null);
  if (!user) return;
  const posts = load(STORAGE_KEYS.posts, []);
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  const idx = post.likes.indexOf(user.email);
  if (idx === -1) post.likes.push(user.email); else post.likes.splice(idx, 1);
  save(STORAGE_KEYS.posts, posts);
  renderPosts();
}

function addComment(postId, text) {
  if (!text) return;
  const user = load(STORAGE_KEYS.currentUser, null);
  const posts = load(STORAGE_KEYS.posts, []);
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.comments.push({ name: user.name, text });
  save(STORAGE_KEYS.posts, posts);
  renderPosts();
}

// ==========================================================================
// EVENTS & ANNOUNCEMENTS
// ==========================================================================
function renderEvents() {
  const events = load(STORAGE_KEYS.events, []);
  const user = load(STORAGE_KEYS.currentUser, null);
  const container = document.getElementById('eventsList');
  container.innerHTML = events.slice().reverse().map(ev => `
    <div class="post-card">
      <span class="post-card__date">${escapeHtml(ev.date)}</span>
      <h3>${escapeHtml(ev.title)}</h3>
      <p>${escapeHtml(ev.body)}</p>
      ${canManageContent(user) ? `
      <div class="item-admin-controls">
        <button class="event-edit-btn" data-id="${ev.id}">${ICON_EDIT} Edit</button>
        <button class="event-delete-btn" data-id="${ev.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.event-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editEvent(btn.dataset.id));
  });
  container.querySelectorAll('.event-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
  });
}

function editEvent(id) {
  const events = load(STORAGE_KEYS.events, []);
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  switchView('admin');
  document.getElementById('editingEventId').value = ev.id;
  document.getElementById('newEventTitle').value = ev.title;
  document.getElementById('newEventDate').value = ev.date;
  document.getElementById('newEventBody').value = ev.body;
  document.getElementById('eventFormHeading').textContent = 'Editing event/announcement';
  document.getElementById('eventSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelEventEdit').style.display = 'inline-block';
}

function deleteEvent(id) {
  if (!confirm('Delete this event/announcement? This cannot be undone.')) return;
  let events = load(STORAGE_KEYS.events, []);
  events = events.filter(e => e.id !== id);
  save(STORAGE_KEYS.events, events);
  renderEvents();
}

document.getElementById('newEventForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('newEventTitle').value.trim();
  const date = document.getElementById('newEventDate').value.trim();
  const body = document.getElementById('newEventBody').value.trim();
  const editingId = document.getElementById('editingEventId').value;
  const events = load(STORAGE_KEYS.events, []);

  if (editingId) {
    const ev = events.find(e => e.id === editingId);
    if (ev) { ev.title = title; ev.date = date; ev.body = body; }
  } else {
    events.push({ id: cryptoId(), title, date, body });
  }
  save(STORAGE_KEYS.events, events);
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
// LIBRARY
// ==========================================================================
function renderBooks() {
  const books = load(STORAGE_KEYS.books, []);
  const user = load(STORAGE_KEYS.currentUser, null);
  const grid = document.getElementById('bookGrid');
  grid.innerHTML = books.map(b => `
    <div class="book-card">
      <div class="book-card__cover"></div>
      <h3>${escapeHtml(b.title)}</h3>
      <p class="author">${escapeHtml(b.author)}</p>
      <p>${escapeHtml(b.description)}</p>
      ${canManageContent(user) ? `
      <div class="item-admin-controls">
        <button class="book-edit-btn" data-id="${b.id}">${ICON_EDIT} Edit</button>
        <button class="book-delete-btn" data-id="${b.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  grid.querySelectorAll('.book-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editBook(btn.dataset.id));
  });
  grid.querySelectorAll('.book-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteBook(btn.dataset.id));
  });
}

function editBook(id) {
  const books = load(STORAGE_KEYS.books, []);
  const book = books.find(b => b.id === id);
  if (!book) return;
  switchView('admin');
  document.getElementById('editingBookId').value = book.id;
  document.getElementById('newBookTitle').value = book.title;
  document.getElementById('newBookAuthor').value = book.author;
  document.getElementById('newBookDesc').value = book.description;
  document.getElementById('bookFormHeading').textContent = 'Editing book';
  document.getElementById('bookSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelBookEdit').style.display = 'inline-block';
}

function deleteBook(id) {
  if (!confirm('Delete this book? This cannot be undone.')) return;
  let books = load(STORAGE_KEYS.books, []);
  books = books.filter(b => b.id !== id);
  save(STORAGE_KEYS.books, books);
  renderBooks();
}

// ==========================================================================
// ACCOMMODATION
// ==========================================================================
function renderListings() {
  const listings = load(STORAGE_KEYS.listings, []);
  const user = load(STORAGE_KEYS.currentUser, null);
  const grid = document.getElementById('listingGrid');
  grid.innerHTML = listings.map(l => `
    <div class="listing-card">
      <h3>${escapeHtml(l.title)}</h3>
      <p class="price">${escapeHtml(l.price)}</p>
      <p>${escapeHtml(l.description)}</p>
      <p class="contact">${escapeHtml(l.contact)}</p>
      ${canManageContent(user) ? `
      <div class="item-admin-controls">
        <button class="listing-edit-btn" data-id="${l.id}">${ICON_EDIT} Edit</button>
        <button class="listing-delete-btn" data-id="${l.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  grid.querySelectorAll('.listing-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editListing(btn.dataset.id));
  });
  grid.querySelectorAll('.listing-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteListing(btn.dataset.id));
  });
}

function editListing(id) {
  const listings = load(STORAGE_KEYS.listings, []);
  const listing = listings.find(l => l.id === id);
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

function deleteListing(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  let listings = load(STORAGE_KEYS.listings, []);
  listings = listings.filter(l => l.id !== id);
  save(STORAGE_KEYS.listings, listings);
  renderListings();
}

// ==========================================================================
// SPORTS
// ==========================================================================
function renderSports() {
  const sports = load(STORAGE_KEYS.sports, []);
  const user = load(STORAGE_KEYS.currentUser, null);
  const container = document.getElementById('sportsList');
  container.innerHTML = sports.slice().reverse().map(s => `
    <div class="post-card">
      <span class="post-card__date">${escapeHtml(s.date)}</span>
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.body)}</p>
      ${canManageContent(user) ? `
      <div class="item-admin-controls">
        <button class="sports-edit-btn" data-id="${s.id}">${ICON_EDIT} Edit</button>
        <button class="sports-delete-btn" data-id="${s.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.sports-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editSports(btn.dataset.id));
  });
  container.querySelectorAll('.sports-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteSports(btn.dataset.id));
  });
}

function editSports(id) {
  const sports = load(STORAGE_KEYS.sports, []);
  const item = sports.find(s => s.id === id);
  if (!item) return;
  switchView('admin');
  document.getElementById('editingSportsId').value = item.id;
  document.getElementById('newSportsTitle').value = item.title;
  document.getElementById('newSportsDate').value = item.date;
  document.getElementById('newSportsBody').value = item.body;
  document.getElementById('sportsFormHeading').textContent = 'Editing sports update';
  document.getElementById('sportsSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelSportsEdit').style.display = 'inline-block';
}

function deleteSports(id) {
  if (!confirm('Delete this sports update? This cannot be undone.')) return;
  let sports = load(STORAGE_KEYS.sports, []);
  sports = sports.filter(s => s.id !== id);
  save(STORAGE_KEYS.sports, sports);
  renderSports();
  renderHomeHighlights();
}

document.getElementById('newSportsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('newSportsTitle').value.trim();
  const date = document.getElementById('newSportsDate').value.trim();
  const body = document.getElementById('newSportsBody').value.trim();
  const editingId = document.getElementById('editingSportsId').value;
  const sports = load(STORAGE_KEYS.sports, []);

  if (editingId) {
    const item = sports.find(s => s.id === editingId);
    if (item) { item.title = title; item.date = date; item.body = body; }
  } else {
    sports.push({ id: cryptoId(), title, date, body });
  }
  save(STORAGE_KEYS.sports, sports);
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
function renderDownloads() {
  const downloads = load(STORAGE_KEYS.downloads, []);
  const user = load(STORAGE_KEYS.currentUser, null);
  const container = document.getElementById('downloadsList');
  container.innerHTML = downloads.map(d => `
    <div class="download-card">
      <div class="download-card__info">
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.description)}</p>
      </div>
      <a class="download-card__action" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">Download</a>
      ${canManageContent(user) ? `
      <div class="item-admin-controls">
        <button class="download-edit-btn" data-id="${d.id}">${ICON_EDIT} Edit</button>
        <button class="download-delete-btn" data-id="${d.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.download-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editDownload(btn.dataset.id));
  });
  container.querySelectorAll('.download-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteDownload(btn.dataset.id));
  });
}

function editDownload(id) {
  const downloads = load(STORAGE_KEYS.downloads, []);
  const item = downloads.find(d => d.id === id);
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

function deleteDownload(id) {
  if (!confirm('Delete this download? This cannot be undone.')) return;
  let downloads = load(STORAGE_KEYS.downloads, []);
  downloads = downloads.filter(d => d.id !== id);
  save(STORAGE_KEYS.downloads, downloads);
  renderDownloads();
}

document.getElementById('newDownloadForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('newDownloadTitle').value.trim();
  const description = document.getElementById('newDownloadDesc').value.trim();
  const url = document.getElementById('newDownloadUrl').value.trim();
  const editingId = document.getElementById('editingDownloadId').value;
  const downloads = load(STORAGE_KEYS.downloads, []);

  if (editingId) {
    const item = downloads.find(d => d.id === editingId);
    if (item) { item.title = title; item.description = description; item.url = url; }
  } else {
    downloads.push({ id: cryptoId(), title, description, url });
  }
  save(STORAGE_KEYS.downloads, downloads);
  resetDownloadForm();
  renderDownloads();
});

function resetDownloadForm() {
  document.getElementById('newDownloadForm').reset();
  document.getElementById('editingDownloadId').value = '';
  document.getElementById('downloadFormHeading').textContent = 'Add a download';
  document.getElementById('downloadSubmitBtn').textContent = 'Add download';
  document.getElementById('cancelDownloadEdit').style.display = 'none';
}
document.getElementById('cancelDownloadEdit').addEventListener('click', resetDownloadForm);

// ==========================================================================
// STUDENT OF THE MOMENT (spotlight) + HOME HIGHLIGHTS
// ==========================================================================
function renderSpotlight() {
  const spotlight = load(STORAGE_KEYS.spotlight, null);
  const card = document.getElementById('spotlightCard');
  if (!spotlight) { card.innerHTML = ''; return; }
  card.innerHTML = `
    <span class="spotlight-card__label">Student of the moment</span>
    <h3>${escapeHtml(spotlight.name)}</h3>
    <p class="achievement">${escapeHtml(spotlight.achievement)}</p>
    ${spotlight.quote ? `<p>&ldquo;${escapeHtml(spotlight.quote)}&rdquo;</p>` : ''}
  `;

  // Pre-fill the admin spotlight form so editing feels natural
  const nameField = document.getElementById('spotlightName');
  if (nameField) {
    nameField.value = spotlight.name;
    document.getElementById('spotlightAchievement').value = spotlight.achievement;
    document.getElementById('spotlightQuote').value = spotlight.quote || '';
  }
}

const spotlightFormEl = document.getElementById('spotlightForm');
if (spotlightFormEl) {
  spotlightFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const spotlight = {
      name: document.getElementById('spotlightName').value.trim(),
      achievement: document.getElementById('spotlightAchievement').value.trim(),
      quote: document.getElementById('spotlightQuote').value.trim()
    };
    save(STORAGE_KEYS.spotlight, spotlight);
    renderSpotlight();
  });
}

function renderHomeHighlights() {
  const posts = load(STORAGE_KEYS.posts, []);
  const sports = load(STORAGE_KEYS.sports, []);

  const latestUpdateEl = document.getElementById('homeLatestUpdate');
  if (posts.length === 0) {
    latestUpdateEl.innerHTML = '<p>No updates yet.</p>';
  } else {
    const latest = posts[posts.length - 1];
    latestUpdateEl.innerHTML = `<h4>${escapeHtml(latest.title)}</h4><p>${escapeHtml(latest.body)}</p>`;
  }

  const latestSportsEl = document.getElementById('homeLatestSports');
  if (sports.length === 0) {
    latestSportsEl.innerHTML = '<p>No sports news yet.</p>';
  } else {
    const latest = sports[sports.length - 1];
    latestSportsEl.innerHTML = `<h4>${escapeHtml(latest.title)}</h4><p>${escapeHtml(latest.body)}</p>`;
  }
}

// ==========================================================================
// MESSAGE ADMIN (private)
// ==========================================================================
document.getElementById('messageForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = load(STORAGE_KEYS.currentUser, null);
  const textEl = document.getElementById('messageText');
  const text = textEl.value.trim();
  if (!text) return;

  const messages = load(STORAGE_KEYS.messages, []);
  messages.push({ id: cryptoId(), from: user.name, email: user.email, text, date: new Date().toLocaleString() });
  save(STORAGE_KEYS.messages, messages);

  textEl.value = '';
  const note = document.getElementById('messageNote');
  note.textContent = 'Sent privately to the admin.';
  setTimeout(() => note.textContent = '', 3000);
});

// ==========================================================================
// ADMIN PANEL
// ==========================================================================
document.getElementById('newPostForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('newPostTitle').value.trim();
  const body = document.getElementById('newPostBody').value.trim();
  const editingId = document.getElementById('editingPostId').value;
  const posts = load(STORAGE_KEYS.posts, []);

  if (editingId) {
    const post = posts.find(p => p.id === editingId);
    if (post) { post.title = title; post.body = body; }
  } else {
    posts.push({
      id: cryptoId(), title, body,
      date: new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      likes: [], comments: []
    });
  }
  save(STORAGE_KEYS.posts, posts);
  resetPostForm();
  renderPosts();
});

function resetPostForm() {
  document.getElementById('newPostForm').reset();
  document.getElementById('editingPostId').value = '';
  document.getElementById('postFormHeading').textContent = 'Post an update';
  document.getElementById('postSubmitBtn').textContent = 'Publish';
  document.getElementById('cancelPostEdit').style.display = 'none';
}
document.getElementById('cancelPostEdit').addEventListener('click', resetPostForm);

document.getElementById('newBookForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('newBookTitle').value.trim();
  const author = document.getElementById('newBookAuthor').value.trim();
  const description = document.getElementById('newBookDesc').value.trim();
  const editingId = document.getElementById('editingBookId').value;
  const books = load(STORAGE_KEYS.books, []);

  if (editingId) {
    const book = books.find(b => b.id === editingId);
    if (book) { book.title = title; book.author = author; book.description = description; }
  } else {
    books.push({ id: cryptoId(), title, author, description });
  }
  save(STORAGE_KEYS.books, books);
  resetBookForm();
  renderBooks();
});

function resetBookForm() {
  document.getElementById('newBookForm').reset();
  document.getElementById('editingBookId').value = '';
  document.getElementById('bookFormHeading').textContent = 'Add a library book';
  document.getElementById('bookSubmitBtn').textContent = 'Add book';
  document.getElementById('cancelBookEdit').style.display = 'none';
}
document.getElementById('cancelBookEdit').addEventListener('click', resetBookForm);

document.getElementById('newListingForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('newListingTitle').value.trim();
  const price = document.getElementById('newListingPrice').value.trim();
  const contact = document.getElementById('newListingContact').value.trim();
  const description = document.getElementById('newListingDesc').value.trim();
  const editingId = document.getElementById('editingListingId').value;
  const listings = load(STORAGE_KEYS.listings, []);

  if (editingId) {
    const listing = listings.find(l => l.id === editingId);
    if (listing) { listing.title = title; listing.price = price; listing.contact = contact; listing.description = description; }
  } else {
    listings.push({ id: cryptoId(), title, price, contact, description });
  }
  save(STORAGE_KEYS.listings, listings);
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

function renderAdminMessages() {
  const messages = load(STORAGE_KEYS.messages, []);
  const container = document.getElementById('adminMessagesList');
  if (messages.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No private messages yet.</p>';
    return;
  }
  container.innerHTML = messages.slice().reverse().map(m => `
    <div class="admin-msg">
      <div>${escapeHtml(m.text)}</div>
      <div class="meta">From ${escapeHtml(m.from)} (${escapeHtml(m.email)}) &middot; ${m.date}</div>
    </div>
  `).join('');
}

// --- Registered users (visible name/email only, never passwords) ---
function renderRegisteredUsers() {
  const users = load(STORAGE_KEYS.users, []);
  document.getElementById('userCount').textContent = users.length;
  const container = document.getElementById('registeredUsersList');
  container.innerHTML = users.map(u => `
    <div class="user-row">
      <span>${escapeHtml(u.name)} &middot; ${escapeHtml(u.email)}</span>
      <span class="role-tag ${u.role !== 'student' ? 'role-tag--admin' : ''}">${roleLabel(u.role)}</span>
    </div>
  `).join('');
}

// --- Assistant admin management (super admin only) ---
function renderAssistantAdminManager() {
  const users = load(STORAGE_KEYS.users, []);
  const students = users.filter(u => u.role === 'student');
  const assistants = users.filter(u => u.role === 'assistant_admin');

  const select = document.getElementById('promoteStudentSelect');
  if (students.length === 0) {
    select.innerHTML = '<option value="">No students available</option>';
  } else {
    select.innerHTML = students.map(s => `<option value="${escapeHtml(s.email)}">${escapeHtml(s.name)} (${escapeHtml(s.email)})</option>`).join('');
  }

  const list = document.getElementById('assistantAdminsList');
  if (assistants.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No assistant admins yet.</p>';
  } else {
    list.innerHTML = assistants.map(a => `
      <div class="user-row">
        <span>${escapeHtml(a.name)} &middot; ${escapeHtml(a.email)}</span>
        <button class="btn-link remove-assistant-btn" data-email="${escapeHtml(a.email)}">Remove</button>
      </div>
    `).join('');
    list.querySelectorAll('.remove-assistant-btn').forEach(btn => {
      btn.addEventListener('click', () => demoteAssistantAdmin(btn.dataset.email));
    });
  }
}

document.getElementById('promoteBtn').addEventListener('click', () => {
  const email = document.getElementById('promoteStudentSelect').value;
  if (!email) return;
  const users = load(STORAGE_KEYS.users, []);
  const target = users.find(u => u.email === email);
  if (!target || target.role === 'admin') return; // extra safety: never touches the real admin
  target.role = 'assistant_admin';
  save(STORAGE_KEYS.users, users);
  renderAssistantAdminManager();
  renderRegisteredUsers();
});

function demoteAssistantAdmin(email) {
  const users = load(STORAGE_KEYS.users, []);
  const target = users.find(u => u.email === email);
  if (!target || target.role === 'admin') return; // the real admin can never be touched here
  if (!confirm(`Remove assistant admin access for ${target.name}?`)) return;
  target.role = 'student';
  save(STORAGE_KEYS.users, users);
  renderAssistantAdminManager();
  renderRegisteredUsers();
}

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
    localStorage.setItem(STORAGE_KEYS.theme, 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(STORAGE_KEYS.theme, 'dark');
  }
  syncThemeSwitchUI();
});

syncThemeSwitchUI();

// ==========================================================================
// PROFILE
// ==========================================================================
function fillProfileForm() {
  const user = load(STORAGE_KEYS.currentUser, null);
  if (!user) return;
  document.getElementById('profileName').value = user.name || '';
  document.getElementById('profileBio').value = user.bio || '';
}

document.getElementById('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = load(STORAGE_KEYS.currentUser, null);
  const users = load(STORAGE_KEYS.users, []);
  const newName = document.getElementById('profileName').value.trim();
  const newBio = document.getElementById('profileBio').value.trim();

  user.name = newName;
  user.bio = newBio;
  save(STORAGE_KEYS.currentUser, user);

  const idx = users.findIndex(u => u.email === user.email);
  if (idx !== -1) { users[idx] = user; save(STORAGE_KEYS.users, users); }

  document.getElementById('sidebarUserName').textContent = user.name + (user.role !== 'student' ? ' (' + roleLabel(user.role) + ')' : '');
  document.getElementById('homeUserName').textContent = ', ' + user.name.split(' ')[0];

  const note = document.getElementById('profileNote');
  note.textContent = 'Profile updated.';
  setTimeout(() => note.textContent = '', 3000);
});

document.getElementById('passwordForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = load(STORAGE_KEYS.currentUser, null);
  const users = load(STORAGE_KEYS.users, []);
  const errorEl = document.getElementById('passwordError');

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (currentPassword !== user.password) {
    errorEl.textContent = 'Current password is incorrect.';
    return;
  }
  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'New passwords do not match.';
    return;
  }

  user.password = newPassword;
  save(STORAGE_KEYS.currentUser, user);
  const idx = users.findIndex(u => u.email === user.email);
  if (idx !== -1) { users[idx] = user; save(STORAGE_KEYS.users, users); }

  errorEl.textContent = '';
  e.target.reset();
  alert('Password updated successfully.');
});

// ==========================================================================
// UTIL
// ==========================================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Resume session if already logged in ---
if (load(STORAGE_KEYS.currentUser, null)) {
  enterApp();
}
