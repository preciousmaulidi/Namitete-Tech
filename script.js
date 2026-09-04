// ==========================================================================
// Namitete Co-Students — app logic (Supabase-backed)
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

// --- Nav icons, one per menu item, matching the same thin-stroke visual language ---
const NAV_ICONS = {
  home: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3.5L17 9.5M5 8V16H15V8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  updates: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M4 4H16V13H7L4 16V4Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  events: `<svg class="icon" viewBox="0 0 20 20" fill="none"><rect x="3.5" y="4.5" width="13" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 8H16.5M7 3V5.5M13 3V5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  adminposts: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M10 3L11.5 7.5L16 9L11.5 10.5L10 15L8.5 10.5L4 9L8.5 7.5L10 3Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  clubs: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M5 10C5 7.79 6.79 6 9 6C11.21 6 13 7.79 13 10C13 12.21 11.21 14 9 14C6.79 14 5 12.21 5 10Z" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 16.5C3.5 14.29 5.79 12.5 8.5 12.5H9.5C12.21 12.5 14.5 14.29 14.5 16.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  library: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M4 4.5C4 4.5 6.5 3.5 9 4.5V15.5C6.5 14.5 4 15.5 4 15.5V4.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M16 4.5C16 4.5 13.5 3.5 11 4.5V15.5C13.5 14.5 16 15.5 16 15.5V4.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  openmic: `<svg class="icon" viewBox="0 0 20 20" fill="none"><circle cx="7.5" cy="14" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M9.5 14V4.5L15.5 3.5V12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="13.5" cy="12.5" r="2" stroke="currentColor" stroke-width="1.3"/></svg>`,
  sports: `<svg class="icon" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 3.5V16.5M3.5 10H16.5" stroke="currentColor" stroke-width="1.2"/></svg>`,
  downloads: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M10 3V13M10 13L6.5 9.5M10 13L13.5 9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15.5H16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  spotlight: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M14.5 3.5L16.5 5.5L7 15L3.5 16.5L5 13L14.5 3.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  message: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M3 4.5H17V13.5H8L4 16.5V13.5H3V4.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  settings: `<svg class="icon" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.6" stroke="currentColor" stroke-width="1.3"/><path d="M10 3V5M10 15V17M3 10H5M15 10H17M5.4 5.4L6.8 6.8M13.2 13.2L14.6 14.6M5.4 14.6L6.8 13.2M13.2 6.8L14.6 5.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  studentunion: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M5 3V17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5 4H14L12 7L14 10H5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  admin: `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M10 3L16 5.5V9.5C16 13 13.5 15.8 10 17C6.5 15.8 4 13 4 9.5V5.5L10 3Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`
};

document.querySelectorAll('.sidebar__link[data-view]').forEach(link => {
  const icon = NAV_ICONS[link.dataset.view];
  if (icon) link.insertAdjacentHTML('afterbegin', icon);
});

// A proper designed empty state — icon + message + optional call-to-action —
// used everywhere a list has nothing in it yet, instead of plain gray text.
function emptyState(message, iconKey, ctaHtml) {
  const icon = NAV_ICONS[iconKey] || NAV_ICONS.updates;
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <p class="empty-state__text">${message}</p>
      ${ctaHtml || ''}
    </div>
  `;
}

let currentUser = null; // { id, name, email, role, bio }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// Turns a plain-text URL sitting inside a post/comment body into a real,
// tappable link — same as every other site does. Escapes first (so this is
// always safe to use anywhere escapeHtml was used for body text), then
// wraps any http(s):// or www. address in an <a>, trimming trailing
// sentence punctuation like a period or closing bracket so it doesn't get
// swallowed into the link by mistake.
function linkify(str) {
  const escaped = escapeHtml(str);
  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  return escaped.replace(urlPattern, (matched) => {
    let url = matched;
    let trail = '';
    while (url.length && /[.,!?;:'")\]]/.test(url[url.length - 1])) {
      trail = url[url.length - 1] + trail;
      url = url.slice(0, -1);
    }
    const href = /^https?:\/\//i.test(url) ? url : 'https://' + url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="auto-link">${url}</a>${trail}`;
  });
}

// Turns raw Supabase/Postgres/Storage error objects into plain messages a
// student or club manager can actually understand — used everywhere we'd
// otherwise show error.message straight from the database.
function friendlyError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('exceeded the maximum allowed size') || msg.includes('payload too large')) {
    return 'That file is too large. Please choose a smaller file and try again.';
  }
  if (msg.includes('mime type') && msg.includes('not supported')) {
    return "That file type isn't supported here. Please check the allowed file types and try again.";
  }
  if (msg.includes('duplicate key value') || msg.includes('already exists')) {
    return 'That already exists — please try a different value.';
  }
  if (msg.includes('violates row-level security') || msg.includes('permission denied')) {
    return "You don't have permission to do that.";
  }
  if (msg.includes('violates foreign key') || msg.includes('violates not-null')) {
    return 'Some required information is missing. Please fill in every field and try again.';
  }
  if (msg.includes('jwt') || msg.includes('token is expired') || msg.includes('invalid refresh token')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return "Couldn't connect. Please check your internet connection and try again.";
  }
  if (msg.includes('could not find') && msg.includes('column')) {
    // Schema mismatch — a real bug, not something the user caused. Log detail
    // for us, show nothing technical to the person using the site.
    console.error('Schema error:', error.message);
    return "Something went wrong on our end. We've been notified — please try again shortly.";
  }
  // Fallback: never surface raw Postgres/Storage internals to the user.
  console.error('Unhandled error:', error.message);
  return 'Something went wrong. Please try again.';
}
function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'assistant_admin') return 'Assistant Admin';
  if (role === 'sports_admin') return 'Sports Admin';
  return 'Student';
}
function canManageContent(user) {
  return !!user && (user.role === 'admin' || user.role === 'assistant_admin');
}
// Scoped to the Sports tab only — a sports admin does NOT get canManageContent
// anywhere else in the app (no other admin section, no general Admin Panel).
function canManageSports(user) {
  return canManageContent(user) || (!!user && user.role === 'sports_admin');
}
function showError(el, message) {
  if (el) el.textContent = message;
}

// Toggles a button into/out of its loading spinner state without changing its size
function setButtonLoading(button, isLoading) {
  if (!button) return;
  button.classList.toggle('is-loading', isLoading);
  button.disabled = isLoading;
}

document.getElementById('footerYear').textContent = new Date().getFullYear();

// Theme preference stays local (per-device, not shared data) — applied
// immediately on load so there's no flash of the wrong theme, and again
// whenever the Settings toggle changes.
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = theme === 'dark';
}
applyTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  const theme = e.target.checked ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
});

// ==========================================================================
// SESSION HANDLING — check if someone's already logged in when the page loads
// ==========================================================================
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await loadProfileAndEnter(session.user.id);
  }
}

async function loadProfileAndEnter(userId, attempt) {
  attempt = attempt || 1;
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) {
    // Right after signup, the database trigger that creates the profile row can take
    // a moment to finish — retry a few times before giving up, instead of failing silently.
    if (attempt < 6) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return loadProfileAndEnter(userId, attempt + 1);
    }
    console.error('Could not load profile after retries', error);
    alert("We couldn't finish setting up your account just yet. Please try logging in again in a few seconds — if this keeps happening, let the admin know.");
    return;
  }
  currentUser = data;
  enterApp();
}

checkSession();

// --- Public homepage stats (aggregate counts only, safe for logged-out visitors) ---
function animateCounter(el, target) {
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const STAT_METRIC_LABELS = {
  students: 'Students',
  downloads: 'Downloads',
  clubs: 'Clubs',
  songs: 'Songs shared',
  writings: 'Writings published'
};
const STAT_METRIC_LIVE_KEYS = {
  students: 'students',
  downloads: 'downloads',
  clubs: 'clubs',
  songs: 'songs',
  writings: 'writings'
};

async function loadPublicStats() {
  const [{ data: liveData }, { data: slots }] = await Promise.all([
    sb.rpc('get_public_stats'),
    sb.from('stat_slots').select('*').order('slot_position', { ascending: true })
  ]);
  if (!liveData || !liveData[0] || !slots) return;
  const live = liveData[0];

  slots.forEach(slot => {
    const numberEl = document.getElementById(`statSlot${slot.slot_position}Number`);
    const labelEl = document.getElementById(`statSlot${slot.slot_position}Label`);
    if (!numberEl || !labelEl) return;
    const liveKey = STAT_METRIC_LIVE_KEYS[slot.metric_key] || slot.metric_key;
    const value = slot.override_value ?? live[liveKey] ?? 0;
    labelEl.textContent = STAT_METRIC_LABELS[slot.metric_key] || slot.metric_key;
    animateCounter(numberEl, value);
  });
}
loadPublicStats();

// --- Scroll-triggered reveal (IntersectionObserver — cheap, no scroll-listener cost) ---
const revealTargets = document.querySelectorAll('.stat');
if ('IntersectionObserver' in window && revealTargets.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach(el => revealObserver.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add('is-visible'));
}

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

// --- Google sign-in (uses Supabase's built-in Google OAuth) ---
async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) alert('Google sign-in failed: ' + friendlyError(error));
}
document.getElementById('googleLoginBtn').addEventListener('click', signInWithGoogle);
document.getElementById('googleSignupBtn').addEventListener('click', signInWithGoogle);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  showError(errorEl, '');
  setButtonLoading(submitBtn, true);

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  setButtonLoading(submitBtn, false);
  if (error) {
    // Supabase rejects unconfirmed emails with a distinct, safe-to-show
    // message — don't lump it in with "wrong password" or people have no
    // way to know they just need to check their inbox.
    if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message || '')) {
      errorEl.innerHTML = `Your email isn't confirmed yet. Check your inbox (and spam folder) for the confirmation link, or <button type="button" class="btn-link" id="resendConfirmBtn">resend it</button>.`;
      const resendBtn = document.getElementById('resendConfirmBtn');
      if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
          resendBtn.disabled = true;
          resendBtn.textContent = 'Sending…';
          const { error: resendError } = await sb.auth.resend({ type: 'signup', email });
          resendBtn.disabled = false;
          resendBtn.textContent = resendError ? 'Try again' : 'Sent — check your inbox';
        });
      }
    } else {
      showError(errorEl, 'Incorrect email or password. Double-check both and try again.');
      document.getElementById('forgotPasswordRow').style.display = 'block';
    }
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
  const submitBtn = e.target.querySelector('button[type="submit"]');
  showError(errorEl, '');

  if (password.length < 6) {
    showError(errorEl, 'Password must be at least 6 characters.');
    return;
  }
  if (password !== confirmPassword) {
    showError(errorEl, 'Passwords do not match — check both fields.');
    return;
  }

  setButtonLoading(submitBtn, true);
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { name } }
  });
  setButtonLoading(submitBtn, false);
  if (error) { showError(errorEl, friendlyError(error)); return; }

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
  if (error) { showError(errorEl, friendlyError(error)); return; }

  noteEl.textContent = 'Check your email for a link to reset your password.';
});

// When someone clicks the password-reset link in their email, Supabase fires this event.
// SIGNED_IN also fires after a Google (or other OAuth) redirect completes — as a safety
// net, log them in here too in case checkSession() ran before the session was ready.
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    openAuth();
    showAuthPane('resetPassword');
  }
  if (event === 'SIGNED_IN' && session && !currentUser) {
    loadProfileAndEnter(session.user.id);
  }
});

// If Google (or any OAuth provider) redirects back with an error — usually a sign that
// the provider isn't fully configured in Supabase yet — show it clearly instead of
// leaving the person looking at a blank landing page with no explanation.
(function showOAuthErrorIfAny() {
  const hash = window.location.hash;
  if (hash && hash.includes('error=')) {
    const params = new URLSearchParams(hash.slice(1));
    const description = params.get('error_description') || params.get('error') || 'Google sign-in failed.';
    alert(decodeURIComponent(description.replace(/\+/g, ' ')));
    history.replaceState(null, '', window.location.pathname);
  }
})();

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
  if (error) { showError(errorEl, friendlyError(error)); return; }

  closeAuth();
  await loadProfileAndEnter(data.user.id);
});

async function performLogout() {
  teardownRealtime();
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('appView').style.display = 'none';
  document.getElementById('publicView').style.display = 'block';
  document.querySelector('header.nav').style.display = 'block';
  document.getElementById('navRight').innerHTML = '<button class="btn btn--ghost" id="loginNavBtn">Log in</button>';
  document.getElementById('loginNavBtn').addEventListener('click', openAuth);
}

document.getElementById('logoutNavBtn').addEventListener('click', (e) => { e.preventDefault(); performLogout(); });

// ==========================================================================
// REALTIME — push updates the instant something changes, instead of
// waiting for a poll or a manual refresh. One persistent connection for the
// whole session; each handler only re-renders whatever the person is
// actually looking at right now, so nothing gets fetched needlessly.
// ==========================================================================
let realtimeChannel = null;

function isViewActive(viewName) {
  const el = document.getElementById('view-' + viewName);
  return !!el && el.style.display !== 'none';
}

function initRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = sb.channel('app-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
      if (isViewActive('events')) renderEvents();
      if (isViewActive('home')) renderHomeHighlights();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_posts' }, () => {
      if (isViewActive('updates')) renderAdminPosts();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_members' }, () => {
      if (isViewActive('clubs')) renderClubs();
      if (typeof handleClubMembersRealtime === 'function') handleClubMembersRealtime();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_posts' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_posts', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_events' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_events', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_admin_posts' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_admin_posts', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_room_messages' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_room_messages', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
      if (isViewActive('library')) renderBooks();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'open_mic_songs' }, () => {
      if (isViewActive('openmic')) renderSongs();
      if (isViewActive('home')) renderSongOfWeek();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'song_votes' }, () => {
      if (isViewActive('openmic')) renderSongs();
      if (isViewActive('home')) renderSongOfWeek();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sports' }, () => {
      if (isViewActive('sports')) { renderSports(); if (window.renderSportsPage) window.renderSportsPage(); }
      if (isViewActive('home')) renderHomeHighlights();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sports_potm' }, () => {
      if (isViewActive('sports') && window.renderSportsPage) window.renderSportsPage();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_union_terms' }, () => {
      if (isViewActive('studentunion') && window.renderStudentUnionPage) window.renderStudentUnionPage();
      if (isViewActive('home') && window.renderHomePresident) window.renderHomePresident();
      if (isViewActive('admin') && canManageContent(currentUser)) renderSuAdmin();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_union_positions' }, () => {
      if (isViewActive('studentunion') && window.renderStudentUnionPage) window.renderStudentUnionPage();
      if (isViewActive('home') && window.renderHomePresident) window.renderHomePresident();
      if (isViewActive('admin') && canManageContent(currentUser)) renderSuAdmin();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_union_members' }, () => {
      if (isViewActive('studentunion') && window.renderStudentUnionPage) window.renderStudentUnionPage();
      if (isViewActive('home') && window.renderHomePresident) window.renderHomePresident();
      if (isViewActive('admin') && canManageContent(currentUser)) renderSuMembers();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
      // RLS already scopes this to the current user's own notifications
      loadNotifications();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'downloads' }, () => {
      if (isViewActive('downloads')) renderDownloads();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spotlight' }, () => {
      if (isViewActive('home')) renderSpotlight();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'writings' }, () => {
      if (isViewActive('spotlight')) { renderWritings(); if (currentUser) renderMyWritings(); }
      if (isViewActive('admin')) renderPendingWritings();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'writing_likes' }, () => {
      if (isViewActive('spotlight')) renderWritings();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
      if (isViewActive('message')) renderMyMessages();
      if (isViewActive('admin') && canManageContent(currentUser)) renderAdminMessages();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_requests' }, () => {
      if (isViewActive('clubs')) renderMyClubRequests();
      if (isViewActive('admin') && canManageContent(currentUser)) renderPendingClubRequests();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clubs' }, (payload) => {
      if (isViewActive('clubs')) renderClubs();
      if (typeof handleClubRecordRealtime === 'function') handleClubRecordRealtime('clubs', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_managers' }, (payload) => {
      if (isViewActive('clubs')) renderClubs();
      if (typeof handleClubRecordRealtime === 'function') handleClubRecordRealtime('club_managers', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      if (isViewActive('admin') && canManageContent(currentUser)) {
        renderRegisteredUsers();
        if (currentUser.role === 'admin') { renderAssistantAdminManager(); renderSportsAdminManager(); }
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_downloads' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_downloads', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_creative_items' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_creative', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_creative_likes' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_creative', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_suggestions' }, (payload) => {
      if (typeof handleClubTableRealtime === 'function') handleClubTableRealtime('club_suggestions', payload);
    })
    .subscribe();
}

function teardownRealtime() {
  if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
}

// Realtime reconnects its own socket automatically, but anything that
// changed while a phone was locked or offline still needs one catch-up
// fetch — so re-sync whatever's currently on screen when the tab/app
// becomes visible again.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !currentUser) return;
  if (isViewActive('club-home') && typeof CLUB_TAB_LOADERS !== 'undefined') {
    const loader = CLUB_TAB_LOADERS[activeClubTab];
    if (loader) loader(currentClubId);
  }
  else if (isViewActive('clubs')) { renderClubs(); renderMyClubRequests(); }
  else if (isViewActive('updates')) { renderAdminPosts(); }
  else if (isViewActive('events')) renderEvents();
  else if (isViewActive('library')) renderBooks();
  else if (isViewActive('openmic')) renderSongs();
  else if (isViewActive('sports')) { renderSports(); if (window.renderSportsPage) window.renderSportsPage(); }
  else if (isViewActive('studentunion') && window.renderStudentUnionPage) window.renderStudentUnionPage();
  else if (isViewActive('downloads')) renderDownloads();
  else if (isViewActive('spotlight')) { renderWritings(); if (currentUser) renderMyWritings(); }
  else if (isViewActive('message')) renderMyMessages();
  else if (isViewActive('admin') && canManageContent(currentUser)) {
    renderAdminMessages(); renderPendingClubRequests(); renderRegisteredUsers(); renderPendingWritings();
  }
  else if (isViewActive('home')) renderHomeHighlights();
});

