/* ============================================================
   auth-scene.js
   Cinematic entrance animation for the login/signup modal.
   Self-contained — does not read from or modify anything in
   script.js. Watches #authBackdrop for the "open" class (which
   openAuth()/closeAuth() already toggle) and drives the scene
   from there.
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const backdrop = document.getElementById('authBackdrop');
  const layer = document.getElementById('authObjectsLayer');
  const ring = document.getElementById('authOrbitRing');
  const emblem = document.getElementById('authCenterEmblem');
  if (!backdrop || !layer || !ring || !emblem) return;

  const icons = {
    books: `<svg viewBox="0 0 40 32" width="40" height="32" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="3" y="20" width="30" height="6" rx="0.6"/><rect x="5" y="14" width="27" height="6" rx="0.6"/><rect x="7" y="8" width="24" height="6" rx="0.6"/><line x1="10" y1="8" x2="10" y2="14"/><line x1="8" y1="14" x2="8" y2="20"/></svg>`,
    cap: `<svg viewBox="0 0 40 30" width="44" height="34" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M20 4 3 12l17 8 17-8-17-8Z"/><path d="M11 15.5v6.5c0 2.4 4 4.4 9 4.4s9-2 9-4.4v-6.5"/><path d="M35 12v9"/><circle cx="35" cy="22.3" r="1.3"/></svg>`,
    newspaper: `<svg viewBox="0 0 36 30" width="40" height="34" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="30" height="22" rx="0.6"/><line x1="7" y1="9" x2="18" y2="9"/><line x1="7" y1="12.5" x2="18" y2="12.5"/><line x1="7" y1="16" x2="14" y2="16"/><rect x="21" y="9" width="9" height="8"/><line x1="7" y1="21" x2="29" y2="21"/></svg>`,
    palette: `<svg viewBox="0 0 38 34" width="42" height="38" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M19 3C10 3 3 9.4 3 17.3c0 5.4 4 7 7.4 7 1.8 0 2-1.3 1.3-2.5-1-1.7 0-3.3 2-3.3h6.8c4.6 0 8.5-3.5 8.5-8.6C29 6.7 24.5 3 19 3Z"/><circle cx="10.5" cy="14" r="1.4"/><circle cx="15.5" cy="9.5" r="1.4"/><circle cx="22" cy="9.5" r="1.4"/><circle cx="25" cy="15" r="1.4"/><path d="M27 26 34 33" stroke-linecap="round"/><path d="M24 25 6 7" stroke-linecap="round"/></svg>`,
    music: `<svg viewBox="0 0 30 32" width="28" height="32" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M11 24V6l14-3v18"/><circle cx="8" cy="25.5" r="3.4"/><circle cx="21.5" cy="20.5" r="3.4"/></svg>`,
    flask: `<svg viewBox="0 0 30 36" width="30" height="36" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M12 4h6"/><path d="M13.3 4v9.5L4.5 28.6C3.3 30.7 4.8 33 7.2 33h15.6c2.4 0 3.9-2.3 2.7-4.4L16.7 13.5V4"/><path d="M8.5 24h13"/></svg>`,
    formula: `<svg viewBox="0 0 44 26" width="48" height="28"><text x="0" y="20" font-family="Fraunces, serif" font-style="italic" font-size="20" fill="currentColor">E=mc²</text></svg>`,
    monitor: `<svg viewBox="0 0 36 30" width="40" height="34" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="3" y="3" width="30" height="19" rx="1"/><line x1="14" y1="26" x2="22" y2="26"/><line x1="18" y1="22" x2="18" y2="26"/></svg>`,
    laptop: `<svg viewBox="0 0 40 26" width="44" height="30" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="8" y="3" width="24" height="15" rx="1"/><path d="M2 22h36l-3.5-4H5.5L2 22Z"/></svg>`,
    keyboard: `<svg viewBox="0 0 40 20" width="44" height="22" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="2" width="36" height="16" rx="1.4"/><line x1="7" y1="14" x2="24" y2="14"/><line x1="7" y1="7" x2="7.01" y2="7"/><line x1="11" y1="7" x2="11.01" y2="7"/><line x1="15" y1="7" x2="15.01" y2="7"/><line x1="19" y1="7" x2="19.01" y2="7"/><line x1="23" y1="7" x2="23.01" y2="7"/><line x1="27" y1="7" x2="27.01" y2="7"/><line x1="31" y1="7" x2="31.01" y2="7"/></svg>`,
    circuit: `<svg viewBox="0 0 34 34" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1"><rect x="10" y="10" width="14" height="14" rx="1.4"/><line x1="17" y1="2" x2="17" y2="10"/><line x1="17" y1="24" x2="17" y2="32"/><line x1="2" y1="17" x2="10" y2="17"/><line x1="24" y1="17" x2="32" y2="17"/><line x1="6" y1="6" x2="10" y2="10"/><line x1="24" y1="24" x2="28" y2="28"/><circle cx="17" cy="17" r="2.4"/></svg>`,
    globe: `<svg viewBox="0 0 34 34" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1"><circle cx="17" cy="17" r="14.5"/><ellipse cx="17" cy="17" rx="6.2" ry="14.5"/><line x1="2.5" y1="17" x2="31.5" y2="17"/><path d="M5 9.5h24"/><path d="M5 24.5h24"/></svg>`,
    pen: `<svg viewBox="0 0 12 40" width="16" height="44" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2 10 8 6 38 2 8 6 2Z"/><line x1="3.3" y1="10.5" x2="8.7" y2="10.5"/></svg>`,
    notebook: `<svg viewBox="0 0 30 36" width="32" height="38" fill="none" stroke="currentColor" stroke-width="1.05"><rect x="6" y="2" width="22" height="32" rx="1"/><line x1="2" y1="7" x2="6" y2="7"/><line x1="2" y1="13" x2="6" y2="13"/><line x1="2" y1="19" x2="6" y2="19"/><line x1="2" y1="25" x2="6" y2="25"/><line x1="10.5" y1="11" x2="23" y2="11"/><line x1="10.5" y1="16" x2="23" y2="16"/><line x1="10.5" y1="21" x2="19" y2="21"/></svg>`,
    microscope: `<svg viewBox="0 0 30 38" width="30" height="38" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M12 34h10"/><path d="M17 34v-6.5"/><circle cx="17" cy="24" r="3.7"/><path d="M13.5 21 8 8.5"/><path d="M6.5 5 11 7l-2 4.4-4.5-2 2-4.4Z"/><path d="M19.5 21h6.5"/><path d="M22.5 21v-4.5"/></svg>`,
    camera: `<svg viewBox="0 0 36 28" width="40" height="32" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="2" y="7" width="32" height="19" rx="2"/><path d="M12 7l2.5-4h7L24 7"/><circle cx="18" cy="16.5" r="6"/><circle cx="18" cy="16.5" r="2.4"/></svg>`,
    gear: `<svg viewBox="0 0 34 34" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1"><circle cx="17" cy="17" r="5.3"/><path d="M17 3v4.4M17 26.6V31M31 17h-4.4M7.4 17H3M26.6 7.4l-3.1 3.1M10.5 23.5l-3.1 3.1M26.6 26.6l-3.1-3.1M10.5 10.5 7.4 7.4"/><circle cx="17" cy="17" r="13"/></svg>`
  };

  const order = ['books','cap','newspaper','palette','music','flask','formula','monitor','laptop','keyboard','circuit','globe','pen','notebook','microscope','camera','gear'];
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  function build() {
    layer.innerHTML = '';
    const n = order.length;
    const baseRadiusX = Math.min(W() * 0.40, 400);
    const baseRadiusY = Math.min(H() * 0.38, 340);

    order.forEach((key, i) => {
      const angle = (i / n) * Math.PI * 2 + (i % 2 === 0 ? 0.06 : -0.06);
      const jitterR = 0.82 + (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.34;
      const depth = (Math.cos(i * 7.233) * 0.5 + 0.5);

      const finalX = Math.cos(angle) * baseRadiusX * jitterR;
      const finalY = Math.sin(angle) * baseRadiusY * jitterR;
      const scale = 0.55 + depth * 0.5;
      const rotFinal = (Math.sin(i * 3.77) * 10).toFixed(1);
      const rotFloat = (parseFloat(rotFinal) + (Math.cos(i * 5.1) * 4)).toFixed(1);

      const spreadX = finalX * 1.26;
      const spreadY = finalY * 1.26;

      const dirX = Math.cos(angle), dirY = Math.sin(angle);
      const startX = dirX * (W() * 0.7 + 160);
      const startY = dirY * (H() * 0.7 + 160);
      const startRot = (Math.sin(i * 9.1) * 70).toFixed(1);

      const outer = document.createElement('div');
      outer.className = 'auth-obj-outer';
      if (depth < 0.32) outer.setAttribute('data-mobile-hide', '1');

      const floatEl = document.createElement('div');
      floatEl.className = 'auth-obj-float';
      floatEl.style.setProperty('--r0', rotFinal + 'deg');
      floatEl.style.setProperty('--r1', rotFloat + 'deg');
      floatEl.style.setProperty('--fy', (7 + depth * 8).toFixed(0) + 'px');
      floatEl.style.animationDuration = (7 + depth * 5).toFixed(1) + 's';
      floatEl.style.animationDelay = (i * 0.3).toFixed(2) + 's';

      const iconEl = document.createElement('div');
      iconEl.className = 'auth-obj-icon';
      iconEl.style.setProperty('--depth-op', (0.4 + depth * 0.35).toFixed(2));
      iconEl.style.setProperty('--depth-blur', ((1 - depth) * 1.1).toFixed(2) + 'px');
      iconEl.style.transform = `scale(${scale})`;
      iconEl.innerHTML = icons[key];

      floatEl.appendChild(iconEl);
      outer.appendChild(floatEl);
      layer.appendChild(outer);

      if (reduceMotion) {
        outer.style.transition = 'opacity 0.8s ease';
        outer.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
        outer.style.opacity = '1';
        outer.classList.add('settled');
      } else {
        outer.style.transition = 'none';
        outer.style.transform = `translate3d(${startX}px, ${startY}px, 0) rotate(${startRot}deg) scale(0.4)`;
        outer.style.opacity = '0';
        void outer.offsetWidth;

        const delay1 = 100 + i * 50;
        setTimeout(() => {
          outer.style.transition = `transform 1.2s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease`;
          outer.style.transform = `translate3d(${spreadX}px, ${spreadY}px, 0) rotate(${rotFinal}deg) scale(1)`;
          outer.style.opacity = '1';
        }, delay1);

        const delay2 = delay1 + 1300;
        setTimeout(() => {
          outer.style.transition = `transform 1.3s cubic-bezier(0.22,1,0.36,1)`;
          outer.style.transform = `translate3d(${finalX}px, ${finalY}px, 0) rotate(${rotFinal}deg) scale(1)`;
        }, delay2);

        const delay3 = delay2 + 1400;
        setTimeout(() => { outer.classList.add('settled'); }, delay3);
      }
    });
  }

  function playScene() {
    build();
    requestAnimationFrame(() => {
      ring.classList.add('show');
      emblem.classList.add('show');
    });
  }

  function resetScene() {
    ring.classList.remove('show');
    emblem.classList.remove('show');
  }

  // Watch the existing open/close mechanism (openAuth/closeAuth already
  // toggle this class) rather than wrapping those functions.
  let wasOpen = backdrop.classList.contains('open');
  const observer = new MutationObserver(() => {
    const isOpen = backdrop.classList.contains('open');
    if (isOpen && !wasOpen) playScene();
    if (!isOpen && wasOpen) resetScene();
    wasOpen = isOpen;
  });
  observer.observe(backdrop, { attributes: true, attributeFilter: ['class'] });

  if (wasOpen) playScene();

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!backdrop.classList.contains('open')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 250);
  });
})();
