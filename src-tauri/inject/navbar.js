(function() {
  if (window.__TORI_INJECTED__) return;
  window.__TORI_INJECTED__ = true;

  const WINDOW_LABEL = "__WINDOW_LABEL__";

  const _lang = localStorage.getItem('tori-sidebar-language') || 'en';
  const _t = {
    back: { en: 'Back', zh: '返回' },
    reload: { en: 'Reload', zh: '刷新' },
    openExternal: { en: 'Open in browser', zh: '用浏览器打开' },
    minimize: { en: 'Minimize', zh: '最小化' },
    close: { en: 'Close', zh: '关闭' },
  };

  function tauriInvoke(cmd, args) {
    try {
      const tauri = window.__TAURI__ || window.__TAURI_INTERNALS__;
      if (tauri?.invoke) {
        return tauri.invoke(cmd, args);
      }
      if (tauri?.core?.invoke) {
        return tauri.core.invoke(cmd, args);
      }
    } catch(e) {}
    console.warn('[Tori] invoke unavailable:', cmd);
    return Promise.reject('Tauri not ready');
  }

  function shouldOpenInternally(url) {
    try {
      const resolved = new URL(url, document.baseURI);
      const target = resolved.hostname;
      const current = location.hostname;
      const result = target === current;
      console.log('[Tori] shouldOpenInternally:', { url, resolved: resolved.href, target, current, result });
      return result;
    } catch (e) {
      console.log('[Tori] shouldOpenInternally failed:', url, e.message);
      return false;
    }
  }

  function resolveUrl(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch {
      return url;
    }
  }

  // Intercept window.open
  const origOpen = window.open;
  window.open = function(url, target, features) {
    if (!url) return origOpen.apply(this, arguments);
    const internal = shouldOpenInternally(url);
    console.log('[Tori] window.open intercepted:', url, 'internal?', internal);
    if (internal) {
      tauriInvoke('open_child_window', { parentLabel: WINDOW_LABEL, url: resolveUrl(url), title: target || document.title || '', lang: _lang })
        .then(r => console.log('[Tori] open_child_window ok:', r))
        .catch(e => console.error('[Tori] open_child_window failed:', e));
      return { closed: false, close: function(){}, focus: function(){}, blur: function(){} };
    } else {
      tauriInvoke('open_external_url', { url: resolveUrl(url) })
        .then(() => console.log('[Tori] open_external_url ok'))
        .catch(e => console.error('[Tori] open_external_url failed:', e));
      return null;
    }
  };

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    let el = e.target;
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
      if (!el || el === document.body) return;
    }
    if (el.tagName !== 'A') return;
    const href = el.getAttribute('href');
    const target = el.getAttribute('target');
    if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (target === '_blank' || target === '_new') {
      e.preventDefault();
      e.stopPropagation();
      const internal = shouldOpenInternally(href);
      console.log('[Tori] link click intercepted:', href, 'target:', target, 'internal?', internal);
      if (internal) {
        tauriInvoke('open_child_window', { parentLabel: WINDOW_LABEL, url: resolveUrl(href), title: el.textContent || '', lang: _lang })
          .then(r => console.log('[Tori] open_child_window ok:', r))
          .catch(e => console.error('[Tori] open_child_window failed:', e));
      } else {
        tauriInvoke('open_external_url', { url: resolveUrl(href) })
          .then(() => console.log('[Tori] open_external_url ok'))
          .catch(e => console.error('[Tori] open_external_url failed:', e));
      }
    }
  }, true);

  // Intercept form submit
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName !== 'FORM') return;
    const target = form.getAttribute('target');
    const action = form.getAttribute('action');
    if ((target === '_blank' || target === '_new') && action) {
      e.preventDefault();
      if (shouldOpenInternally(action)) {
        tauriInvoke('open_child_window', { parentLabel: WINDOW_LABEL, url: resolveUrl(action), title: '', lang: _lang });
      } else {
        tauriInvoke('open_external_url', { url: resolveUrl(action) });
      }
    }
  }, true);

  // Floating nav bar
  function mountBar() {
    if (document.getElementById('__tori_nav_bar__')) return;
    if (!document.body) { setTimeout(mountBar, 50); return; }

    const bar = document.createElement('div');
    bar.id = '__tori_nav_bar__';
    bar.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;gap:8px;padding:6px 12px;border-radius:20px;background:rgba(30,30,34,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.08);transition:opacity 0.3s ease;opacity:0.3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    bar.onmouseenter = function() { bar.style.opacity = '1'; };
    bar.onmouseleave = function() { bar.style.opacity = '0.3'; };

    const btnStyle = 'width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:white;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;padding:0;line-height:1';

    const back = document.createElement('button');
    back.id = '__tori_nav_back__';
    back.innerHTML = '←';
    back.title = _t.back[_lang] || _t.back['en'];
    back.style.cssText = btnStyle;
    back.onclick = function(e) { e.stopPropagation(); history.back(); };
    bar.appendChild(back);

    function updateBackButton() {
      const btn = document.getElementById('__tori_nav_back__');
      if (!btn) return;
      btn.style.display = history.length > 1 ? 'flex' : 'none';
    }
    updateBackButton();
    window.addEventListener('popstate', updateBackButton);
    // Also update after intercepted navigations
    const origPushState = history.pushState;
    history.pushState = function() { origPushState.apply(this, arguments); updateBackButton(); };
    const origReplaceState = history.replaceState;
    history.replaceState = function() { origReplaceState.apply(this, arguments); updateBackButton(); };

    const reload = document.createElement('button');
    reload.innerHTML = '↻';
    reload.title = _t.reload[_lang] || _t.reload['en'];
    reload.style.cssText = btnStyle;
    reload.onclick = function(e) { e.stopPropagation(); location.reload(); };
    bar.appendChild(reload);

    const openExternal = document.createElement('button');
    openExternal.innerHTML = '↗';
    openExternal.title = _t.openExternal[_lang] || _t.openExternal['en'];
    openExternal.style.cssText = btnStyle;
    openExternal.onclick = function(e) { e.stopPropagation(); tauriInvoke('open_external_url', { url: location.href }); };
    bar.appendChild(openExternal);

    const minimize = document.createElement('button');
    minimize.innerHTML = '−';
    minimize.title = _t.minimize[_lang] || _t.minimize['en'];
    minimize.style.cssText = btnStyle;
    minimize.onclick = function(e) { e.stopPropagation(); tauriInvoke('minimize_app_window', { label: WINDOW_LABEL }); };
    bar.appendChild(minimize);

    const close = document.createElement('button');
    close.innerHTML = '×';
    close.title = _t.close[_lang] || _t.close['en'];
    close.style.cssText = 'width:28px;height:28px;border-radius:50%;border:none;background:rgba(239,68,68,0.8);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;padding:0;line-height:1';
    close.onclick = function(e) { e.stopPropagation(); tauriInvoke('close_app_window', { label: WINDOW_LABEL }); };
    bar.appendChild(close);

    document.body.appendChild(bar);
  }
  mountBar();
})();