// ==========================================================================
// APP ENTRY
// ==========================================================================
// Shows lightweight shimmer placeholders the instant the app opens, so the
// Home page never has an empty/blank moment while data is still arriving
function showHomeSkeletons() {
  const textSkeleton = `<div class="skeleton skeleton--title"></div><div class="skeleton skeleton--text"></div><div class="skeleton skeleton--text"></div>`;
  ['homeLatestUpdate', 'homeLatestEvent', 'homeLatestSports'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = textSkeleton;
  });
  const spotlight = document.getElementById('spotlightCard');
  if (spotlight) {
    spotlight.innerHTML = `
      <div class="card-label">Student of the Moment</div>
      <div class="avatar-row"><div class="skeleton skeleton--avatar"></div></div>
      ${textSkeleton}
    `;
  }
  const songOfWeek = document.getElementById('songOfWeekCard');
  if (songOfWeek) {
    songOfWeek.innerHTML = `<div class="card-label">Song of the Week</div><div class="skeleton" style="height:100px; border-radius:var(--radius-sm); margin-bottom:12px;"></div>${textSkeleton}`;
  }
}

async function enterApp() {
  if (!currentUser) return;
  initRealtime();

  document.getElementById('publicView').style.display = 'none';
  document.querySelector('header.nav').style.display = 'none';
  document.getElementById('appView').style.display = 'block';
  document.getElementById('navRight').innerHTML = '';
  document.getElementById('homeUserName').textContent = ', ' + currentUser.name.split(' ')[0];
  document.getElementById('topGreetName').textContent = currentUser.name.split(' ')[0];
  document.querySelectorAll('.sidebar__link--admin').forEach(el => {
    el.style.display = canManageContent(currentUser) ? '' : 'none';
  });
  document.getElementById('dropdownAdminLink').style.display = canManageContent(currentUser) ? 'flex' : 'none';
  document.getElementById('assistantAdminSection').style.display = currentUser.role === 'admin' ? 'block' : 'none';
  document.getElementById('sportsAdminManagerSection').style.display = currentUser.role === 'admin' ? 'block' : 'none';
  document.getElementById('sportsAdminSection').style.display = canManageSports(currentUser) ? 'block' : 'none';
  document.getElementById('sportsPotmAdminSection').style.display = canManageSports(currentUser) ? 'block' : 'none';

  showHomeSkeletons();
  fillProfileForm();
  await Promise.all([
    renderAdminPosts(),
    renderEvents(),
    renderBooks(),
    renderSports(),
    (window.renderSportsPage ? window.renderSportsPage() : Promise.resolve()),
    (window.renderStudentUnionPage ? window.renderStudentUnionPage() : Promise.resolve()),
    (window.renderHomePresident ? window.renderHomePresident() : Promise.resolve()),
    loadNotifications(),
    renderDownloads(),
    renderSpotlight(),
    renderSongs(),
    renderSongOfWeek(),
    renderHomeHighlights(),
    renderMyMessages(),
    renderWritings(),
    renderMyWritings(),
    renderClubs()
  ]);
  if (canManageContent(currentUser)) {
    renderAdminMessages();
    renderRegisteredUsers();
    renderPendingWritings();
    loadStatOverridesIntoForm();
    renderPendingClubRequests();
    renderSuAdmin();
  }
  if (currentUser.role === 'admin') {
    renderAssistantAdminManager();
    renderSportsAdminManager();
  }

  // Every view/item is populated now — safe to jump straight to whatever
  // URL the person actually arrived on (a shared link, a bookmark, or a
  // plain visit to "/").
  routeToCurrentUrl();
}

// ==========================================================================
// ROUTING — gives every view, and many individual items, a real, shareable
// URL. Uses the actual browser History API (not a # fragment), so it works
// with the phone's back gesture and the browser's own back/forward buttons,
// and a copied link opens straight to that content — including for someone
// who isn't logged in yet, since routeToCurrentUrl() runs the moment login
// finishes. vercel.json has a catch-all rewrite so any of these paths still
// loads the app correctly on a fresh visit or a hard refresh.
// ==========================================================================
const ROUTABLE_VIEWS = ['home', 'updates', 'events', 'library', 'openmic', 'sports', 'clubs', 'spotlight', 'downloads', 'message', 'settings', 'admin', 'studentunion'];
let suppressNextPush = false; // true right when we're syncing the UI TO the current URL, so that doesn't also push a duplicate entry

function buildPath(view, itemId) {
  const base = view === 'home' ? '/' : `/${view}`;
  return itemId ? `${base}/${itemId}` : base;
}

function pushRoute(view, itemId) {
  if (suppressNextPush) { suppressNextPush = false; return; }
  const path = buildPath(view, itemId);
  if (location.pathname === path) return;
  navBackStack = []; // any nested in-view state (see below) belonged to the route we're leaving
  history.pushState({ view, itemId: itemId || null }, '', path);
}

function parseRoute(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return { view: 'home', itemId: null };
  const view = parts[0];
  if (!ROUTABLE_VIEWS.includes(view)) return { view: 'home', itemId: null };
  return { view, itemId: parts[1] || null };
}

// Makes the page match whatever the current URL says — used both on first
// load (so a shared link opens straight to the right place) and whenever
// the person taps back/forward.
function routeToCurrentUrl() {
  const { view, itemId } = parseRoute(location.pathname);
  suppressNextPush = true;
  if (itemId) {
    goToContent(view, itemId);
  } else {
    switchView(view);
  }
}

window.addEventListener('popstate', () => {
  suppressNextPush = true;
  routeToCurrentUrl();
});

// ==========================================================================
// NESTED IN-VIEW BACK NAVIGATION — for a step that goes one level deeper
// WITHOUT changing the page's actual route (opening a shelf inside
// Library, a tab inside an open club, the mobile menu drawer). Pairs a
// browser history entry with an "undo" function that restores the UI;
// the phone/browser back button pops the most recent one, same idea as
// the fix already shipped for Zati Chani. A REAL route change above
// (pushRoute — switching top-level tabs, opening a different item) always
// clears this stack, since whatever was nested under the old route no
// longer applies once the route itself has moved on.
// ==========================================================================
let navBackStack = [];

function pushNavHistory(undoFn) {
  navBackStack.push(undoFn);
  history.pushState({ navDepth: navBackStack.length }, '', location.href);
}

function goBackNav() {
  if (navBackStack.length > 0) history.back();
}

window.addEventListener('popstate', (event) => {
  if (event.state && typeof event.state.navDepth === 'number') {
    const targetDepth = event.state.navDepth;
    while (navBackStack.length > targetDepth) {
      const undo = navBackStack.pop();
      if (undo) undo();
    }
  } else {
    // A real route change, or back past all nested state — the router's
    // own popstate handler above rebuilds the view from the URL; any
    // nested UI state belonged to the view being left, so just drop it.
    navBackStack = [];
  }
});

// --- View switching (works for sidebar links and home-page quick cards) ---
function switchView(viewName, skipPush) {
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.sidebar__link[data-view="${viewName}"]`).forEach(l => l.classList.add('active'));
  document.querySelectorAll('.nav-group').forEach(g => {
    const trigger = g.querySelector('.nav-group__trigger');
    if (trigger) trigger.classList.toggle('active', !!g.querySelector('.sidebar__link.active'));
  });
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  const target = document.getElementById('view-' + viewName);
  if (target) target.style.display = 'block';
  if (viewName === 'library' && typeof showLibraryShelvesGrid === 'function') showLibraryShelvesGrid();
  if (!skipPush && ROUTABLE_VIEWS.includes(viewName)) pushRoute(viewName);
  document.querySelector('.app__content').scrollTo({ top: 0, behavior: 'auto' });
  closeMobileMenu();
}

// ==========================================================================
// INTERNAL LINKING — homepage teasers (image, title, "Read more") link
// through to the full item on its real view, in the same tab, and scroll
// straight to that item instead of just dumping the person at the top of
// a long list.
// ==========================================================================
function goToContent(viewName, itemId) {
  if (viewName === 'clubs' && itemId) {
    switchView('clubs', true); // sensible fallback if the club can't be opened (not a member, deleted, etc.) — openClubHome pushes its own route below
    if (typeof openClubHome === 'function') openClubHome(itemId);
    return;
  }
  switchView(viewName, true);
  pushRoute(viewName, itemId);
  if (!itemId) return;
  // The target view's content is already rendered in the DOM (views don't
  // re-fetch on switch — see switchView above), so this can run right away
  // with no wait. Sports is the one exception: its cards are rendered by
  // sports.js in a separate pass, which can still be finishing on a slow
  // connection, so give it a couple of quick retries.
  const trySrcoll = (attemptsLeft) => {
    const el = document.querySelector(`#view-${viewName} [data-item-id="${itemId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('is-linked-highlight');
      setTimeout(() => el.classList.remove('is-linked-highlight'), 2200);
      // Student Union cards have a real detail view — a shared link should
      // land on the actual profile, not just scroll near it.
      if (viewName === 'studentunion' && el.click) setTimeout(() => el.click(), 260);
    } else if (attemptsLeft > 0) {
      setTimeout(() => trySrcoll(attemptsLeft - 1), 250);
    }
  };
  trySrcoll(viewName === 'sports' || viewName === 'studentunion' ? 6 : 1);
}

function openMobileMenu() {
  document.getElementById('mobileDrawer').classList.add('open');
  pushNavHistory(closeMobileMenu);
}
function closeMobileMenu() {
  document.getElementById('mobileDrawer').classList.remove('open');
}

document.querySelectorAll('.sidebar__link').forEach(link => {
  link.addEventListener('click', () => switchView(link.dataset.view));
});
document.querySelectorAll('.home-card').forEach(card => {
  card.addEventListener('click', () => switchView(card.dataset.view));
});

// --- Nav dropdown groups (Campus / Community / More) ---
document.querySelectorAll('.nav-group__trigger').forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const group = trigger.closest('.nav-group');
    const menu = group.querySelector('.nav-group__menu');
    const wasOpen = group.classList.contains('open');
    document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
    if (!wasOpen) {
      // position:fixed needs explicit coordinates — computed fresh each open
      // so it tracks the trigger's real position even though the subnav
      // itself horizontally scrolls (which is exactly what was clipping
      // the old position:absolute menu out of view). .subnav stays visible
      // at every width (not just desktop), so this also has to stay clear
      // of the right edge on narrow phones.
      const rect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 190;
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.left = `${Math.max(8, left)}px`;
      group.classList.add('open');
    }
  });
});
// A fixed-position menu is a one-time snapshot of the trigger's location —
// if the page or the subnav scrolls while it's open, close it rather than
// leave it floating over the wrong spot.
window.addEventListener('scroll', () => {
  document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
}, true);
window.addEventListener('resize', () => {
  document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
});
document.addEventListener('click', () => {
  document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
});
document.querySelectorAll('.nav-group__menu .sidebar__link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
  });
});

document.getElementById('sidebarMenuToggle').addEventListener('click', openMobileMenu);
document.getElementById('drawerClose').addEventListener('click', goBackNav);
document.getElementById('drawerBackdrop').addEventListener('click', goBackNav);

// ==========================================================================
// SITE-WIDE NOTIFICATIONS — filled entirely by database triggers (see the
// notifications table); this just reads, renders, and marks read. Clicking
// a notification reuses goToContent(), the same router that already
// powers shareable links, so it jumps straight to the actual content.
// ==========================================================================
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function loadNotifications() {
  const { data, error } = await sb.from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error(error); return; }
  renderNotifDropdown(data || []);
  updateNotifBadge(data || []);
}

