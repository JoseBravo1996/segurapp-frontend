import { Platform } from 'react-native';

const SEGURAPP_FAVICON_DATA_URI =
  'data:image/png;base64,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';

export function setupWebBranding() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  // 1. Título oficial permanente
  document.title = 'SegurAPP';

  // 2. Favicon oficial permanente
  try {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.type = 'image/png';
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = SEGURAPP_FAVICON_DATA_URI;

    // Asegurar también apple-touch-icon para navegadores móviles y desktop Safari
    let appleLink = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = SEGURAPP_FAVICON_DATA_URI;
  } catch (err) {
    console.warn('[webBranding] Error aplicando favicon:', err);
  }

  // 3. Observer para asegurar que el título se mantenga siempre en 'SegurAPP'
  if (!window.__segurappTitleObserverInstalled && typeof MutationObserver !== 'undefined') {
    window.__segurappTitleObserverInstalled = true;
    const titleEl = document.querySelector('title');
    if (titleEl) {
      const observer = new MutationObserver(() => {
        if (document.title !== 'SegurAPP') {
          document.title = 'SegurAPP';
        }
      });
      observer.observe(titleEl, { childList: true });
    }
  }
}

