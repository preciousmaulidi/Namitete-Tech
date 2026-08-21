/* ============================================================
   sports.js
   Self-contained module for the redesigned Sports page. Renders
   into containers inside #view-sports (toggled by script.js's
   switchView()). Reuses script.js's `sb` client, escapeHtml,
   friendlyError, canManageSports, editSports/deleteSports —
   loaded after script.js so those are already on window.

   Content model: everything lives in the existing `sports` table,
   split by a `section` column ('update' | 'upcoming' | 'fixture' |
   'news'). Player of the Match is the one exception — a single
   admin-managed row in `sports_potm`, same pattern as the
   Student-of-the-Moment "spotlight" feature elsewhere on the site.
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rootPanel = document.getElementById('view-sports');
  if (!rootPanel) return;
  rootPanel.classList.add('sports-page');
  if (reduceMotion) rootPanel.classList.add('reduced-motion');

  /* ---------------- Icon set — one unique illustration per sport ---------------- */
  const ICONS = {
    football: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="34" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/><path d="M50 30 L62 39 L57 54 L43 54 L38 39 Z" fill="currentColor" fill-opacity="0.85"/><path d="M50 30 L50 16 M62 39 L74 32 M57 54 L64 68 M43 54 L36 68 M38 39 L26 32" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    netball: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 78V26" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="40" y="20" width="20" height="8" rx="2" fill="currentColor"/><circle cx="50" cy="46" r="19" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/><path d="M32 46h36M50 27v38M38 33c8 8 16 8 24 0M38 59c8-8 16-8 24 0" stroke="currentColor" stroke-width="1.5"/></svg>`,
    volleyball: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="34" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/><path d="M50 16c10 10 14 22 8 34" stroke="currentColor" stroke-width="1.6"/><path d="M20 38c14-2 24 4 30 12" stroke="currentColor" stroke-width="1.6"/><path d="M20 62c12 6 24 4 32-4" stroke="currentColor" stroke-width="1.6"/><path d="M58 50c10 4 16 12 16 22" stroke="currentColor" stroke-width="1.6"/></svg>`,
    athletics: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="60" rx="36" ry="20" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.5"/><ellipse cx="50" cy="60" rx="24" ry="13" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="52" cy="24" r="6" fill="currentColor"/><path d="M52 30 L46 46 L58 42 L64 58 M46 46 L34 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    basketball: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="34" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/><path d="M16 50h68M50 16v68M25 25c14 12 14 38 0 50M75 25c-14 12-14 38 0 50" stroke="currentColor" stroke-width="1.6"/></svg>`,
    tabletennis: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="40" cy="46" rx="20" ry="24" transform="rotate(-30 40 46)" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/><path d="M54 60 L74 80" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="78" cy="30" r="6" fill="currentColor"/></svg>`,
    trophy: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M34 22h32v20c0 10-7 18-16 18s-16-8-16-18V22Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2"/><path d="M34 26c-10 0-14 6-14 12s6 12 14 12M66 26c10 0 14 6 14 12s-6 12-14 12" stroke="currentColor" stroke-width="1.8"/><path d="M50 60v10M40 78h20M42 70h16l2 8H40l2-8Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    calendar: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="24" width="64" height="56" rx="8" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/><path d="M18 40h64" stroke="currentColor" stroke-width="2"/><path d="M32 16v14M68 16v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="34" cy="54" r="3.2" fill="currentColor"/><circle cx="50" cy="54" r="3.2" fill="currentColor"/><circle cx="66" cy="54" r="3.2" fill="currentColor"/><circle cx="34" cy="67" r="3.2" fill="currentColor"/><circle cx="50" cy="67" r="3.2" fill="currentColor"/></svg>`,
  };

  // Decorative legend in the hero (not live data) + the default accent/icon
  // used for a card when the admin didn't pick a custom color.
  const CATEGORY_STYLE = {
    'Football': { color: '#3ddc84', icon: 'football' },
    'Netball': { color: '#ff5c8a', icon: 'netball' },
    'Volleyball': { color: '#4fa8ff', icon: 'volleyball' },
    'Athletics': { color: '#ff9900', icon: 'athletics' },
    'Basketball': { color: '#ffb13d', icon: 'basketball' },
  };
  function categoryStyle(cat) { return CATEGORY_STYLE[cat] || { color: '#ff9900', icon: 'trophy' }; }

  function escapeHtml(str) {
    if (window.escapeHtml) return window.escapeHtml(str);
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  /* ---------------- Card factory ---------------- */
  function iconSvg(key) { return ICONS[key] || ICONS.trophy; }

  function buildStatsHtml(stats) {
    return stats.map(s => `<div class="tc__stat"><span class="tc__stat-value">${escapeHtml(s.value)}</span><span class="tc__stat-label">${escapeHtml(s.label)}</span></div>`).join('');
  }

  function canEdit() { return window.currentUser && window.canManageSports && window.canManageSports(window.currentUser); }

  function buildCard(item, iconKey) {
    const wrap = document.createElement('div');
    wrap.className = 'tc';
    if (item.id) wrap.setAttribute('data-item-id', item.id);
    wrap.style.setProperty('--card-accent', item.accent || '#ff9900');
    wrap.style.setProperty('--float-dur', (6 + Math.random() * 3).toFixed(1) + 's');
    wrap.style.setProperty('--float-delay', (-Math.random() * 6).toFixed(1) + 's');
    wrap.innerHTML = `
      <div class="tc__shadow"></div>
      <div class="tc__card">
        <div class="tc__bg"></div>
        <div class="tc__noise"></div>
        <div class="tc__sheen"></div>
        <div class="tc__rim"></div>
        <div class="tc__glass"></div>
        <div class="tc__visual">${iconSvg(iconKey || 'trophy')}</div>
        <div class="tc__body">
          <span class="tc__tag">${escapeHtml(item.tag)}</span>
          <h3 class="tc__title">${escapeHtml(item.title)}</h3>
          <p class="tc__desc">${escapeHtml(item.desc)}</p>
          <div class="tc__stats">${buildStatsHtml(item.stats || [])}</div>
          ${item.cta ? `<button type="button" class="tc__cta magnetic">${escapeHtml(item.cta)}
            <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>` : ''}
          ${item.id && canEdit() ? `
          <div class="item-admin-controls sports-tc__admin">
            <button type="button" class="sports-tc-edit-btn" data-id="${item.id}">Edit</button>
            <button type="button" class="sports-tc-delete-btn" data-id="${item.id}">Delete</button>
          </div>` : ''}
        </div>
      </div>`;
    initTilt(wrap, wrap.querySelector('.tc__card'));
    if (item.id && canEdit()) {
      wrap.querySelector('.sports-tc-edit-btn')?.addEventListener('click', (e) => { e.stopPropagation(); window.editSports(item.raw); });
      wrap.querySelector('.sports-tc-delete-btn')?.addEventListener('click', (e) => { e.stopPropagation(); window.deleteSports(item.id); });
    }
    // The CTA (and the card itself) opens the full item — this app doesn't
    // have separate article pages, so "read more" expands right here
    // instead of linking somewhere that doesn't exist.
    const ctaBtn = wrap.querySelector('.tc__cta');
    if (ctaBtn) ctaBtn.addEventListener('click', (e) => { e.stopPropagation(); openSportsLightbox(item); });
    wrap.querySelector('.tc__card').addEventListener('click', (e) => {
      if (e.target.closest('.item-admin-controls, .tc__cta')) return;
      openSportsLightbox(item);
    });
    wrap.querySelector('.tc__card').style.cursor = 'pointer';
    return wrap;
  }

  /* ---------------- "Read more" lightbox — the full item, expanded ---------------- */
  let lightboxEl = null;
  function openSportsLightbox(item) {
    if (!lightboxEl) {
      lightboxEl = document.createElement('div');
      lightboxEl.className = 'sports-lightbox';
      document.body.appendChild(lightboxEl);
      lightboxEl.addEventListener('click', (e) => { if (e.target === lightboxEl) closeSportsLightbox(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSportsLightbox(); });
    }
    lightboxEl.innerHTML = `
      <div class="sports-lightbox__panel">
        <button type="button" class="sports-lightbox__close" aria-label="Close">&times;</button>
        <span class="tc__tag">${escapeHtml(item.tag)}</span>
        <h2>${escapeHtml(item.title)}</h2>
        <div class="sports-lightbox__stats">${buildStatsHtml(item.stats || [])}</div>
        <p>${escapeHtml(item.desc)}</p>
      </div>`;
    lightboxEl.querySelector('.sports-lightbox__close').addEventListener('click', closeSportsLightbox);
    requestAnimationFrame(() => lightboxEl.classList.add('open'));
  }
  function closeSportsLightbox() {
    if (lightboxEl) lightboxEl.classList.remove('open');
  }

  /* ---------------- Cursor-reactive 3D tilt ---------------- */
  const MAX_TILT = 9; // degrees

  function initTilt(container, plane) {
    if (!fineHover || reduceMotion) return;
    let raf = null;
    function onMove(e) {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - y) * MAX_TILT;
      const ry = (x - 0.5) * MAX_TILT;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        plane.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        plane.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        plane.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        plane.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      container.classList.add('is-active');
    }
    function onLeave() {
      container.classList.remove('is-active');
      plane.style.setProperty('--rx', '0deg');
      plane.style.setProperty('--ry', '0deg');
    }
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
  }

  /* ---------------- Magnetic CTA buttons ---------------- */
  function initMagnetic(scopeEl) {
    if (!fineHover || reduceMotion) return;
    const radius = 46;
    scopeEl.querySelectorAll('.magnetic').forEach(btn => {
      if (btn.dataset.magneticBound) return;
      btn.dataset.magneticBound = '1';
      const parentCard = btn.closest('.tc, .potm-card');
      const listenOn = parentCard || btn;
      listenOn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < radius * 2.2) {
          const pull = Math.max(0, 1 - dist / (radius * 2.2));
          btn.style.transform = `translate(${(dx * 0.28 * pull).toFixed(1)}px, ${(dy * 0.28 * pull).toFixed(1)}px)`;
        } else {
          btn.style.transform = '';
        }
      });
      listenOn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  function observeReveal(scopeEl) {
    const targets = scopeEl.querySelectorAll('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(t => io.observe(t));
  }

  /* ---------------- Section renderers (real data) ---------------- */
  function renderChips() {
    const el = document.getElementById('sportsHeroPills');
    if (!el) return;
    el.innerHTML = Object.entries(CATEGORY_STYLE).map(([label, s]) =>
      `<span class="sports-pill" style="--pill-color:${s.color}"><span class="sports-pill__dot"></span>${escapeHtml(label)}</span>`
    ).join('');
  }

  function toItem(row) {
    const style = categoryStyle(row.category);
    const stats = [];
    if (row.event_date) stats.push({ label: 'Date', value: row.event_date });
    if (row.secondary_label) stats.push({ label: 'Where / When', value: row.secondary_label });
    let cta = 'View details';
    if (row.section === 'news') cta = 'Read more';
    else if (row.section === 'fixture') cta = row.kind === 'match' ? 'Match details' : 'Add to calendar';
    return {
      id: row.id, raw: row,
      accent: row.accent_color || style.color,
      tag: row.category || (row.section === 'news' ? 'News' : 'Sports'),
      title: row.title, desc: row.body, stats, cta,
      icon: row.section === 'news' ? 'trophy' : style.icon,
    };
  }

  async function renderUpcoming() {
    const row = document.getElementById('sportsUpcomingRow');
    if (!row) return;
    const { data, error } = await sb.from('sports').select('*').eq('section', 'upcoming').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    row.innerHTML = '';
    if (!data.length) { row.innerHTML = '<div class="sports-empty">No upcoming sporting activities scheduled yet.</div>'; return; }
    data.forEach(r => { const item = toItem(r); row.appendChild(buildCard(item, item.icon)); });
    initMagnetic(row);
  }

  let fixturesCache = [];
  let activeFixtureTab = null;
  async function renderFixturesSection() {
    const { data, error } = await sb.from('sports').select('*').eq('section', 'fixture').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    fixturesCache = data || [];
    const groups = [...new Set(fixturesCache.map(r => r.category || 'Other'))];
    if (!activeFixtureTab || !groups.includes(activeFixtureTab)) activeFixtureTab = groups[0] || null;
    renderFixtureTabs(groups);
    renderFixturesRow();
  }
  function renderFixtureTabs(groups) {
    const tabsEl = document.getElementById('sportsFixtureTabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = groups.map(g => `<button type="button" class="sports-tab${g === activeFixtureTab ? ' active' : ''}" data-tab="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('');
    tabsEl.querySelectorAll('.sports-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFixtureTab = btn.dataset.tab;
        renderFixtureTabs(groups);
        renderFixturesRow();
      });
    });
  }
  function renderFixturesRow() {
    const row = document.getElementById('sportsFixturesRow');
    if (!row) return;
    row.innerHTML = '';
    const items = fixturesCache.filter(r => (r.category || 'Other') === activeFixtureTab);
    if (!items.length) { row.innerHTML = '<div class="sports-empty">Nothing scheduled here yet.</div>'; return; }
    items.forEach(r => { const item = toItem(r); row.appendChild(buildCard(item, r.kind === 'training' ? 'calendar' : (item.icon || 'trophy'))); });
    initMagnetic(row);
  }

  async function renderPotm() {
    const el = document.getElementById('potmCard');
    if (!el) return;
    const { data: p, error } = await sb.from('sports_potm').select('*').eq('id', 1).maybeSingle();
    if (error) { console.error(error); return; }
    if (!p || !p.name) { el.innerHTML = '<div class="sports-empty">No player of the match yet.</div>'; return; }
    const initials = p.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const stats = [
      p.stat1_value ? { value: p.stat1_value, label: p.stat1_label || '' } : null,
      p.stat2_value ? { value: p.stat2_value, label: p.stat2_label || '' } : null,
      p.stat3_value ? { value: p.stat3_value, label: p.stat3_label || '' } : null,
    ].filter(Boolean);
    el.innerHTML = `
      <div class="potm-card__bg"></div>
      <div class="potm-card__sheen"></div>
      <div class="potm-card__grid">
        <div class="potm-card__avatar">${p.photo_url ? `<img src="${escapeHtml(p.photo_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />` : escapeHtml(initials)}</div>
        <div class="potm-card__mid">
          <span class="potm-card__tag">Player of the Match</span>
          <h3 class="potm-card__name">${escapeHtml(p.name)}</h3>
          <p class="potm-card__meta">${escapeHtml(p.position_text || '')}${p.match_text ? ` &nbsp;·&nbsp; ${escapeHtml(p.match_text)}` : ''}</p>
          ${p.quote ? `<p class="potm-card__quote">${escapeHtml(p.quote)}</p>` : ''}
        </div>
        ${stats.length ? `<div class="potm-card__stats">${stats.map(s => `<div><div class="potm-card__stat-value">${escapeHtml(s.value)}</div><div class="potm-card__stat-label">${escapeHtml(s.label)}</div></div>`).join('')}</div>` : ''}
      </div>`;
    initTilt(el, el);
    initMagnetic(el);
  }

  async function renderNews() {
    const row = document.getElementById('sportsNewsRow');
    if (!row) return;
    const { data, error } = await sb.from('sports').select('*').eq('section', 'news').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    row.innerHTML = '';
    if (!data.length) { row.innerHTML = '<div class="sports-empty">No sports articles yet.</div>'; return; }
    data.forEach(r => {
      const style = categoryStyle(r.category);
      const item = {
        id: r.id, raw: r,
        accent: r.accent_color || style.color,
        tag: r.category || 'News', title: r.title, desc: r.body,
        stats: [{ label: 'Published', value: relativeTime(r.created_at) }],
        cta: 'Read more',
      };
      row.appendChild(buildCard(item, 'trophy'));
    });
    initMagnetic(row);
  }

  async function renderSportsPage() {
    renderChips();
    await Promise.all([renderUpcoming(), renderFixturesSection(), renderPotm(), renderNews()]);
    observeReveal(rootPanel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSportsPage);
  } else {
    renderSportsPage();
  }

  // Re-check reveal state when the Sports tab is opened later (it starts
  // hidden, so anything already "in view" while display:none needs this).
  document.querySelectorAll('.sidebar__link[data-view="sports"]').forEach(btn => {
    btn.addEventListener('click', () => {
      requestAnimationFrame(() => observeReveal(rootPanel));
    });
  });

  window.renderSportsPage = renderSportsPage; // exposed so script.js can refresh after admin edits
})();