function renderNotifDropdown(items) {
  const list = document.getElementById('notifList');
  if (!items.length) { list.innerHTML = emptyState("Nothing yet — you're all caught up.", 'updates'); return; }
  list.innerHTML = items.map(n => `
    <div class="notif-item ${n.read_at ? '' : 'unread'}" data-id="${n.id}" data-view="${escapeHtml(n.link_view)}" data-item="${n.link_item_id ? escapeHtml(n.link_item_id) : ''}">
      ${n.read_at ? '' : '<span class="notif-item__dot"></span>'}
      <div class="notif-item__body">
        <div class="notif-item__title">${escapeHtml(n.title)}</div>
        ${n.body ? `<div class="notif-item__text">${escapeHtml(n.body)}</div>` : ''}
        <div class="notif-item__time">${timeAgo(n.created_at)}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      const view = item.dataset.view;
      const itemId = item.dataset.item || null;
      document.getElementById('notifDropdown').classList.remove('open');
      if (item.classList.contains('unread')) {
        await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
        updateNotifBadgeCount(-1);
      }
      goToContent(view, itemId);
    });
  });
}

function updateNotifBadge(items) {
  const count = items.filter(n => !n.read_at).length;
  setNotifBadgeCount(count);
}
function setNotifBadgeCount(count) {
  const badge = document.getElementById('notifBadge');
  badge.textContent = count > 9 ? '9+' : String(count);
  badge.style.display = count > 0 ? 'flex' : 'none';
  badge.dataset.count = count;
}
function updateNotifBadgeCount(delta) {
  const badge = document.getElementById('notifBadge');
  const next = Math.max(0, (parseInt(badge.dataset.count, 10) || 0) + delta);
  setNotifBadgeCount(next);
}

document.getElementById('notifBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const dropdown = document.getElementById('notifDropdown');
  const opening = !dropdown.classList.contains('open');
  document.getElementById('accountDropdown').classList.remove('open');
  dropdown.classList.toggle('open');
  if (opening) loadNotifications();
});
document.addEventListener('click', () => document.getElementById('notifDropdown').classList.remove('open'));

document.getElementById('notifMarkAllRead').addEventListener('click', async (e) => {
  e.stopPropagation();
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null).eq('recipient_id', currentUser.id);
  loadNotifications();
});

// --- Account dropdown (Settings / Admin Panel / Log out) ---
document.getElementById('accountBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('accountDropdown').classList.toggle('open');
  document.getElementById('notifDropdown').classList.remove('open');
});
document.addEventListener('click', () => document.getElementById('accountDropdown').classList.remove('open'));
document.getElementById('dropdownSettingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  switchView('settings');
  document.getElementById('accountDropdown').classList.remove('open');
});
document.getElementById('dropdownAdminLink').addEventListener('click', (e) => {
  e.preventDefault();
  switchView('admin');
  document.getElementById('accountDropdown').classList.remove('open');
});

// ==========================================================================
// UPDATES / POSTS (with likes + comments)
// ==========================================================================
// ==========================================================================
// SHARED COMMENT / REPLY / REACTION SYSTEM (used by Updates)
// One level of replies (a reply to a reply lands under the same parent).
// ==========================================================================
const COMMENT_CONFIGS = {
  adminposts: { parentField: 'admin_post_id', likesTable: 'admin_post_likes', commentsTable: 'admin_post_comments', commentLikesTable: 'admin_post_comment_likes', rerender: () => renderAdminPosts() }
};

function commentItemHtml(configKey, parentId, comment, allComments, commentLikeCounts, myCommentLikeIds, isReply) {
  const replies = allComments.filter(c => c.parent_comment_id === comment.id);
  const likeCount = commentLikeCounts[comment.id] || 0;
  const liked = myCommentLikeIds.has(comment.id);
  const canDelete = currentUser && (comment.user_id === currentUser.id || canManageContent(currentUser));
  return `
    <div class="comment-item ${isReply ? 'comment-item--reply' : ''}">
      <strong>${escapeHtml(comment.name)}</strong>
      <span class="comment-item__time">${new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      <p>${linkify(comment.text)}</p>
      <div class="comment-item__actions">
        <button class="comment-like-btn ${liked ? 'liked' : ''}" data-comment-id="${comment.id}" data-config="${configKey}">${ICON_LIKE} ${likeCount}</button>
        <button class="comment-reply-btn" data-comment-id="${comment.id}">Reply</button>
        ${canDelete ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" data-config="${configKey}">Delete</button>` : ''}
      </div>
      <form class="comment-reply-form" data-parent-comment-id="${comment.id}" data-config="${configKey}" data-parent-id="${parentId}" style="display:none;">
        <input type="text" placeholder="Write a reply..." required />
        <button type="submit">Reply</button>
      </form>
      ${replies.length ? `<div class="comment-item__replies">${replies.map(r => commentItemHtml(configKey, parentId, r, allComments, commentLikeCounts, myCommentLikeIds, true)).join('')}</div>` : ''}
    </div>
  `;
}

function commentThreadHtml(configKey, parentId, allComments, commentLikeCounts, myCommentLikeIds) {
  const cfg = COMMENT_CONFIGS[configKey];
  const topLevel = allComments.filter(c => c[cfg.parentField] === parentId && !c.parent_comment_id);
  if (!topLevel.length) return '<p class="comment-empty">No comments yet — be the first to say something.</p>';
  return topLevel.map(c => commentItemHtml(configKey, parentId, c, allComments, commentLikeCounts, myCommentLikeIds, false)).join('');
}

function wireCommentThread(container) {
  container.querySelectorAll('.comment-like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleCommentLike(btn.dataset.config, btn.dataset.commentId));
  });
  container.querySelectorAll('.comment-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = container.querySelector(`.comment-reply-form[data-parent-comment-id="${btn.dataset.commentId}"]`);
      if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });
  });
  container.querySelectorAll('.comment-reply-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      addGenericComment(form.dataset.config, form.dataset.parentId, input.value.trim(), form.dataset.parentCommentId);
      input.value = '';
    });
  });
  container.querySelectorAll('.comment-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteGenericComment(btn.dataset.config, btn.dataset.commentId));
  });
}

async function addGenericComment(configKey, parentId, text, parentCommentId) {
  if (!text || !currentUser) return;
  const cfg = COMMENT_CONFIGS[configKey];
  const row = { [cfg.parentField]: parentId, user_id: currentUser.id, name: currentUser.name, text };
  if (parentCommentId) row.parent_comment_id = parentCommentId;
  await sb.from(cfg.commentsTable).insert(row);
  cfg.rerender();
}

async function deleteGenericComment(configKey, commentId) {
  if (!confirm('Delete this comment? This cannot be undone.')) return;
  const cfg = COMMENT_CONFIGS[configKey];
  await sb.from(cfg.commentsTable).delete().eq('id', commentId);
  cfg.rerender();
}

async function toggleCommentLike(configKey, commentId) {
  if (!currentUser) return;
  const cfg = COMMENT_CONFIGS[configKey];
  const { data: existing } = await sb.from(cfg.commentLikesTable).select('*').eq('comment_id', commentId).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await sb.from(cfg.commentLikesTable).delete().eq('comment_id', commentId).eq('user_id', currentUser.id);
  } else {
    await sb.from(cfg.commentLikesTable).insert({ comment_id: commentId, user_id: currentUser.id });
  }
  cfg.rerender();
}


// ==========================================================================
// ADMIN POSTS — free-form posts, optional photo, pin to Home
// ==========================================================================
function adminPostCardHtml(p, forManage, interactive) {
  const photo = p.photo_url ? `<img src="${escapeHtml(p.photo_url)}" alt="" class="post-card__photo" />` : '';
  const pinBadge = (p.pinned && canManageContent(currentUser)) ? `<span class="admin-post-card__pin-badge" title="Pinned (only you can see this)"><svg class="icon" viewBox="0 0 20 20" fill="none" width="11" height="11"><path d="M8 3H12V8L14 10V11H10.5V17L10 18L9.5 17V11H6V10L8 8V3Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></span>` : '';
  const controls = forManage ? `
    <div class="item-admin-controls">
      <button class="admin-post-pin-btn ${p.pinned ? 'pinned' : ''}" data-id="${p.id}">${p.pinned ? 'Unpin' : 'Pin to Home'}</button>
      <button class="admin-post-edit-btn" data-id="${p.id}">${ICON_EDIT} Edit</button>
      <button class="admin-post-delete-btn" data-id="${p.id}">${ICON_DELETE} Delete</button>
    </div>` : '';

  let interactiveHtml = '';
  if (interactive) {
    const postLikes = interactive.likes.filter(l => l.admin_post_id === p.id);
    const postComments = interactive.comments.filter(c => c.admin_post_id === p.id);
    const liked = currentUser && postLikes.some(l => l.user_id === currentUser.id);
    interactiveHtml = `
      <div class="post-card__actions">
        <button class="admin-post-like-btn ${liked ? 'liked' : ''}" data-id="${p.id}">${ICON_LIKE} ${postLikes.length} Like${postLikes.length === 1 ? '' : 's'}</button>
        <span style="font-size:0.85rem; color:var(--text-muted);">${postComments.length} comment${postComments.length === 1 ? '' : 's'}</span>
      </div>
      <div class="comment-list">
        ${commentThreadHtml('adminposts', p.id, interactive.comments, interactive.commentLikeCounts, interactive.myCommentLikeIds)}
      </div>
      <form class="admin-post-comment-form" data-id="${p.id}">
        <input type="text" placeholder="Write a comment..." required />
        <button type="submit">Post</button>
      </form>
    `;
  }

  return `
    <div class="post-card admin-post-card" data-item-id="${p.id}" style="font-family:'${p.font_family || 'Inter'}', sans-serif; background:${p.bg_color || '#FFFFFF'};">
      ${pinBadge}
      ${photo}
      <span class="post-card__date">${new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      ${p.title ? `<h3>${escapeHtml(p.title)}</h3>` : ''}
      <p>${linkify(p.content)}</p>
      ${interactiveHtml}
      ${controls}
    </div>
  `;
}

async function renderAdminPosts() {
  const { data: posts, error } = await sb.from('admin_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  const postIds = posts.map(p => p.id);
  let likes = [], comments = [], commentLikes = [];
  if (postIds.length) {
    const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
      sb.from('admin_post_likes').select('*').in('admin_post_id', postIds),
      sb.from('admin_post_comments').select('*').in('admin_post_id', postIds).order('created_at', { ascending: true })
    ]);
    likes = likeRows || [];
    comments = commentRows || [];
    const commentIds = comments.map(c => c.id);
    if (commentIds.length) {
      const { data: clRows } = await sb.from('admin_post_comment_likes').select('*').in('comment_id', commentIds);
      commentLikes = clRows || [];
    }
  }
  const commentLikeCounts = {};
  commentLikes.forEach(cl => { commentLikeCounts[cl.comment_id] = (commentLikeCounts[cl.comment_id] || 0) + 1; });
  const myCommentLikeIds = new Set(currentUser ? commentLikes.filter(cl => cl.user_id === currentUser.id).map(cl => cl.comment_id) : []);
  const interactive = { likes, comments, commentLikeCounts, myCommentLikeIds };

  const listEl = document.getElementById('adminPostsList');
  listEl.innerHTML = posts.length
    ? posts.map(p => adminPostCardHtml(p, false, interactive)).join('')
    : emptyState('Nothing posted yet — check back soon.', 'adminposts');
  listEl.querySelectorAll('.admin-post-like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleAdminPostLike(btn.dataset.id));
  });
  listEl.querySelectorAll('.admin-post-comment-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      addGenericComment('adminposts', form.dataset.id, input.value.trim());
      input.value = '';
    });
  });
  wireCommentThread(listEl);

  // Pinned section on Home (merged with Pinned Open Mic — shared "Pinned" header). Kept
  // as a simple preview, without the full comment thread, to keep Home uncluttered.
  const pinned = posts.filter(p => p.pinned);
  const pinnedList = document.getElementById('pinnedPostsList');
  pinnedList.innerHTML = pinned.length ? pinned.map(p => adminPostCardHtml(p, false, null)).join('') : '';
  hasPinnedPosts = pinned.length > 0;
  updatePinnedHeadVisibility();

  // Admin management list (with pin/edit/delete controls)
  if (canManageContent(currentUser)) {
    const manageEl = document.getElementById('adminPostsManageList');
    manageEl.innerHTML = posts.length
      ? posts.map(p => adminPostCardHtml(p, true, null)).join('')
      : emptyState('Nothing posted yet. Use the form above to share your first post.', 'adminposts');

    manageEl.querySelectorAll('.admin-post-pin-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleAdminPostPin(btn.dataset.id, !btn.classList.contains('pinned')));
    });
    manageEl.querySelectorAll('.admin-post-edit-btn').forEach(btn => {
      const post = posts.find(p => p.id === btn.dataset.id);
      btn.addEventListener('click', () => editAdminPost(post));
    });
    manageEl.querySelectorAll('.admin-post-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteAdminPost(btn.dataset.id));
    });
  }
}

async function toggleAdminPostLike(postId) {
  if (!currentUser) return;
  const { data: existing } = await sb.from('admin_post_likes').select('*').eq('admin_post_id', postId).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await sb.from('admin_post_likes').delete().eq('admin_post_id', postId).eq('user_id', currentUser.id);
  } else {
    await sb.from('admin_post_likes').insert({ admin_post_id: postId, user_id: currentUser.id });
  }
  renderAdminPosts();
}

async function toggleAdminPostPin(id, pin) {
  await sb.from('admin_posts').update({ pinned: pin }).eq('id', id);
  renderAdminPosts();
  renderHomeHighlights();
}

function editAdminPost(post) {
  if (!post) return;
  switchView('admin');
  document.getElementById('editingAdminPostId').value = post.id;
  document.getElementById('newAdminPostTitle').value = post.title || '';
  document.getElementById('newAdminPostContent').value = post.content;
  document.getElementById('newAdminPostFont').value = post.font_family || 'Inter';
  document.getElementById('newAdminPostBgColor').value = post.bg_color || '#ffffff';
  document.getElementById('adminPostFormHeading').textContent = 'Editing post';
  document.getElementById('adminPostSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelAdminPostEdit').style.display = 'inline-block';
}

async function deleteAdminPost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  await sb.from('admin_posts').delete().eq('id', id);
  renderAdminPosts();
  renderHomeHighlights();
}

document.getElementById('newAdminPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newAdminPostTitle').value.trim();
  const content = document.getElementById('newAdminPostContent').value.trim();
  const font_family = document.getElementById('newAdminPostFont').value;
  const bg_color = document.getElementById('newAdminPostBgColor').value;
  const editingId = document.getElementById('editingAdminPostId').value;
  const fileInput = document.getElementById('newAdminPostPhoto');
  const noteEl = document.getElementById('adminPostUploadNote');
  const updates = { title: title || null, content, font_family, bg_color };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `admin-posts/${Date.now()}-${file.name}`;
    noteEl.textContent = 'Uploading photo...';
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (uploadError) { noteEl.textContent = 'Upload failed: ' + friendlyError(uploadError); return; }
    const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
    updates.photo_url = urlData.publicUrl;
  }

  if (editingId) {
    await sb.from('admin_posts').update(updates).eq('id', editingId);
  } else {
    await sb.from('admin_posts').insert(updates);
  }
  noteEl.textContent = '';
  resetAdminPostForm();
  renderAdminPosts();
  renderHomeHighlights();
});

function resetAdminPostForm() {
  document.getElementById('newAdminPostForm').reset();
  document.getElementById('editingAdminPostId').value = '';
  document.getElementById('newAdminPostFont').value = 'Inter';
  document.getElementById('newAdminPostBgColor').value = '#ffffff';
  document.getElementById('adminPostFormHeading').textContent = 'Post an update';
  document.getElementById('adminPostSubmitBtn').textContent = 'Post';
  document.getElementById('cancelAdminPostEdit').style.display = 'none';
  document.getElementById('adminPostUploadNote').textContent = '';
}
document.getElementById('cancelAdminPostEdit').addEventListener('click', resetAdminPostForm);

