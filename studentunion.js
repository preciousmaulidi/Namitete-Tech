/* ============================================================
   studentunion.js
   Public-facing rendering for the Student Union feature: the
   leadership grid on its own page, the President spotlight on
   Home, and a detail view for an individual leader. All content
   comes from student_union_terms / _positions / _members —
   nothing here is hard-coded. Admin CRUD lives in script.js
   (same convention as every other admin form on the site);
   this file only reads and displays.
   ============================================================ */
(function () {
  function escapeHtml(str) {
    if (window.escapeHtml) return window.escapeHtml(str);
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function initials(name) {
    return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  async function fetchActiveTermMembers() {
    const { data: term } = await sb.from('student_union_terms').select('*').eq('is_active', true).maybeSingle();
    if (!term) return { term: null, members: [] };
    const { data: members, error } = await sb
      .from('student_union_members')
      .select('*, position:student_union_positions(*)')
      .eq('term_id', term.id)
      .eq('is_active', true);
    if (error) { console.error(error); return { term, members: [] }; }
    const sorted = (members || [])
      .filter(m => m.position && m.position.is_active !== false)
      .sort((a, b) => (a.position.display_order - b.position.display_order) || (a.display_order - b.display_order));
    return { term, members: sorted };
  }

  function photoBlock(m, sizeClass) {
    return m.photo_url
      ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.full_name)}, ${escapeHtml(m.position.name)}" class="${sizeClass}" loading="lazy" />`
      : `<div class="${sizeClass} su-photo--placeholder" aria-hidden="true">${escapeHtml(initials(m.full_name))}</div>`;
  }

  function leaderCardHtml(m, featured) {
    return `
      <button type="button" class="su-card ${featured ? 'su-card--featured' : ''}" data-member-id="${m.id}" aria-label="View ${escapeHtml(m.full_name)}'s profile">
        <div class="su-card__media">${photoBlock(m, 'su-card__photo')}</div>
        <div class="su-card__body">
          <span class="su-card__position">${escapeHtml(m.position.name)}</span>
          <h3 class="su-card__name">${escapeHtml(m.full_name)}</h3>
          ${m.course ? `<p class="su-card__course">${escapeHtml(m.course)}${m.level ? ` &middot; ${escapeHtml(m.level)}` : ''}</p>` : (m.level ? `<p class="su-card__course">${escapeHtml(m.level)}</p>` : '')}
          ${m.bio ? `<p class="su-card__bio">${escapeHtml(m.bio)}</p>` : ''}
        </div>
      </button>`;
  }

  async function renderStudentUnionPage() {
    const grid = document.getElementById('suLeadershipGrid');
    const termLabel = document.getElementById('suHeroTerm');
    if (!grid) return;
    const { term, members } = await fetchActiveTermMembers();

    termLabel.textContent = term ? `Student Union ${term.label}` : 'Student Union';

    if (!term) {
      grid.innerHTML = `<div class="su-empty">No Student Union has been set up yet. Check back once elections are complete.</div>`;
      return;
    }
    if (!members.length) {
      grid.innerHTML = `<div class="su-empty">${escapeHtml(term.label)} leadership hasn't been added yet. Check back soon.</div>`;
      return;
    }

    const president = members.find(m => m.position.is_president);
    const rest = members.filter(m => !president || m.id !== president.id);

    grid.innerHTML = (president ? leaderCardHtml(president, true) : '') + rest.map(m => leaderCardHtml(m, false)).join('');
    grid.querySelectorAll('.su-card').forEach(card => {
      const member = members.find(m => m.id === card.dataset.memberId);
      card.addEventListener('click', () => openLeaderDetail(member));
    });
  }

  async function renderHomePresident() {
    const section = document.getElementById('homePresidentSection');
    if (!section) return;
    const { term, members } = await fetchActiveTermMembers();
    const president = members.find(m => m.position.is_president);

    if (!term || !president) { section.style.display = 'none'; section.innerHTML = ''; return; }

    section.style.display = 'block';
    section.innerHTML = `
      <div class="su-home-president">
        <div class="su-home-president__media">${photoBlock(president, 'su-home-president__photo')}</div>
        <div class="su-home-president__body">
          <p class="su-home-president__eyebrow">Meet Your Student Union President</p>
          <h2 class="su-home-president__name">${escapeHtml(president.full_name)}</h2>
          <p class="su-home-president__meta">${escapeHtml(president.position.name)}${president.course ? ` &middot; ${escapeHtml(president.course)}` : ''}${president.level ? ` &middot; ${escapeHtml(president.level)}` : ''}</p>
          ${president.bio ? `<p class="su-home-president__bio">${escapeHtml(president.bio)}</p>` : ''}
          <button type="button" class="su-home-president__cta" id="suHomeCta">Meet the Student Union
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>`;
    document.getElementById('suHomeCta').addEventListener('click', () => switchView('studentunion'));
  }

  /* ---------------- Detail view ---------------- */
  let detailEl = null;
  let lastFocused = null;
  function openLeaderDetail(m) {
    if (!m) return;
    if (!detailEl) {
      detailEl = document.createElement('div');
      detailEl.className = 'su-detail';
      detailEl.setAttribute('role', 'dialog');
      detailEl.setAttribute('aria-modal', 'true');
      document.body.appendChild(detailEl);
      detailEl.addEventListener('click', (e) => { if (e.target === detailEl) closeLeaderDetail(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && detailEl.classList.contains('open')) closeLeaderDetail(); });
    }
    detailEl.innerHTML = `
      <div class="su-detail__panel">
        <button type="button" class="su-detail__close" id="suDetailClose" aria-label="Close profile">&times;</button>
        <div class="su-detail__media">${photoBlock(m, 'su-detail__photo')}</div>
        <span class="su-card__position">${escapeHtml(m.position.name)}</span>
        <h2 class="su-detail__name">${escapeHtml(m.full_name)}</h2>
        ${(m.course || m.level) ? `<p class="su-detail__meta">${[m.course, m.level].filter(Boolean).map(escapeHtml).join(' &middot; ')}</p>` : ''}
        ${m.bio ? `<p class="su-detail__bio">${escapeHtml(m.bio)}</p>` : ''}
      </div>`;
    lastFocused = document.activeElement;
    const closeBtn = document.getElementById('suDetailClose');
    closeBtn.addEventListener('click', closeLeaderDetail);
    requestAnimationFrame(() => { detailEl.classList.add('open'); closeBtn.focus(); });
  }
  function closeLeaderDetail() {
    if (detailEl) detailEl.classList.remove('open');
    if (lastFocused) lastFocused.focus();
  }

  window.renderStudentUnionPage = renderStudentUnionPage;
  window.renderHomePresident = renderHomePresident;
})();
