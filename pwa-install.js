// pwa-install.js
// Split out from script.js and loaded early/deferred (see index.html) so
// install and the service worker work immediately, independent of how long
// the much larger script.js takes to download on a slow connection — the
// whole point of this button existing.

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

// --- Install prompt ---
// Chrome's own beforeinstallprompt event is unreliable — it can take
// several visits before Chrome decides to fire it, and it never fires at
// all on iOS or once dismissed once (browsers back off for a while). A
// button that only appears when that event fires is, in practice, a
// button most people never see. So instead: the button is ALWAYS visible,
// and always does something useful when tapped — the real native prompt
// if Chrome has made it available yet, otherwise clear step-by-step
// instructions for whatever browser/OS they're actually on.
let deferredInstallPrompt = null;
const installBtns = document.querySelectorAll('.install-app-btn');
const installHelpOverlay = document.getElementById('installHelpOverlay');
const installHelpText = document.getElementById('installHelpText');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

function installInstructionsFor() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  if (isIos) {
    return 'Tap the Share icon in your browser toolbar, then choose "Add to Home Screen."';
  }
  if (isAndroid) {
    // Apps opened from inside WhatsApp/Facebook/etc. and many phone-maker
    // browsers (Hisense, Samsung Internet, Opera Mini, UC, Mi Browser) can't
    // install web apps properly — Chrome can.
    const inAppBrowser = /; wv\)|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);
    const isChrome = /chrome\//i.test(ua) && !/SamsungBrowser|OPR\/|OPiOS|UCBrowser|MiuiBrowser|HuaweiBrowser|Edg|VivoBrowser|HeyTap/i.test(ua);
    if (inAppBrowser || !isChrome) {
      return 'This browser can\'t install the app properly. Copy this page\'s link, open it in Google Chrome, then tap Chrome\'s menu (⋮) and choose "Install app" or "Add to Home screen."';
    }
    return 'Open Chrome\'s menu (⋮ in the top-right corner), then tap "Install app" or "Add to Home screen." If you only see "Add to Home screen," that works too.';
  }
  return 'Look for an install icon in your browser\'s address bar, or open the browser menu and choose "Install Namitete Co-Students."';
}

function openInstallHelp() {
  installHelpText.textContent = installInstructionsFor();
  installHelpOverlay.classList.add('open');
  pushNavHistory(closeInstallHelp);
}
// Pure UI restore, no history calls — this is what popstate runs as the
// undo (see pushNavHistory/goBackNav in script.js's back-navigation helpers).
function closeInstallHelp() {
  installHelpOverlay.classList.remove('open');
}
document.getElementById('installHelpClose').addEventListener('click', goBackNav);
installHelpOverlay.addEventListener('click', (e) => {
  if (e.target === installHelpOverlay) goBackNav();
});

installBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    } else {
      openInstallHelp();
    }
  });
});

window.addEventListener('appinstalled', () => {
  installBtns.forEach(btn => { btn.style.display = 'none'; });
  deferredInstallPrompt = null;
});

// Already running as an installed app — the button would be pointless,
// hide it from the start rather than waiting for the appinstalled event
// (which only fires for the install action itself, not on every launch).
(function hideInstallBtnsIfAlreadyInstalled() {
  const isStandalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) installBtns.forEach(btn => { btn.style.display = 'none'; });
})();