// ==========================================================================
// EVENTS & ANNOUNCEMENTS
// ==========================================================================
function formatEventDate(ev) {
  if (ev.event_on) {
    return new Date(ev.event_on + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return ev.event_date || 'Date not set';
}

async function renderEvents() {
  const container = document.getElementById('eventsList');
  const { data: events, error } = await sb.from('events').select('*').order('event_on', { ascending: true, nullsFirst: false });
  if (error) { console.error(error); return; }

  container.innerHTML = events.length ? events.map(ev => `
    <div class="post-card" data-item-id="${ev.id}" style="font-family:'${ev.font_family || 'Inter'}', sans-serif; background:${ev.bg_color || '#FFFFFF'};">
      ${ev.photo_url ? `<img src="${escapeHtml(ev.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${escapeHtml(formatEventDate(ev))}</span>
      <h3>${escapeHtml(ev.title)}</h3>
      <p>${linkify(ev.body)}</p>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="event-edit-btn" data-id="${ev.id}">${ICON_EDIT} Edit</button>
        <button class="event-delete-btn" data-id="${ev.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('') : emptyState('No events posted yet.', 'events');

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
  document.getElementById('newEventOn').value = ev.event_on || '';
  document.getElementById('newEventBody').value = ev.body;
  document.getElementById('newEventFont').value = ev.font_family || 'Inter';
  document.getElementById('newEventBgColor').value = ev.bg_color || '#ffffff';
  document.getElementById('eventFormHeading').textContent = 'Editing event';
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
  const event_on = document.getElementById('newEventOn').value;
  const body = document.getElementById('newEventBody').value.trim();
  const font_family = document.getElementById('newEventFont').value;
  const bg_color = document.getElementById('newEventBgColor').value;
  const editingId = document.getElementById('editingEventId').value;
  const fileInput = document.getElementById('newEventPhoto');
  const updates = { title, event_on, body, font_family, bg_color };
  const submitBtn = document.getElementById('eventSubmitBtn');

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `events/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (uploadError) { alert('Upload failed: ' + friendlyError(uploadError)); return; }
    const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
    updates.photo_url = urlData.publicUrl;
  }

  submitBtn.disabled = true;
  const { error } = editingId
    ? await sb.from('events').update(updates).eq('id', editingId)
    : await sb.from('events').insert(updates);
  submitBtn.disabled = false;

  if (error) { alert(friendlyError(error)); return; }

  resetEventForm();
  renderEvents();
  renderHomeHighlights();
});

function resetEventForm() {
  document.getElementById('newEventForm').reset();
  document.getElementById('editingEventId').value = '';
  document.getElementById('newEventFont').value = 'Inter';
  document.getElementById('newEventBgColor').value = '#ffffff';
  document.getElementById('eventFormHeading').textContent = 'Post an event';
  document.getElementById('eventSubmitBtn').textContent = 'Publish';
  document.getElementById('cancelEventEdit').style.display = 'none';
}
document.getElementById('cancelEventEdit').addEventListener('click', resetEventForm);

// ==========================================================================
// LIBRARY (books)
// ==========================================================================
let allLibraryItems = [];
let librarySearchTerm = '';
let libraryFilter = 'all';
let currentShelfCourse = undefined; // undefined = shelf grid showing; null = "General" (no course filter); string = a specific course

const LIBRARY_COURSES = [
  { name: 'ICT', icon: `<svg viewBox="0 0 24 24" fill="none"><rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M9.5 7V4M14.5 7V4M9.5 20V17M14.5 20V17M7 9.5H4M7 14.5H4M20 9.5H17M20 14.5H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, accent: '#3d6bd8' },
  { name: 'Administrative Studies', icon: `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="8" width="16" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 8V6.5C8.5 5.4 9.4 4.5 10.5 4.5H13.5C14.6 4.5 15.5 5.4 15.5 6.5V8" stroke="currentColor" stroke-width="1.5"/><path d="M4 12.5H20" stroke="currentColor" stroke-width="1.5"/></svg>`, accent: '#8a6f3f' },
  { name: 'CRJ', icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 16L15 5C15.8 4.2 17.1 4.2 17.9 5L19 6.1C19.8 6.9 19.8 8.2 19 9L8 20L4 21L5 17Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13.5 6.5L17.5 10.5" stroke="currentColor" stroke-width="1.4"/></svg>`, accent: '#8c5a2b' },
  { name: 'Bricklaying', icon: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="7" height="4.2" stroke="currentColor" stroke-width="1.4"/><rect x="13" y="6" width="7" height="4.2" stroke="currentColor" stroke-width="1.4"/><rect x="8.2" y="10.6" width="7" height="4.2" stroke="currentColor" stroke-width="1.4"/><rect x="3.5" y="15.2" width="7" height="4.2" stroke="currentColor" stroke-width="1.4"/><rect x="13" y="15.2" width="7" height="4.2" stroke="currentColor" stroke-width="1.4"/></svg>`, accent: '#b5602f' },
  { name: 'Community Development', icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="8.5" cy="9" r="2.3" stroke="currentColor" stroke-width="1.5"/><circle cx="15.5" cy="9" r="2.3" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 19C3.5 15.9 5.7 13.8 8.5 13.8C11.3 13.8 13.5 15.9 13.5 19M10.5 19C10.5 16.2 12.5 14.1 15 14.1C17.7 14.1 20.5 16.2 20.5 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, accent: '#3d8a5c' },
  { name: 'Public Health', icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 4 15.6 4 9.8C4 6.9 6.2 4.8 8.8 4.8C10.2 4.8 11.4 5.5 12 6.5C12.6 5.5 13.8 4.8 15.2 4.8C17.8 4.8 20 6.9 20 9.8C20 15.6 12 21 12 21Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 11.5H11L12 9.5L13 13.5L14 11.5H15.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`, accent: '#2f9c93' },
  { name: 'Automobile', icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M12 4V6.5M12 17.5V20M4 12H6.5M17.5 12H20M6.5 6.5L8.3 8.3M15.7 15.7L17.5 17.5M6.5 17.5L8.3 15.7M15.7 8.3L17.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, accent: '#5a5a5a' },
];

(function populateBookCourseSelect() {
  const sel = document.getElementById('newBookCourse');
  if (!sel) return;
  sel.innerHTML = '<option value="">General only (no specific course)</option>' +
    LIBRARY_COURSES.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
})();

function shelfIconIntoIcon(name) {
  const c = LIBRARY_COURSES.find(x => x.name === name);
  return c ? c.icon : '';
}

function renderLibraryShelves() {
  const grid = document.getElementById('shelfGrid');
  if (!grid) return;
  const generalCount = allLibraryItems.length;
  const cards = [`
    <div class="shelf-card shelf-card--general" data-course="" tabindex="0">
      <div class="shelf-card__icon"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H10V20H5.5C4.7 20 4 19.3 4 18.5V5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 4H18.5C19.3 4 20 4.7 20 5.5V18.5C20 19.3 19.3 20 18.5 20H10" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13.5 8H16.5M13.5 11H16.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></div>
      <h3 class="shelf-card__name">General Shelf</h3>
      <div class="shelf-card__meta"><span class="dot"></span>${generalCount} item${generalCount === 1 ? '' : 's'} &middot; everything</div>
    </div>`];
  LIBRARY_COURSES.forEach(c => {
    const count = allLibraryItems.filter(b => b.course === c.name).length;
    cards.push(`
      <div class="shelf-card" data-course="${escapeHtml(c.name)}" style="--shelf-accent:${c.accent}" tabindex="0">
        <div class="shelf-card__icon">${c.icon}</div>
        <h3 class="shelf-card__name">${escapeHtml(c.name)}</h3>
        <div class="shelf-card__meta"><span class="dot"></span>${count} item${count === 1 ? '' : 's'}</div>
      </div>`);
  });
  grid.innerHTML = cards.join('');
  grid.querySelectorAll('.shelf-card').forEach(card => {
    card.addEventListener('click', () => openShelf(card.dataset.course));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openShelf(card.dataset.course); } });
  });
}

function openShelf(course) {
  currentShelfCourse = course || null;
  document.getElementById('libraryShelvesView').style.display = 'none';
  document.getElementById('libraryShelfDetail').style.display = 'block';
  document.getElementById('shelfDetailTitle').textContent = course || 'General Shelf';
  librarySearchTerm = '';
  document.getElementById('librarySearchInput').value = '';
  libraryFilter = 'all';
  document.querySelectorAll('.library-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === 'all'));
  renderLibraryTable();
  pushNavHistory(showLibraryShelvesGrid);
}

function showLibraryShelvesGrid() {
  currentShelfCourse = undefined;
  document.getElementById('libraryShelfDetail').style.display = 'none';
  document.getElementById('libraryShelvesView').style.display = 'block';
  renderLibraryShelves();
}
document.getElementById('shelfBackBtn').addEventListener('click', goBackNav);

async function renderBooks() {
  const { data: items, error } = await sb.from('books').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allLibraryItems = items;
  renderLibraryShelves();
  if (currentShelfCourse !== undefined) renderLibraryTable();
}

const ICON_PAPER = `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M6 3.5H12L15 6.5V16.5H6V3.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 9.5H13M8 12.5H13M8 6.5H10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;

function matchesLibrarySearch(item, term) {
  if (!term) return true;
  return (item.title + ' ' + item.author).toLowerCase().includes(term.toLowerCase());
}

function libraryRowHtml(b) {
  const isPaper = b.category === 'past_paper';
  const addedDate = new Date(b.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `
    <tr>
      <td>
        <div class="library-table__title-cell">
          <div class="library-table__icon ${isPaper ? 'library-table__icon--paper' : ''}">${isPaper ? ICON_PAPER : NAV_ICONS.library}</div>
          <div>
            <span class="library-table__title">${escapeHtml(b.title)}</span>
            ${b.course ? `<span class="library-table__course">${escapeHtml(b.course)}</span>` : ''}
          </div>
        </div>
      </td>
      <td>${escapeHtml(b.author)}</td>
      <td><span class="library-table__type-badge library-table__type-badge--${isPaper ? 'paper' : 'book'}">${isPaper ? 'Past Paper' : 'Book'}</span></td>
      <td class="library-table__hide-mobile"><span class="library-table__desc">${escapeHtml(b.description)}</span></td>
      <td class="library-table__hide-mobile">${addedDate}</td>
      <td>
        <div class="library-table__actions">
          ${b.file_url ? `<a href="${escapeHtml(b.file_url)}" target="_blank" rel="noopener" title="Open">${NAV_ICONS.downloads}</a>` : ''}
          ${canManageContent(currentUser) ? `
            <button class="book-edit-btn" data-id="${b.id}" title="Edit">${ICON_EDIT}</button>
            <button class="book-delete-btn" data-id="${b.id}" title="Delete">${ICON_DELETE}</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

function renderLibraryTable() {
  const tbody = document.getElementById('libraryTableBody');
  const emptyStateEl = document.getElementById('libraryEmptyState');
  const filtered = allLibraryItems
    .filter(b => currentShelfCourse === null || currentShelfCourse === undefined || b.course === currentShelfCourse)
    .filter(b => libraryFilter === 'all' || b.category === libraryFilter)
    .filter(b => matchesLibrarySearch(b, librarySearchTerm));

  if (!filtered.length) {
    tbody.innerHTML = '';
    emptyStateEl.style.display = 'block';
    emptyStateEl.innerHTML = librarySearchTerm
      ? emptyState('No items match your search.', 'library')
      : emptyState('Nothing on this shelf yet.', 'library');
    return;
  }
  emptyStateEl.style.display = 'none';
  tbody.innerHTML = filtered.map(libraryRowHtml).join('');

  tbody.querySelectorAll('.book-edit-btn').forEach(btn => {
    const book = allLibraryItems.find(x => x.id === btn.dataset.id);
    btn.addEventListener('click', () => editBook(book));
  });
  tbody.querySelectorAll('.book-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteBook(btn.dataset.id));
  });
}

document.getElementById('librarySearchInput').addEventListener('input', (e) => {
  librarySearchTerm = e.target.value.trim();
  renderLibraryTable();
});
document.querySelectorAll('.library-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.library-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    libraryFilter = tab.dataset.filter;
    renderLibraryTable();
  });
});

function editBook(book) {
  if (!book) return;
  switchView('admin');
  document.getElementById('editingBookId').value = book.id;
  document.getElementById('newBookCategory').value = book.category || 'book';
  document.getElementById('newBookTitle').value = book.title;
  document.getElementById('newBookAuthor').value = book.author;
  document.getElementById('newBookDesc').value = book.description;
  document.getElementById('newBookCourse').value = book.course || '';
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
  const course = document.getElementById('newBookCourse').value || null;
  const editingId = document.getElementById('editingBookId').value;
  const fileInput = document.getElementById('newBookFile');
  const noteEl = document.getElementById('bookUploadNote');
  const updates = { category, title, author, description, course };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `books/${Date.now()}-${file.name}`;
    noteEl.textContent = 'Uploading file...';
    const { error: uploadError } = await sb.storage.from('site-files').upload(path, file);
    if (uploadError) { noteEl.textContent = 'Upload failed: ' + friendlyError(uploadError); return; }
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
  document.getElementById('newBookCourse').value = '';
  document.getElementById('bookFormHeading').textContent = 'Add a library item';
  document.getElementById('bookSubmitBtn').textContent = 'Add item';
  document.getElementById('cancelBookEdit').style.display = 'none';
  document.getElementById('bookUploadNote').textContent = '';
}
document.getElementById('cancelBookEdit').addEventListener('click', resetBookForm);

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
  const topEl = document.getElementById('topSongsList');
  const moreEl = document.getElementById('moreSongsList');
  const moreHeading = document.getElementById('moreSongsHeading');
  const noteEl = document.getElementById('votingWindowNote');

  const { data: songs, error } = await sb.from('open_mic_songs').select('*').order('uploaded_at', { ascending: false });
  if (error) { console.error(error); return; }
  allSongs = songs;

  const weekStart = getWeekStart();
  const votingOpen = isVotingOpen();
  noteEl.textContent = votingOpen
    ? "Voting is open now through Friday — pick your favorite! Only the vote count is ever shown, never who voted."
    : "Voting opens Wednesday and runs through Friday each week.";

  // This week's vote counts (feeds the "Song of the Week" widget on Home) — counts only, never identities
  const { data: counts } = await sb.rpc('get_song_vote_counts', { p_week_start: weekStart });
  songVoteCounts = {};
  (counts || []).forEach(c => { songVoteCounts[c.song_id] = c.vote_count; });

  // All-time total votes — this is what decides the Top 10 ranking
  const { data: totals } = await sb.rpc('get_song_total_votes');
  const totalVotesMap = {};
  (totals || []).forEach(t => { totalVotesMap[t.song_id] = t.total_votes; });

  if (currentUser) {
    const { data: myVote } = await sb.from('song_votes').select('*').eq('user_id', currentUser.id).eq('week_start', weekStart).maybeSingle();
    myCurrentVote = myVote || null;
  }

  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const premiere = songs.filter(s => (now - new Date(s.uploaded_at).getTime()) < twoDaysMs);
  const rest = songs
    .filter(s => (now - new Date(s.uploaded_at).getTime()) >= twoDaysMs)
    .map(s => ({ ...s, __votes: totalVotesMap[s.id] || 0 }))
    .sort((a, b) => b.__votes - a.__votes);

  const top10 = rest.slice(0, 10);
  const overflow = rest.slice(10);

  premiereEl.innerHTML = premiere.length
    ? premiere.map(s => songCardHtml(s)).join('')
    : emptyState('No new songs this week.', 'openmic');
  topEl.innerHTML = top10.length
    ? top10.map((s, i) => songCardHtml(s, i + 1)).join('')
    : emptyState('No ranked songs yet — votes will decide the Top 10.', 'openmic');

  if (overflow.length) {
    moreHeading.style.display = 'block';
    moreEl.innerHTML = overflow.map(s => songCardHtml(s)).join('');
  } else {
    moreHeading.style.display = 'none';
    moreEl.innerHTML = '';
  }

  [premiereEl, topEl, moreEl].forEach(container => {
    container.querySelectorAll('.song-card__vote-btn').forEach(btn => {
      btn.addEventListener('click', () => castVote(btn.dataset.id));
    });
    container.querySelectorAll('.song-pin-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleSongPin(btn.dataset.id, !btn.classList.contains('pinned')));
    });
    container.querySelectorAll('.song-edit-btn').forEach(btn => {
      const song = allSongs.find(s => s.id === btn.dataset.id);
      btn.addEventListener('click', () => editSong(song));
    });
    container.querySelectorAll('.song-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteSong(btn.dataset.id));
    });
  });

  renderPinnedOpenMic();
}

async function toggleSongPin(id, pin) {
  await sb.from('open_mic_songs').update({ pinned: pin }).eq('id', id);
  renderSongs();
}

// Shows admin-pinned songs on the Home page, same treatment as Pinned Posts
let hasPinnedPosts = false;
let hasPinnedSongs = false;
function updatePinnedHeadVisibility() {
  const head = document.getElementById('pinnedHead');
  const badge = document.getElementById('pinnedHeadBadge');
  if (head) head.style.display = (hasPinnedPosts || hasPinnedSongs) ? 'flex' : 'none';
  // Only staff should know these items are pinned — students just see them as "Featured"
  if (badge) badge.style.display = canManageContent(currentUser) ? 'inline-block' : 'none';
}

async function renderPinnedOpenMic() {
  const list = document.getElementById('pinnedOpenMicList');
  const pinned = allSongs.filter(s => s.pinned);

  hasPinnedSongs = pinned.length > 0;
  updatePinnedHeadVisibility();
  if (!pinned.length) { list.innerHTML = ''; return; }
  list.innerHTML = pinned.map(s => songCardHtml(s)).join('');
  list.querySelectorAll('.song-card__vote-btn').forEach(btn => {
    btn.addEventListener('click', () => castVote(btn.dataset.id));
  });
  list.querySelectorAll('.song-pin-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleSongPin(btn.dataset.id, !btn.classList.contains('pinned')));
  });
  list.querySelectorAll('.song-edit-btn').forEach(btn => {
    const song = allSongs.find(s => s.id === btn.dataset.id);
    btn.addEventListener('click', () => editSong(song));
  });
  list.querySelectorAll('.song-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteSong(btn.dataset.id));
  });
}

function songCardHtml(s, rank) {
  const count = songVoteCounts[s.id] || 0;
  const hasVoted = myCurrentVote && myCurrentVote.song_id === s.id;
  const votingOpen = isVotingOpen();
  const rankBadge = rank ? `<span class="song-card__rank ${rank <= 3 ? 'song-card__rank--top3' : ''}">${rank}</span>` : '';
  return `
    <div class="song-card" data-item-id="${s.id}" style="font-family:'${s.font_family || 'Inter'}', sans-serif; background:${s.bg_color || '#FFFFFF'};">
      ${rankBadge}
      <div class="song-card__top">
        <div>
          <h3>${s.cover_url ? `<img src="${escapeHtml(s.cover_url)}" alt="" class="song-card__cover" />` : ''}${escapeHtml(s.title)}</h3>
          <p class="artist">${escapeHtml(s.artist)}</p>
        </div>
        ${canManageContent(currentUser) ? `
        <div class="item-admin-controls">
          <button class="song-pin-btn ${s.pinned ? 'pinned' : ''}" data-id="${s.id}">${s.pinned ? 'Unpin' : 'Pin to Home'}</button>
          <button class="song-edit-btn" data-id="${s.id}">${ICON_EDIT} Edit</button>
          <button class="song-delete-btn" data-id="${s.id}">${ICON_DELETE} Delete</button>
        </div>` : ''}
      </div>
      <audio controls src="${escapeHtml(s.file_url)}"></audio>
      <div class="song-card__vote-row">
        ${votingOpen ? `<button class="song-card__vote-btn ${hasVoted ? 'voted' : ''}" data-id="${s.id}">${hasVoted ? 'Voted' : 'Vote for this'}</button>` : ''}
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
  if (error) { alert(friendlyError(error)); return; }
  renderSongs();
}

function editSong(song) {
  if (!song) return;
  switchView('admin');
  document.getElementById('editingSongId').value = song.id;
  document.getElementById('newSongTitle').value = song.title;
  document.getElementById('newSongArtist').value = song.artist;
  document.getElementById('newSongFont').value = song.font_family || 'Inter';
  document.getElementById('newSongBgColor').value = song.bg_color || '#ffffff';
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
  const font_family = document.getElementById('newSongFont').value;
  const bg_color = document.getElementById('newSongBgColor').value;
  const editingId = document.getElementById('editingSongId').value;
  const fileInput = document.getElementById('newSongFile');
  const noteEl = document.getElementById('songUploadNote');
  const updates = { title, artist, font_family, bg_color };

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `songs/${Date.now()}-${file.name}`;
    noteEl.textContent = 'Uploading audio...';
    const { error: uploadError } = await sb.storage.from('site-files').upload(path, file);
    if (uploadError) { noteEl.textContent = 'Upload failed: ' + friendlyError(uploadError); return; }
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
  document.getElementById('newSongFont').value = 'Inter';
  document.getElementById('newSongBgColor').value = '#ffffff';
  document.getElementById('songFormHeading').textContent = 'Upload a song/poetry';
  document.getElementById('songSubmitBtn').textContent = 'Upload';
  document.getElementById('cancelSongEdit').style.display = 'none';
  document.getElementById('songUploadNote').textContent = '';
}
document.getElementById('cancelSongEdit').addEventListener('click', resetSongForm);

// --- Song of the Week widget on Home ---
async function renderSongOfWeek() {
  const card = document.getElementById('songOfWeekCard');
  card.style.display = 'block';
  const { data, error } = await sb.rpc('get_latest_song_of_week');

  if (error || !data || data.length === 0) {
    card.innerHTML = `
      <div class="card-label">Song of the Week</div>
      <h2>No song of the week yet.</h2>
      <p>Cast the first vote once Open Mic voting opens (Wed–Fri).</p>
      <a class="link" href="#" onclick="switchView('openmic'); return false;">Go to Open Mic →</a>
    `;
    return;
  }

  const winner = data[0];
  const { data: song, error: songError } = await sb.from('open_mic_songs').select('*').eq('id', winner.song_id).single();
  if (songError || !song) {
    card.innerHTML = `
      <div class="card-label">Song of the Week</div>
      <h2>No song of the week yet.</h2>
      <p>Cast the first vote once Open Mic voting opens (Wed–Fri).</p>
      <a class="link" href="#" onclick="switchView('openmic'); return false;">Go to Open Mic →</a>
    `;
    return;
  }

  card.style.fontFamily = `'${song.font_family || 'Inter'}', sans-serif`;
  const votingOpen = isVotingOpen();
  const artStyle = song.cover_url ? `background-image: url('${escapeHtml(song.cover_url)}'); background-size: cover; background-position: center;` : '';
  card.innerHTML = `
    <div class="card-label">Song of the Week</div>
    <a href="#" class="teaser-link" onclick="goToContent('openmic','${song.id}'); return false;">
      <div class="song-art" style="${artStyle}">
        ${votingOpen ? `<button class="vote-btn" id="homeVoteBtn" data-id="${song.id}">▲ Vote</button>` : ''}
      </div>
      <h2>${escapeHtml(song.title)}</h2>
    </a>
    <p>${escapeHtml(song.artist)}</p>
    <div class="stat-strip"><span>Votes so far</span><b>${winner.vote_count}</b></div>
    <button type="button" class="teaser-cta" onclick="goToContent('openmic','${song.id}')">Go to Open Mic
      <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `;
  const voteBtn = document.getElementById('homeVoteBtn');
  if (voteBtn) voteBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); castVote(voteBtn.dataset.id).then(renderSongOfWeek); });
}

// ==========================================================================
// STUDENT SPOTLIGHT — poems, blogs, articles (with admin approval + likes)
// ==========================================================================
const WORD_LIMITS = {
  Poem: [20, 200],
  Blog: [150, 600],
  Article: [250, 800]
};

let writingFilter = 'all';
let myWritingLikes = new Set();

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function updateWordCount() {
  const type = document.getElementById('writingType').value;
  const content = document.getElementById('writingContent').value;
  const words = countWords(content);
  const [min, max] = WORD_LIMITS[type];
  const el = document.getElementById('writingWordCount');
  el.textContent = `${words} words — recommended ${min}–${max} for a ${type.toLowerCase()}`;
  el.classList.toggle('out-of-range', words > 0 && (words < min || words > max));
}
document.getElementById('writingType').addEventListener('change', updateWordCount);
document.getElementById('writingContent').addEventListener('input', updateWordCount);

// --- Tab switching (Browse / Submit / My submissions) ---
function showWritingTab(tab) {
  document.querySelectorAll('.writing-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('writingBrowsePanel').style.display = tab === 'browse' ? 'block' : 'none';
  document.getElementById('writingSubmitPanel').style.display = tab === 'submit' ? 'block' : 'none';
  document.getElementById('writingMinePanel').style.display = tab === 'mine' ? 'block' : 'none';
  document.getElementById('writing' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab').classList.add('active');
}
document.getElementById('writingBrowseTab').addEventListener('click', () => showWritingTab('browse'));
document.getElementById('writingSubmitTab').addEventListener('click', () => showWritingTab('submit'));
document.getElementById('writingMineTab').addEventListener('click', () => showWritingTab('mine'));

// --- Filter buttons (All / Poem / Blog / Article) ---
document.querySelectorAll('.writing-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.writing-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    writingFilter = btn.dataset.type;
    renderWritings();
  });
});

function writingCardHtml(w, likeCount, isLiked, showStatus) {
  const tagsHtml = w.tags ? `<p class="writing-tags">Tags: ${escapeHtml(w.tags)}</p>` : '';
  const statusHtml = showStatus
    ? `<span class="writing-card__status writing-card__status--${w.status}">${w.status}</span>`
    : '';
  return `
    <div class="writing-card" data-item-id="${w.id}">
      <div class="writing-card__top">
        <div>
          <span class="writing-card__type">${escapeHtml(w.type)}</span>
          <h3>${escapeHtml(w.title)}</h3>
          <p class="writing-author">By ${escapeHtml(w.author_name)} &middot; ${new Date(w.created_at).toLocaleDateString()}</p>
        </div>
        ${statusHtml}
      </div>
      ${w.description ? `<p class="writing-description">${escapeHtml(w.description)}</p>` : ''}
      <div class="writing-card__content">${escapeHtml(w.content)}</div>
      ${tagsHtml}
      ${w.status === 'approved' ? `
      <div class="post-card__actions" style="margin-top:14px;">
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-writing-id="${w.id}">${ICON_LIKE} ${likeCount} Like${likeCount === 1 ? '' : 's'}</button>
      </div>` : ''}
      ${canManageContent(currentUser) && w.status !== 'pending' ? `
      <div class="item-admin-controls">
        <button class="writing-delete-btn" data-id="${w.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `;
}

async function renderWritings() {
  const container = document.getElementById('writingBrowseList');
  let query = sb.from('writings').select('*').eq('status', 'approved').order('created_at', { ascending: false });
  if (writingFilter !== 'all') query = query.eq('type', writingFilter);
  const { data: writings, error } = await query;
  if (error) { console.error(error); return; }

  const ids = writings.map(w => w.id);
  let likes = [];
  if (ids.length) {
    const { data: likeRows } = await sb.from('writing_likes').select('*').in('writing_id', ids);
    likes = likeRows || [];
  }
  if (currentUser) myWritingLikes = new Set(likes.filter(l => l.user_id === currentUser.id).map(l => l.writing_id));

  container.innerHTML = writings.length
    ? writings.map(w => {
        const count = likes.filter(l => l.writing_id === w.id).length;
        return writingCardHtml(w, count, myWritingLikes.has(w.id), false);
      }).join('')
    : emptyState('Nothing has been published here yet — be the first to share your writing.', 'spotlight',
        '<button type="button" class="btn btn--primary" onclick="showWritingTab(\'submit\')">Submit yours</button>');

  container.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleWritingLike(btn.dataset.writingId));
  });
  container.querySelectorAll('.writing-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteWriting(btn.dataset.id));
  });
}

async function toggleWritingLike(writingId) {
  if (!currentUser) return;
  if (myWritingLikes.has(writingId)) {
    await sb.from('writing_likes').delete().eq('writing_id', writingId).eq('user_id', currentUser.id);
  } else {
    await sb.from('writing_likes').insert({ writing_id: writingId, user_id: currentUser.id });
  }
  renderWritings();
}

async function renderMyWritings() {
  const container = document.getElementById('writingMineList');
  if (!currentUser) return;
  const { data: writings, error } = await sb.from('writings').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = writings.length
    ? writings.map(w => writingCardHtml(w, 0, false, true)).join('')
    : emptyState("You haven't submitted anything yet.", 'spotlight',
        '<button type="button" class="btn btn--primary" onclick="showWritingTab(\'submit\')">Write your first piece</button>');

  container.querySelectorAll('.writing-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteWriting(btn.dataset.id));
  });
}

async function deleteWriting(id) {
  if (!confirm('Delete this submission permanently?')) return;
  await sb.from('writings').delete().eq('id', id);
  renderWritings();
  renderMyWritings();
  if (canManageContent(currentUser)) renderPendingWritings();
}

document.getElementById('newWritingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const type = document.getElementById('writingType').value;
  const title = document.getElementById('writingTitle').value.trim();
  const content = document.getElementById('writingContent').value.trim();
  const description = document.getElementById('writingDescription').value.trim();
  const tags = document.getElementById('writingTags').value.trim();
  const category = document.getElementById('writingCategory').value.trim();
  const noteEl = document.getElementById('writingSubmitNote');

  const { error } = await sb.from('writings').insert({
    user_id: currentUser.id, author_name: currentUser.name,
    type, title, content, description, tags, category, status: 'pending'
  });
  if (error) { noteEl.textContent = friendlyError(error); return; }

  e.target.reset();
  document.getElementById('writingWordCount').textContent = '';
  noteEl.textContent = "Submitted! An admin will review it before it appears publicly.";
  setTimeout(() => noteEl.textContent = '', 5000);
  renderMyWritings();
  showWritingTab('mine');
});

// --- Admin moderation ---
async function renderPendingWritings() {
  const container = document.getElementById('pendingWritingsList');
  const countEl = document.getElementById('pendingWritingsCount');
  const { data: pending, error } = await sb.from('writings').select('*').eq('status', 'pending').order('created_at', { ascending: true });
  if (error) { console.error(error); return; }

  countEl.textContent = pending.length;
  container.innerHTML = pending.length
    ? pending.map(w => `
      <div class="writing-card">
        <span class="writing-card__type">${escapeHtml(w.type)}</span>
        <h3>${escapeHtml(w.title)}</h3>
        <p class="writing-author">By ${escapeHtml(w.author_name)} &middot; ${new Date(w.created_at).toLocaleDateString()}</p>
        ${w.description ? `<p class="writing-description">${escapeHtml(w.description)}</p>` : ''}
        <div class="writing-card__content">${escapeHtml(w.content)}</div>
        <div class="item-admin-controls">
          <button class="writing-approve-btn" data-id="${w.id}">Approve</button>
          <button class="writing-reject-btn" data-id="${w.id}">Reject</button>
        </div>
      </div>
    `).join('')
    : emptyState('Nothing waiting for review.', 'admin');

  container.querySelectorAll('.writing-approve-btn').forEach(btn => {
    btn.addEventListener('click', () => moderateWriting(btn.dataset.id, 'approved'));
  });
  container.querySelectorAll('.writing-reject-btn').forEach(btn => {
    btn.addEventListener('click', () => moderateWriting(btn.dataset.id, 'rejected'));
  });
}

async function moderateWriting(id, status) {
  await sb.from('writings').update({ status }).eq('id', id);
  renderPendingWritings();
  renderWritings();
}

// ==========================================================================
// SPORTS
// ==========================================================================
async function renderSports() {
  const container = document.getElementById('sportsList');
  const { data: sports, error } = await sb.from('sports').select('*').eq('section', 'update').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = sports.length ? sports.map(s => `
    <div class="post-card" data-item-id="${s.id}" style="font-family:'${s.font_family || 'Inter'}', sans-serif; background:${s.bg_color || '#FFFFFF'};">
      ${s.photo_url ? `<img src="${escapeHtml(s.photo_url)}" alt="" class="post-card__photo" />` : ''}
      <span class="post-card__date">${escapeHtml(s.event_date)}</span>
      <h3>${escapeHtml(s.title)}</h3>
      <p>${linkify(s.body)}</p>
      ${canManageSports(currentUser) ? `
      <div class="item-admin-controls">
        <button class="sports-edit-btn" data-id="${s.id}">${ICON_EDIT} Edit</button>
        <button class="sports-delete-btn" data-id="${s.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('') : emptyState('No sports updates yet.', 'sports');

  container.querySelectorAll('.sports-edit-btn').forEach(btn => {
    const item = sports.find(x => x.id === btn.dataset.id);
    btn.addEventListener('click', () => editSports(item));
  });
  container.querySelectorAll('.sports-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteSports(btn.dataset.id));
  });
}

function toggleSportsExtraFields() {
  const section = document.getElementById('newSportsSection').value;
  const extra = document.getElementById('newSportsExtraFields');
  const isFixture = section === 'fixture';
  extra.style.display = section === 'update' ? 'none' : 'block';
  document.getElementById('newSportsKind').style.display = isFixture ? '' : 'none';
  document.getElementById('newSportsKindLabel').style.display = isFixture ? '' : 'none';
}
document.getElementById('newSportsSection').addEventListener('change', toggleSportsExtraFields);

function editSports(item) {
  if (!item) return;
  document.getElementById('editingSportsId').value = item.id;
  document.getElementById('newSportsSection').value = item.section || 'update';
  document.getElementById('newSportsTitle').value = item.title;
  document.getElementById('newSportsDate').value = item.event_date;
  document.getElementById('newSportsBody').value = item.body;
  document.getElementById('newSportsCategory').value = item.category || '';
  document.getElementById('newSportsKind').value = item.kind || 'training';
  document.getElementById('newSportsSecondaryLabel').value = item.secondary_label || '';
  document.getElementById('newSportsAccentColor').value = item.accent_color || '#ff9900';
  document.getElementById('newSportsFont').value = item.font_family || 'Inter';
  document.getElementById('newSportsBgColor').value = item.bg_color || '#ffffff';
  toggleSportsExtraFields();
  document.getElementById('sportsFormHeading').textContent = 'Editing sports item';
  document.getElementById('sportsSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelSportsEdit').style.display = 'inline-block';
  document.getElementById('sportsAdminSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteSports(id) {
  if (!confirm('Delete this sports item? This cannot be undone.')) return;
  await sb.from('sports').delete().eq('id', id);
  renderSports();
  renderHomeHighlights();
  if (window.renderSportsPage) window.renderSportsPage();
}

document.getElementById('newSportsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const section = document.getElementById('newSportsSection').value;
  const title = document.getElementById('newSportsTitle').value.trim();
  const event_date = document.getElementById('newSportsDate').value.trim();
  const body = document.getElementById('newSportsBody').value.trim();
  const category = document.getElementById('newSportsCategory').value.trim();
  const kind = section === 'fixture' ? document.getElementById('newSportsKind').value : null;
  const secondary_label = document.getElementById('newSportsSecondaryLabel').value.trim();
  const accent_color = document.getElementById('newSportsAccentColor').value;
  const font_family = document.getElementById('newSportsFont').value;
  const bg_color = document.getElementById('newSportsBgColor').value;
  const editingId = document.getElementById('editingSportsId').value;
  const fileInput = document.getElementById('newSportsPhoto');
  const updates = {
    section, title, event_date, body, font_family, bg_color,
    category: category || null, kind, secondary_label: secondary_label || null,
    accent_color: accent_color || null, date_label: event_date
  };
  const submitBtn = document.getElementById('sportsSubmitBtn');

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `sports/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (uploadError) { alert('Upload failed: ' + friendlyError(uploadError)); return; }
    const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
    updates.photo_url = urlData.publicUrl;
  }

  submitBtn.disabled = true;
  const { error } = editingId
    ? await sb.from('sports').update(updates).eq('id', editingId)
    : await sb.from('sports').insert(updates);
  submitBtn.disabled = false;

  if (error) { alert(friendlyError(error)); return; }

  resetSportsForm();
  renderSports();
  renderHomeHighlights();
  if (window.renderSportsPage) window.renderSportsPage();
});

function resetSportsForm() {
  document.getElementById('newSportsForm').reset();
  document.getElementById('editingSportsId').value = '';
  document.getElementById('newSportsSection').value = 'update';
  document.getElementById('newSportsFont').value = 'Inter';
  document.getElementById('newSportsBgColor').value = '#ffffff';
  document.getElementById('newSportsAccentColor').value = '#ff9900';
  toggleSportsExtraFields();
  document.getElementById('sportsFormHeading').textContent = 'Post to the Sports tab';
  document.getElementById('sportsSubmitBtn').textContent = 'Publish';
  document.getElementById('cancelSportsEdit').style.display = 'none';
}

document.getElementById('sportsPotmForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const noteEl = document.getElementById('potmNote');
  const updates = {
    id: 1,
    name: document.getElementById('potmName').value.trim(),
    position_text: document.getElementById('potmPosition').value.trim(),
    match_text: document.getElementById('potmMatch').value.trim(),
    quote: document.getElementById('potmQuote').value.trim() || null,
    stat1_value: document.getElementById('potmStat1Value').value.trim() || null,
    stat1_label: document.getElementById('potmStat1Label').value.trim() || null,
    stat2_value: document.getElementById('potmStat2Value').value.trim() || null,
    stat2_label: document.getElementById('potmStat2Label').value.trim() || null,
    stat3_value: document.getElementById('potmStat3Value').value.trim() || null,
    stat3_label: document.getElementById('potmStat3Label').value.trim() || null,
    updated_at: new Date().toISOString()
  };

  const fileInput = document.getElementById('potmPhoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `sports/potm-${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (uploadError) { noteEl.textContent = friendlyError(uploadError); return; }
    const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
    updates.photo_url = urlData.publicUrl;
  }

  const { error } = await sb.from('sports_potm').upsert(updates);
  noteEl.textContent = error ? friendlyError(error) : 'Updated.';
  if (!error) {
    setTimeout(() => noteEl.textContent = '', 3000);
    if (window.renderSportsPage) window.renderSportsPage();
  }
});
document.getElementById('cancelSportsEdit').addEventListener('click', resetSportsForm);

// ==========================================================================
// CLUBS
// ==========================================================================
let allClubs = [];
let clubMemberCounts = {};
let myClubIds = new Set();           // clubs where current user is an APPROVED member (or manager)
let myClubMemberships = {};          // clubId -> 'pending' | 'approved' for current user
let myManagedClubIds = new Set();
let clubFilter = 'all';

function isClubManagerOf(clubId) {
  return canManageContent(currentUser) || myManagedClubIds.has(clubId);
}

// ---------- Deterministic per-club visual identity ----------
// Every club gets a stable hue + glyph derived from its own id/category, so
// newly created clubs automatically look distinct from one another without
// any manual styling.
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

const CLUB_GLYPHS = {
  academic: '<path d="M10 3L18 7.2L10 11.4L2 7.2L10 3Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 9.2V13.5C5.5 13.5 7 15.5 10 15.5C13 15.5 14.5 13.5 14.5 13.5V9.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.3 8V13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  sport: '<circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.4"/><path d="M10 2.8V17.2M2.8 10H17.2M4.5 5.2C6.6 6.6 8.3 6.8 10 6.8C11.7 6.8 13.4 6.6 15.5 5.2M4.5 14.8C6.6 13.4 8.3 13.2 10 13.2C11.7 13.2 13.4 13.4 15.5 14.8" stroke="currentColor" stroke-width="1.2"/>',
  creative: '<path d="M10 17.2C5.9 17.2 2.8 14 2.8 10.2C2.8 6 6.4 2.8 10.4 2.8C14 2.8 17.2 5.2 17.2 8.6C17.2 11 15.3 12.4 13.2 12.4H11.9C11 12.4 10.4 13.1 10.6 14C10.8 14.8 11 15.4 11 15.9C11 16.6 10.6 17.2 10 17.2Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="6.6" cy="9" r="1" fill="currentColor"/><circle cx="9.2" cy="6.2" r="1" fill="currentColor"/><circle cx="13.2" cy="7.6" r="1" fill="currentColor"/>',
  technology: '<rect x="6" y="6" width="8" height="8" rx="1.4" stroke="currentColor" stroke-width="1.4"/><rect x="8.4" y="8.4" width="3.2" height="3.2" rx="0.6" stroke="currentColor" stroke-width="1.2"/><path d="M10 2.8V5.4M10 14.6V17.2M2.8 10H5.4M14.6 10H17.2M4.5 4.5L6.3 6.3M13.7 13.7L15.5 15.5M4.5 15.5L6.3 13.7M13.7 6.3L15.5 4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  community: '<circle cx="7" cy="7.5" r="2.3" stroke="currentColor" stroke-width="1.4"/><circle cx="13.5" cy="8" r="1.9" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 16C2.8 12.9 4.7 11 7.2 11C9.3 11 11 12.3 11.5 14.3M11 12.8C11.7 12.1 12.6 11.8 13.5 11.8C15.6 11.8 17.2 13.4 17.2 16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  general: '<path d="M10 2.5L12 7.6L17.5 8L13.3 11.5L14.6 17L10 13.8L5.4 17L6.7 11.5L2.5 8L8 7.6L10 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'
};
const CLUB_HUES = { academic: 258, sport: 200, creative: 328, technology: 156, community: 30, general: 44 };
const CLUB_KEYWORDS = [
  [/acad|stud|stem|scien|math|debate|book/i, 'academic'],
  [/sport|athlet|football|basket|soccer|fitness|run/i, 'sport'],
  [/creat|art|drama|theatre|music|film|writ|photo|dance/i, 'creative'],
  [/tech|comput|coding|robot|digital|engineer|ai\b/i, 'technology'],
  [/commun|volunt|outreach|social|environ|charity/i, 'community']
];

function clubVisualTheme(c) {
  let key = 'general';
  for (const [re, k] of CLUB_KEYWORDS) { if (re.test(c.category || '') || re.test(c.title || '')) { key = k; break; } }
  const idHash = hashStr(c.id || c.title || '');
  const hue = (CLUB_HUES[key] + (idHash % 26) - 13 + 360) % 360;
  return { glyph: CLUB_GLYPHS[key], hue };
}

function clubCardHtml(c) {
  const managing = isClubManagerOf(c.id);
  const membership = myClubMemberships[c.id]; // undefined | 'pending' | 'approved'
  const isMember = managing || membership === 'approved';
  const isPending = !managing && membership === 'pending';
  const hasPhoto = !!c.photo_url;
  const theme = clubVisualTheme(c);
  const memberCount = clubMemberCounts[c.id] || 0;

  // A club a member has joined (or manages) can be opened like a WhatsApp
  // group; everyone else only ever sees a way to ask to join.
  const actionHtml = isMember
    ? `<button class="btn-link club-view-btn" data-id="${c.id}">Open club</button>`
    : isPending
      ? `<button class="club-join-btn pending" disabled>Requested</button>`
      : `<button class="club-join-btn" data-id="${c.id}">Join</button>`;

  const visual = hasPhoto
    ? ''
    : `<div class="club-card__visual"><div class="club-card__orb"></div><div class="club-card__glyph"><svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">${theme.glyph}</svg></div></div>`;

  const photoStyle = hasPhoto ? `--club-photo:url('${escapeHtml(c.photo_url).replace(/'/g, '%27')}');` : '';

  return `
    <div class="club-card ${hasPhoto ? 'has-photo' : ''}" data-club-id="${c.id}" data-category="${escapeHtml(c.category)}" style="--hue:${theme.hue};${photoStyle}">
      <div class="club-card__shadow"></div>
      <div class="club-card__stage">
        <div class="club-card__glass">
          <div class="club-card__glow"></div>
          ${visual}
          <div class="club-card__body">
            <span class="club-card__category">${escapeHtml(c.category)}</span>
            <h3>${escapeHtml(c.title)}</h3>
            <p>${linkify(c.description)}</p>
            <div class="club-card__stats"><span class="dot"></span>${memberCount} member${memberCount === 1 ? '' : 's'}</div>
            <div class="club-card__actions">${actionHtml}</div>
          </div>
        </div>
      </div>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="club-delete-btn" data-id="${c.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `;
}

// ---------- 3D tilt / glow / parallax / magnetic CTA ----------
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const supportsHoverTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let clubCardIO = null;

function wireClubCards3D(grid) {
  if (prefersReducedMotion) return;

  if (!clubCardIO && 'IntersectionObserver' in window) {
    clubCardIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.target.classList.toggle('is-inview', entry.isIntersecting));
    }, { threshold: 0.1 });
  }

  grid.querySelectorAll('.club-card').forEach((card, i) => {
    card.style.setProperty('--float-delay', `${(i % 5) * 0.35}s`);
    if (clubCardIO) clubCardIO.observe(card);
    if (!supportsHoverTilt) return; // touch devices keep idle float + tap feedback only

    const stage = card.querySelector('.club-card__stage');
    const glass = card.querySelector('.club-card__glass');
    const shadow = card.querySelector('.club-card__shadow');
    const joinBtn = card.querySelector('.club-join-btn');
    let rafId = null;

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rotateY = (px - 0.5) * 14;
        const rotateX = (0.5 - py) * 12;
        stage.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        glass.style.setProperty('--mx', `${px * 100}%`);
        glass.style.setProperty('--my', `${py * 100}%`);
        shadow.style.transform = `translate3d(${(px - 0.5) * -14}px, 0, 0) scale(1.08)`;
      });
    };

    const onEnter = () => card.classList.add('is-hovering');
    const onLeave = () => {
      card.classList.remove('is-hovering');
      if (rafId) cancelAnimationFrame(rafId);
      stage.style.transform = '';
      shadow.style.transform = '';
    };

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);

    // Magnetic pull on the primary CTA
    if (joinBtn) {
      joinBtn.addEventListener('pointermove', (e) => {
        const r = joinBtn.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) * 0.35;
        const my = (e.clientY - r.top - r.height / 2) * 0.35;
        joinBtn.style.transform = `translate(${mx}px, ${my}px)`;
      });
      joinBtn.addEventListener('pointerleave', () => { joinBtn.style.transform = ''; });
    }
  });
}

async function renderClubs() {
  const { data: clubs, error } = await sb.from('clubs').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allClubs = clubs;
  renderMyClubRequests();

  const [{ data: members }, { data: managers }] = await Promise.all([
    sb.from('club_members').select('*'),
    sb.from('club_managers').select('*')
  ]);
  clubMemberCounts = {};
  (members || []).forEach(m => {
    if (m.status === 'pending') return; // don't count people still waiting on approval
    clubMemberCounts[m.club_id] = (clubMemberCounts[m.club_id] || 0) + 1;
  });
  myClubMemberships = {};
  if (currentUser) {
    (members || []).filter(m => m.user_id === currentUser.id).forEach(m => { myClubMemberships[m.club_id] = m.status || 'approved'; });
    myClubIds = new Set(Object.keys(myClubMemberships).filter(id => myClubMemberships[id] === 'approved'));
    myManagedClubIds = new Set((managers || []).filter(m => m.user_id === currentUser.id).map(m => m.club_id));
  }

  // Category tabs — "All" plus whatever categories are actually in use
  const categories = [...new Set(clubs.map(c => c.category))];
  const tabsEl = document.getElementById('clubTabs');
  tabsEl.innerHTML = `<button class="club-tab ${clubFilter === 'all' ? 'active' : ''}" data-category="all">All</button>` +
    categories.map(cat => `<button class="club-tab ${clubFilter === cat ? 'active' : ''}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('');
  tabsEl.querySelectorAll('.club-tab').forEach(tab => {
    tab.addEventListener('click', () => { clubFilter = tab.dataset.category; renderClubGrid(); });
  });

  renderClubGrid();

  if (canManageContent(currentUser)) {
    const adminList = document.getElementById('adminClubsList');
    adminList.innerHTML = clubs.length
      ? clubs.map(c => `
        <div class="user-row">
          <span>${escapeHtml(c.title)} &middot; ${escapeHtml(c.category)}</span>
          <button class="btn-link club-delete-btn" data-id="${c.id}">Delete</button>
        </div>
      `).join('')
      : emptyState('No clubs created yet.', 'clubs');
    adminList.querySelectorAll('.club-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteClub(btn.dataset.id));
    });

    renderManagerControls(clubs, managers || []);
  }
}

function renderClubGrid() {
  const grid = document.getElementById('clubGrid');
  const filtered = clubFilter === 'all' ? allClubs : allClubs.filter(c => c.category === clubFilter);
  grid.innerHTML = filtered.length ? filtered.map(clubCardHtml).join('') : emptyState('No clubs in this category yet.', 'clubs');

  grid.querySelectorAll('.club-join-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleClubJoin(btn));
  });
  grid.querySelectorAll('.club-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteClub(btn.dataset.id));
  });
  grid.querySelectorAll('.club-view-btn').forEach(btn => {
    btn.addEventListener('click', () => openClubHome(btn.dataset.id));
  });

  wireClubCards3D(grid);
}

// Manager/member management is used from the club's own Admin Panel now
// (see club-room.js), but these two actions stay here since they touch the
// same club_managers / club_members tables the rest of this file uses.
async function toggleClubManagerStatus(clubId, userId, isCurrentlyManager) {
  if (isCurrentlyManager) {
    if (!confirm('Remove this person as a manager of the club?')) return;
    await sb.from('club_managers').delete().eq('club_id', clubId).eq('user_id', userId);
  } else {
    await sb.from('club_managers').insert({ club_id: clubId, user_id: userId });
  }
  if (typeof renderClubAdminMembers === 'function') renderClubAdminMembers(clubId);
}

async function removeClubMember(clubId, userId) {
  if (!confirm('Remove this member from the club?')) return;
  await sb.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId);
  if (currentUser && currentUser.id === userId) myClubIds.delete(clubId);
  if (typeof renderClubAdminMembers === 'function') renderClubAdminMembers(clubId);
  renderClubGrid();
}

async function toggleClubJoin(button) {
  if (!currentUser || button.disabled || button.classList.contains('pending')) return;
  const clubId = button.dataset.id;
  const club = allClubs.find(c => c.id === clubId);
  const approvalRequired = !(club && club.join_mode === 'open');

  button.disabled = true;
  const priorLabel = button.textContent;
  button.textContent = approvalRequired ? 'Requesting…' : 'Joining…';

  const { error } = await sb.from('club_members').insert({
    club_id: clubId, user_id: currentUser.id, status: approvalRequired ? 'pending' : 'approved'
  });
  if (error) {
    button.disabled = false;
    button.textContent = priorLabel;
    alert(friendlyError(error));
    return;
  }

  myClubMemberships[clubId] = approvalRequired ? 'pending' : 'approved';
  if (!approvalRequired) {
    myClubIds.add(clubId);
    clubMemberCounts[clubId] = (clubMemberCounts[clubId] || 0) + 1;
  }

  // Re-render so the card/header flips straight to "Requested" or "Open club".
  renderClubGrid();
  if (typeof renderClubHomeHeader === 'function' && currentClubId === clubId) renderClubHomeHeader();
}

async function deleteClub(clubId) {
  if (!canManageContent(currentUser)) return;
  if (!confirm('Delete this club? This cannot be undone.')) return;
  const { error } = await sb.from('clubs').delete().eq('id', clubId);
  if (error) { alert(friendlyError(error)); return; }
  renderClubs();
}

// ==========================================================================
// CLUB REQUESTS — students propose a new club, admin approves or rejects
// ==========================================================================
document.getElementById('showClubRequestFormBtn').addEventListener('click', () => {
  document.getElementById('clubRequestPanel').style.display = 'block';
});
document.getElementById('cancelClubRequest').addEventListener('click', () => {
  document.getElementById('clubRequestPanel').style.display = 'none';
});

document.getElementById('clubRequestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const noteEl = document.getElementById('clubRequestNote');
  const club_name = document.getElementById('clubRequestName').value.trim();
  const category = document.getElementById('clubRequestCategory').value;
  const description = document.getElementById('clubRequestDescription').value.trim();
  const starting_members = document.getElementById('clubRequestMembers').value.trim();

  const memberLines = starting_members.split('\n').map(l => l.trim()).filter(Boolean);
  if (memberLines.length < 2) {
    noteEl.textContent = 'List at least 2 starting members, one per line.';
    return;
  }
  if (memberLines.length > 4) {
    noteEl.textContent = 'List at most 4 starting members.';
    return;
  }

  const { error } = await sb.from('club_requests').insert({
    requested_by: currentUser.id, club_name, category, description, starting_members
  });
  if (error) { noteEl.textContent = friendlyError(error); return; }

  e.target.reset();
  document.getElementById('clubRequestPanel').style.display = 'none';
  noteEl.textContent = '';
  renderMyClubRequests();
});

function clubRequestCardHtml(r, forAdmin) {
  const statusClass = `club-request-card__status--${r.status}`;
  return `
    <div class="club-request-card">
      <span class="club-request-card__status ${statusClass}">${r.status}</span>
      <h3>${escapeHtml(r.club_name)}</h3>
      <p style="font-size:0.8rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.02em;">${escapeHtml(r.category)}</p>
      <p>${linkify(r.description)}</p>
      <div class="club-request-card__members">${escapeHtml(r.starting_members)}</div>
      ${r.admin_note ? `<p class="club-request-card__note">Admin note: ${escapeHtml(r.admin_note)}</p>` : ''}
      ${forAdmin ? `
        <div class="item-admin-controls">
          <button class="club-request-approve-btn" data-id="${r.id}">Approve</button>
          <button class="club-request-reject-btn" data-id="${r.id}">Reject</button>
        </div>
      ` : ''}
    </div>
  `;
}

async function renderMyClubRequests() {
  const panel = document.getElementById('myClubRequestsPanel');
  if (!currentUser) { panel.innerHTML = ''; return; }
  const { data: requests, error } = await sb.from('club_requests').select('*').eq('requested_by', currentUser.id).order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  panel.innerHTML = requests.length
    ? `<h3 class="club-detail__heading">Your club requests</h3>${requests.map(r => clubRequestCardHtml(r, false)).join('')}`
    : '';
}

async function renderPendingClubRequests() {
  const listEl = document.getElementById('pendingClubRequestsList');
  const countEl = document.getElementById('pendingClubRequestsCount');
  if (!listEl) return;
  const { data: requests, error } = await sb.from('club_requests').select('*').eq('status', 'pending').order('created_at', { ascending: true });
  if (error) { console.error(error); return; }

  countEl.textContent = requests.length;
  listEl.innerHTML = requests.length
    ? requests.map(r => clubRequestCardHtml(r, true)).join('')
    : emptyState('No club requests waiting for review.', 'clubs');

  listEl.querySelectorAll('.club-request-approve-btn').forEach(btn => {
    btn.addEventListener('click', () => approveClubRequest(btn.dataset.id));
  });
  listEl.querySelectorAll('.club-request-reject-btn').forEach(btn => {
    btn.addEventListener('click', () => rejectClubRequest(btn.dataset.id));
  });
}

async function approveClubRequest(requestId) {
  const { data: request, error: fetchError } = await sb.from('club_requests').select('*').eq('id', requestId).single();
  if (fetchError || !request) { alert('Could not load this request.'); return; }
  if (!confirm(`Approve "${request.club_name}"? This creates the club and makes the requester its manager.`)) return;

  const slug = request.club_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  const { data: newClub, error: clubError } = await sb.from('clubs').insert({
    title: request.club_name, category: request.category, description: request.description, slug
  }).select().single();
  if (clubError) { alert(friendlyError(clubError)); return; }

  // A database trigger on club_managers automatically approves this
  // person's own club_members row the moment they're inserted here — no
  // separate client-side insert needed (and RLS wouldn't allow one, since
  // a student can only insert their own membership row, not someone else's).
  await sb.from('club_managers').insert({ club_id: newClub.id, user_id: request.requested_by });
  await sb.from('club_requests').update({ status: 'approved' }).eq('id', requestId);

  renderPendingClubRequests();
  renderClubs();
}

async function rejectClubRequest(requestId) {
  const reason = prompt('Optional: let the student know why this was rejected.') || null;
  await sb.from('club_requests').update({ status: 'rejected', admin_note: reason }).eq('id', requestId);
  renderPendingClubRequests();
}

document.getElementById('newClubForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newClubTitle').value.trim();
  const category = document.getElementById('newClubCategory').value;
  const description = document.getElementById('newClubDescription').value.trim();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  const noteEl = document.getElementById('clubFormNote');
  const joinModeInput = document.querySelector('input[name="newClubJoinMode"]:checked');
  const updates = { title, category, description, slug, join_mode: joinModeInput ? joinModeInput.value : 'approval' };

  const fileInput = document.getElementById('newClubPhoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `club-photos/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
      updates.photo_url = urlData.publicUrl;
    }
  }

  const { error } = await sb.from('clubs').insert(updates);
  if (error) { noteEl.textContent = friendlyError(error); console.error('Club creation failed:', error); return; }

  e.target.reset();
  noteEl.textContent = 'Club created.';
  setTimeout(() => noteEl.textContent = '', 3000);
  renderClubs();
});

// --- Admin: assign / remove club managers ---
function renderManagerControls(clubs, managers) {
  const clubSelect = document.getElementById('managerClubSelect');
  clubSelect.innerHTML = clubs.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');

  const userSelect = document.getElementById('managerUserSelect');
  sb.from('profiles').select('*').order('name', { ascending: true }).then(({ data: users }) => {
    userSelect.innerHTML = (users || []).map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`).join('');
  });

  const listEl = document.getElementById('clubManagersList');
  listEl.innerHTML = managers.length ? managers.map(m => {
    const club = clubs.find(c => c.id === m.club_id);
    return `
      <div class="user-row">
        <span>${escapeHtml(club ? club.title : 'Unknown club')} &middot; managed by <span id="manager-name-${m.user_id}-${m.club_id}">...</span></span>
        <button class="btn-link manager-remove-btn" data-club-id="${m.club_id}" data-user-id="${m.user_id}">Remove</button>
      </div>
    `;
  }).join('') : emptyState('No club managers assigned yet.', 'clubs');

  // Fill in manager names once profiles are available
  sb.from('profiles').select('id, name').then(({ data: users }) => {
    (users || []).forEach(u => {
      document.querySelectorAll(`[id^="manager-name-${u.id}-"]`).forEach(el => { el.textContent = u.name; });
    });
  });

  listEl.querySelectorAll('.manager-remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sb.from('club_managers').delete().eq('club_id', btn.dataset.clubId).eq('user_id', btn.dataset.userId);
      renderClubs();
    });
  });
}

document.getElementById('assignManagerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const clubId = document.getElementById('managerClubSelect').value;
  const userId = document.getElementById('managerUserSelect').value;
  const noteEl = document.getElementById('managerFormNote');
  if (!clubId || !userId) return;

  // Same auto-membership trigger applies here — assigning someone as
  // manager automatically approves their own club_members row.
  const { error } = await sb.from('club_managers').insert({ club_id: clubId, user_id: userId });
  if (error) { noteEl.textContent = friendlyError(error); return; }
  noteEl.textContent = 'Manager assigned.';
  setTimeout(() => noteEl.textContent = '', 3000);
  renderClubs();
});

// Keep the radio "card" look in sync with which join-mode is actually selected
document.addEventListener('change', (e) => {
  if (e.target.name === 'newClubJoinMode' || e.target.name === 'clubProfileJoinMode') {
    const group = e.target.closest('.join-mode-choice');
    if (!group) return;
    group.querySelectorAll('.join-mode-option').forEach(opt => opt.classList.remove('is-selected'));
    e.target.closest('.join-mode-option').classList.add('is-selected');
  }
});

// ==========================================================================
// DOWNLOADS
// ==========================================================================
async function renderDownloads() {
  const container = document.getElementById('downloadsList');
  const { data: downloads, error } = await sb.from('downloads').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }

  container.innerHTML = downloads.length ? downloads.map(d => `
    <div class="download-card" data-item-id="${d.id}">
      <div class="download-card__info">
        <h3>${escapeHtml(d.title)}</h3>
        <p>${linkify(d.description)}</p>
      </div>
      <a class="download-card__action" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">Download</a>
      ${canManageContent(currentUser) ? `
      <div class="item-admin-controls">
        <button class="download-edit-btn" data-id="${d.id}">${ICON_EDIT} Edit</button>
        <button class="download-delete-btn" data-id="${d.id}">${ICON_DELETE} Delete</button>
      </div>` : ''}
    </div>
  `).join('') : emptyState('No downloads available yet.', 'downloads');

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
    if (uploadError) { noteEl.textContent = 'Upload failed: ' + friendlyError(uploadError); return; }
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

  if (error || !spotlight || !spotlight.name) {
    card.innerHTML = `
      <div class="card-label">Student of the Moment</div>
      <div class="avatar-row">
        <div class="avatar" style="background:var(--border); display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-weight:700;">?</div>
        <h2 style="margin-bottom:0;">It might be you?</h2>
      </div>
      <p style="color:var(--orange-dark);font-weight:600;">Do something exceptional to stand out here</p>
      <p class="quote">"in sports, academics, creative arts, leadership, or anything else you're proud of"</p>
    `;
    return;
  }

  const photoHtml = spotlight.photo_url
    ? `<img class="avatar" src="${escapeHtml(spotlight.photo_url)}" alt="${escapeHtml(spotlight.name)}" />`
    : `<div class="avatar" style="background:${colorFromName(spotlight.name || 'Student')}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700;">${escapeHtml(initialsFromName(spotlight.name || 'S'))}</div>`;

  card.innerHTML = `
    <div class="card-label">Student of the Moment</div>
    <div class="avatar-row">
      ${photoHtml}
      <h2 style="margin-bottom:0;">${escapeHtml(spotlight.name)}</h2>
    </div>
    <p style="color:var(--orange-dark);font-weight:600;">${escapeHtml(spotlight.achievement)}</p>
    ${spotlight.quote ? `<p class="quote">&ldquo;${escapeHtml(spotlight.quote)}&rdquo;</p>` : ''}
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
        noteEl.textContent = 'Photo upload failed: ' + friendlyError(uploadError);
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
  const todayISO = new Date().toISOString().slice(0, 10);

  const [{ data: posts }, { data: nextEvents }, { data: sports }, { data: upcomingEvents }] = await Promise.all([
    // Pinned wins over pure recency — same rule as the admin management list,
    // so pinning a post is how admin actually chooses what shows here,
    // instead of it always being whatever was posted most recently.
    sb.from('admin_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(1),
    sb.from('events').select('*').gte('event_on', todayISO).order('event_on', { ascending: true }).limit(1),
    sb.from('sports').select('*').order('created_at', { ascending: false }).limit(1),
    sb.from('events').select('*').gte('event_on', todayISO).order('event_on', { ascending: true }).limit(3)
  ]);

  function highlightHtml(item, photoClass, viewName, ctaLabel) {
    if (!item) return null;
    const photo = item.photo_url
      ? `<a href="#" class="teaser-link" onclick="goToContent('${viewName}','${item.id}'); return false;"><img src="${escapeHtml(item.photo_url)}" alt="" class="${photoClass}" /></a>`
      : '';
    return `${photo}
      <a href="#" class="teaser-link" onclick="goToContent('${viewName}','${item.id}'); return false;">${item.title ? `<h2>${escapeHtml(item.title)}</h2>` : ''}</a>
      <p>${linkify(item.body)}</p>
      <button type="button" class="teaser-cta" onclick="goToContent('${viewName}','${item.id}')">${escapeHtml(ctaLabel)}
        <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>`;
  }

  // Latest Update gets the signature lime treatment by default (the .update-card class),
  // unless the admin picked their own custom color, in which case that choice wins instead
  const latestUpdateCard = document.getElementById('homeLatestUpdate').closest('.card');
  const latestUpdateEl = document.getElementById('homeLatestUpdate');
  if (posts && posts[0]) {
    const post = { ...posts[0], body: posts[0].content };
    const hasCustomColor = post.bg_color && post.bg_color.toUpperCase() !== '#FFFFFF';
    latestUpdateEl.innerHTML = highlightHtml(post, 'update-img', 'updates', 'Read more');
    latestUpdateCard.style.fontFamily = `'${post.font_family || 'Inter'}', sans-serif`;
    latestUpdateCard.classList.toggle('update-card', !hasCustomColor);
    latestUpdateCard.style.background = hasCustomColor ? post.bg_color : '';
  } else {
    latestUpdateEl.innerHTML = '<h2>No updates yet.</h2><p>Check back soon for the latest school updates.</p>';
    latestUpdateCard.style.fontFamily = '';
    latestUpdateCard.style.background = '';
    latestUpdateCard.classList.add('update-card');
  }

  const latestEventEl = document.getElementById('homeLatestEvent');
  latestEventEl.innerHTML = (nextEvents && nextEvents[0])
    ? highlightHtml(nextEvents[0], 'update-img', 'events', 'View event')
    : `<h2>No upcoming events yet.</h2><p>Check back soon, or head to Events to see the full calendar.</p><a class="link" href="#" onclick="switchView('events'); return false;">Go to Events →</a>`;

  const latestSportsEl = document.getElementById('homeLatestSports');
  latestSportsEl.innerHTML = (sports && sports[0])
    ? highlightHtml(sports[0], 'update-img', 'sports', 'Read more')
    : `<h2>No sports news yet.</h2><p>Fixtures and results will show up here once posted.</p>`;

  const upcomingSection = document.getElementById('upcomingEventsSection');
  const upcomingList = document.getElementById('upcomingEventsList');
  if (upcomingEvents && upcomingEvents.length) {
    upcomingSection.style.display = 'block';
    upcomingList.innerHTML = upcomingEvents.map(ev => `
      <div class="post-card" data-item-id="${ev.id}" style="font-family:'${ev.font_family || 'Inter'}', sans-serif; background:${ev.bg_color || '#FFFFFF'};">
        <a href="#" class="teaser-link" onclick="goToContent('events','${ev.id}'); return false;">
          <span class="post-card__date">${escapeHtml(formatEventDate(ev))}</span>
          <h3>${escapeHtml(ev.title)}</h3>
        </a>
        <p>${linkify(ev.body)}</p>
        <button type="button" class="teaser-cta" onclick="goToContent('events','${ev.id}')">Read more
          <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `).join('');
  } else {
    upcomingSection.style.display = 'none';
  }
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
    container.innerHTML = emptyState("You haven't sent any messages yet.", 'message');
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
    container.innerHTML = emptyState('No private messages yet.', 'message');
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

async function loadStatOverridesIntoForm() {
  const { data: slots } = await sb.from('stat_slots').select('*').order('slot_position', { ascending: true });
  if (!slots) return;
  slots.forEach(slot => {
    const metricSelect = document.getElementById(`statSlot${slot.slot_position}Metric`);
    const overrideInput = document.getElementById(`statSlot${slot.slot_position}Override`);
    if (!metricSelect || !overrideInput) return;
    if (!metricSelect.options.length) {
      metricSelect.innerHTML = Object.entries(STAT_METRIC_LABELS)
        .map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
    }
    metricSelect.value = slot.metric_key;
    overrideInput.value = slot.override_value ?? '';
  });
}

document.getElementById('statOverrideForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const toNullableInt = (val) => (val === '' ? null : parseInt(val, 10));
  const noteEl = document.getElementById('statOverrideNote');

  const updates = [1, 2, 3, 4].map(pos => ({
    slot_position: pos,
    metric_key: document.getElementById(`statSlot${pos}Metric`).value,
    override_value: toNullableInt(document.getElementById(`statSlot${pos}Override`).value)
  }));

  const results = await Promise.all(updates.map(u =>
    sb.from('stat_slots').update({ metric_key: u.metric_key, override_value: u.override_value }).eq('slot_position', u.slot_position)
  ));
  const error = results.find(r => r.error)?.error;
  noteEl.textContent = error ? friendlyError(error) : 'Saved.';
  if (!error) { setTimeout(() => noteEl.textContent = '', 3000); loadPublicStats(); }
});

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
    list.innerHTML = emptyState('No assistant admins yet.', 'admin');
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
  if (error) { alert(friendlyError(error)); return; }
  renderAssistantAdminManager();
  renderRegisteredUsers();
});

async function demoteAssistantAdmin(id) {
  if (!confirm('Remove assistant admin access for this user?')) return;
  const { error } = await sb.from('profiles').update({ role: 'student' }).eq('id', id);
  if (error) { alert(friendlyError(error)); return; }
  renderAssistantAdminManager();
  renderRegisteredUsers();
}

async function renderSportsAdminManager() {
  const { data: users, error } = await sb.from('profiles').select('*');
  if (error) { console.error(error); return; }

  const students = users.filter(u => u.role === 'student');
  const sportsAdmins = users.filter(u => u.role === 'sports_admin');

  const select = document.getElementById('promoteSportsAdminSelect');
  select.innerHTML = students.length
    ? students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.email)})</option>`).join('')
    : '<option value="">No students available</option>';

  const list = document.getElementById('sportsAdminsList');
  if (sportsAdmins.length === 0) {
    list.innerHTML = emptyState('No sports admins yet.', 'sports');
  } else {
    list.innerHTML = sportsAdmins.map(a => `
      <div class="user-row">
        <span>${escapeHtml(a.name)} &middot; ${escapeHtml(a.email)}</span>
        <button class="btn-link remove-sports-admin-btn" data-id="${a.id}">Remove</button>
      </div>
    `).join('');
    list.querySelectorAll('.remove-sports-admin-btn').forEach(btn => {
      btn.addEventListener('click', () => demoteSportsAdmin(btn.dataset.id));
    });
  }
}

document.getElementById('promoteSportsAdminBtn').addEventListener('click', async () => {
  const id = document.getElementById('promoteSportsAdminSelect').value;
  if (!id) return;
  const { error } = await sb.from('profiles').update({ role: 'sports_admin' }).eq('id', id);
  if (error) { alert(friendlyError(error)); return; }
  renderSportsAdminManager();
  renderRegisteredUsers();
});

async function demoteSportsAdmin(id) {
  if (!confirm('Remove sports admin access for this user?')) return;
  const { error } = await sb.from('profiles').update({ role: 'student' }).eq('id', id);
  if (error) { alert(friendlyError(error)); return; }
  renderSportsAdminManager();
  renderRegisteredUsers();
}

// ==========================================================================
// STUDENT UNION — admin (terms, positions, members). Public rendering
// (leadership grid, homepage President card, detail view) lives in
// studentunion.js; this only manages the data behind it.
// ==========================================================================
let suTermsCache = [];
let suPositionsCache = [];

async function renderSuAdmin() {
  await Promise.all([renderSuTerms(), renderSuPositions()]);
  await renderSuMembers();
}

// ---- Terms ----
async function renderSuTerms() {
  const { data, error } = await sb.from('student_union_terms').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  suTermsCache = data || [];

  const list = document.getElementById('suTermsList');
  list.innerHTML = suTermsCache.length ? suTermsCache.map(t => `
    <div class="user-row">
      <span>${escapeHtml(t.label)} ${t.is_active ? '<span class="club-member-row__badge">Active</span>' : ''}</span>
      <div style="display:flex; gap:10px;">
        ${!t.is_active ? `<button class="btn-link su-term-activate-btn" data-id="${t.id}">Make active</button>` : ''}
        <button class="btn-link su-term-delete-btn" data-id="${t.id}">Delete</button>
      </div>
    </div>
  `).join('') : emptyState('No terms yet.', 'clubs');

  list.querySelectorAll('.su-term-activate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await sb.from('student_union_terms').update({ is_active: true }).eq('id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      renderSuAdmin();
      if (window.renderStudentUnionPage) window.renderStudentUnionPage();
      if (window.renderHomePresident) window.renderHomePresident();
    });
  });
  list.querySelectorAll('.su-term-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this term and every leader in it? This cannot be undone.')) return;
      const { error } = await sb.from('student_union_terms').delete().eq('id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      renderSuAdmin();
    });
  });

  populateSuMemberSelects();
}

document.getElementById('suTermForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const label = document.getElementById('suTermLabel').value.trim();
  const description = document.getElementById('suTermDescription').value.trim() || null;
  const { error } = await sb.from('student_union_terms').insert({ label, description, is_active: suTermsCache.length === 0 });
  if (error) { alert(friendlyError(error)); return; }
  document.getElementById('suTermForm').reset();
  renderSuAdmin();
});

// ---- Positions ----
async function renderSuPositions() {
  const { data, error } = await sb.from('student_union_positions').select('*').order('display_order', { ascending: true });
  if (error) { console.error(error); return; }
  suPositionsCache = data || [];

  const list = document.getElementById('suPositionsList');
  list.innerHTML = suPositionsCache.length ? suPositionsCache.map(p => `
    <div class="user-row">
      <span>${escapeHtml(p.name)} ${p.is_president ? '<span class="club-member-row__badge">President</span>' : ''} ${!p.is_active ? '<span style="color:var(--text-muted); font-size:0.75rem;">(inactive)</span>' : ''}</span>
      <div style="display:flex; gap:10px;">
        <button class="btn-link su-position-edit-btn" data-id="${p.id}">Edit</button>
        <button class="btn-link su-position-delete-btn" data-id="${p.id}">Delete</button>
      </div>
    </div>
  `).join('') : emptyState('No positions yet.', 'clubs');

  list.querySelectorAll('.su-position-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editSuPosition(suPositionsCache.find(p => p.id === btn.dataset.id)));
  });
  list.querySelectorAll('.su-position-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this position? Any leader currently assigned to it must be moved first.')) return;
      const { error } = await sb.from('student_union_positions').delete().eq('id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      renderSuAdmin();
    });
  });

  populateSuMemberSelects();
}

function editSuPosition(p) {
  if (!p) return;
  document.getElementById('editingSuPositionId').value = p.id;
  document.getElementById('suPositionName').value = p.name;
  document.getElementById('suPositionDescription').value = p.description || '';
  document.getElementById('suPositionOrder').value = p.display_order;
  document.getElementById('suPositionIsPresident').checked = p.is_president;
  document.getElementById('suPositionIsActive').checked = p.is_active;
  document.getElementById('suPositionFormHeading').textContent = 'Editing position';
  document.getElementById('suPositionSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelSuPositionEdit').style.display = 'inline-block';
}
function resetSuPositionForm() {
  document.getElementById('suPositionForm').reset();
  document.getElementById('editingSuPositionId').value = '';
  document.getElementById('suPositionIsActive').checked = true;
  document.getElementById('suPositionFormHeading').textContent = 'Student Union — positions';
  document.getElementById('suPositionSubmitBtn').textContent = 'Add position';
  document.getElementById('cancelSuPositionEdit').style.display = 'none';
}
document.getElementById('cancelSuPositionEdit').addEventListener('click', resetSuPositionForm);

document.getElementById('suPositionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const editingId = document.getElementById('editingSuPositionId').value;
  const updates = {
    name: document.getElementById('suPositionName').value.trim(),
    description: document.getElementById('suPositionDescription').value.trim() || null,
    display_order: parseInt(document.getElementById('suPositionOrder').value, 10) || 0,
    is_president: document.getElementById('suPositionIsPresident').checked,
    is_active: document.getElementById('suPositionIsActive').checked,
  };
  const { error } = editingId
    ? await sb.from('student_union_positions').update(updates).eq('id', editingId)
    : await sb.from('student_union_positions').insert(updates);
  if (error) { alert(friendlyError(error)); return; }
  resetSuPositionForm();
  renderSuAdmin();
});

// ---- Members ----
function populateSuMemberSelects() {
  const termSel = document.getElementById('suMemberTerm');
  const posSel = document.getElementById('suMemberPosition');
  if (!termSel || !posSel) return;
  const currentTermVal = termSel.value;
  const currentPosVal = posSel.value;
  termSel.innerHTML = suTermsCache.map(t => `<option value="${t.id}">${escapeHtml(t.label)}${t.is_active ? ' (active)' : ''}</option>`).join('');
  posSel.innerHTML = suPositionsCache.filter(p => p.is_active).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  const activeTerm = suTermsCache.find(t => t.is_active);
  if (currentTermVal && suTermsCache.some(t => t.id === currentTermVal)) termSel.value = currentTermVal;
  else if (activeTerm) termSel.value = activeTerm.id;
  if (currentPosVal && suPositionsCache.some(p => p.id === currentPosVal)) posSel.value = currentPosVal;
}

async function renderSuMembers() {
  const list = document.getElementById('suMembersList');
  if (!list) return;
  const { data, error } = await sb.from('student_union_members').select('*, position:student_union_positions(*), term:student_union_terms(*)').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  const members = data || [];

  list.innerHTML = members.length ? members.map(m => `
    <div class="user-row">
      <span>${escapeHtml(m.full_name)} &middot; ${escapeHtml(m.position ? m.position.name : 'Unknown position')} &middot; ${escapeHtml(m.term ? m.term.label : 'Unknown term')} ${!m.is_active ? '<span style="color:var(--text-muted); font-size:0.75rem;">(inactive)</span>' : ''}</span>
      <div style="display:flex; gap:10px;">
        <button class="btn-link su-member-edit-btn" data-id="${m.id}">Edit</button>
        <button class="btn-link su-member-delete-btn" data-id="${m.id}">Delete</button>
      </div>
    </div>
  `).join('') : emptyState('No Student Union leaders added yet.', 'clubs');

  list.querySelectorAll('.su-member-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editSuMember(members.find(m => m.id === btn.dataset.id)));
  });
  list.querySelectorAll('.su-member-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this leader? This cannot be undone.')) return;
      const { error } = await sb.from('student_union_members').delete().eq('id', btn.dataset.id);
      if (error) { alert(friendlyError(error)); return; }
      renderSuMembers();
      if (window.renderStudentUnionPage) window.renderStudentUnionPage();
      if (window.renderHomePresident) window.renderHomePresident();
    });
  });
}

function editSuMember(m) {
  if (!m) return;
  document.getElementById('editingSuMemberId').value = m.id;
  document.getElementById('suMemberTerm').value = m.term_id;
  document.getElementById('suMemberPosition').value = m.position_id;
  document.getElementById('suMemberName').value = m.full_name;
  document.getElementById('suMemberCourse').value = m.course || '';
  document.getElementById('suMemberLevel').value = m.level || '';
  document.getElementById('suMemberBio').value = m.bio || '';
  document.getElementById('suMemberOrder').value = m.display_order;
  document.getElementById('suMemberIsActive').checked = m.is_active;
  document.getElementById('suMemberFormHeading').textContent = 'Editing leader';
  document.getElementById('suMemberSubmitBtn').textContent = 'Save changes';
  document.getElementById('cancelSuMemberEdit').style.display = 'inline-block';
  document.getElementById('suMemberForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function resetSuMemberForm() {
  document.getElementById('suMemberForm').reset();
  document.getElementById('editingSuMemberId').value = '';
  document.getElementById('suMemberIsActive').checked = true;
  populateSuMemberSelects();
  document.getElementById('suMemberFormHeading').textContent = 'Student Union — leaders';
  document.getElementById('suMemberSubmitBtn').textContent = 'Add leader';
  document.getElementById('cancelSuMemberEdit').style.display = 'none';
}
document.getElementById('cancelSuMemberEdit').addEventListener('click', resetSuMemberForm);

document.getElementById('suMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const editingId = document.getElementById('editingSuMemberId').value;
  const updates = {
    term_id: document.getElementById('suMemberTerm').value,
    position_id: document.getElementById('suMemberPosition').value,
    full_name: document.getElementById('suMemberName').value.trim(),
    course: document.getElementById('suMemberCourse').value.trim() || null,
    level: document.getElementById('suMemberLevel').value.trim() || null,
    bio: document.getElementById('suMemberBio').value.trim() || null,
    display_order: parseInt(document.getElementById('suMemberOrder').value, 10) || 0,
    is_active: document.getElementById('suMemberIsActive').checked,
  };
  const submitBtn = document.getElementById('suMemberSubmitBtn');

  const fileInput = document.getElementById('suMemberPhoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `student-union/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from('site-images').upload(path, file);
    if (uploadError) { alert('Upload failed: ' + friendlyError(uploadError)); return; }
    const { data: urlData } = sb.storage.from('site-images').getPublicUrl(path);
    updates.photo_url = urlData.publicUrl;
  }

  submitBtn.disabled = true;
  const { error } = editingId
    ? await sb.from('student_union_members').update(updates).eq('id', editingId)
    : await sb.from('student_union_members').insert(updates);
  submitBtn.disabled = false;

  if (error) { alert(friendlyError(error)); return; }
  resetSuMemberForm();
  renderSuMembers();
  if (window.renderStudentUnionPage) window.renderStudentUnionPage();
  if (window.renderHomePresident) window.renderHomePresident();
});

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
  if (error) { note.textContent = friendlyError(error); return; }

  currentUser.name = newName;
  currentUser.bio = newBio;
  document.getElementById('homeUserName').textContent = ', ' + currentUser.name.split(' ')[0];
  document.getElementById('topGreetName').textContent = currentUser.name.split(' ')[0];

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
  if (error) { showError(errorEl, friendlyError(error)); return; }

  e.target.reset();
  alert('Password updated successfully.');
});

// ---------------------------------------------------------------------
// PWA — registers the service worker so the static shell (this file,
// style.css, index.html, etc.) loads instantly even on a weak or absent
// connection. Never blocks the rest of the app if it fails.
// ---------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
