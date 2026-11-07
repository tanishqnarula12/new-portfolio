/* Tanishq Narula: interaction layer for every page.
 *
 *  - doors: hover cracks a door, a click swings it open and walks you through into the room behind it
 *    (the category page, preloaded in a frame), back swings it shut. Same spring as the reference.
 *  - the ability card on the portrait: a holographic card that tilts on springs and flips.
 *  - the project questionnaire behind every "Get in touch" / "Say hello" / "Contact".
 *  - rooms: a page opened inside a door talks to the home page instead of navigating itself.
 *  - fallbacks: if React has not hydrated, the clock, the flip calendar, the cord and the menu still work.
 *
 *  INQUIRY DELIVERY. A finished questionnaire opens WhatsApp with the message written out (INQUIRY.whatsapp).
 *  If WhatsApp cannot open, the visitor's email app opens instead (INQUIRY.email).
 *  Set `endpoint` to your email API to receive inquiries directly (JSON POST, see sendInquiry()).
 */
(() => {
  'use strict';
  if (window.__tn) return; window.__tn = true;

  const INQUIRY = Object.assign({
    endpoint: '',                 // e.g. 'https://api.example.com/inquiry' (POST, JSON body). Empty: WhatsApp, then email.
    whatsapp: '916378211535',     // first: the inquiry opens in WhatsApp, ready to send
    email: 'tanishqnarula60@gmail.com',   // if WhatsApp can't open
  }, window.TN_INQUIRY || {});

  const D = document, root = D.documentElement, W = window;
  const $ = (s, r = D) => r.querySelector(s);
  const $$ = (s, r = D) => Array.from(r.querySelectorAll(s));
  const mq = q => W.matchMedia(q);
  const reduced = () => mq('(prefers-reduced-motion: reduce)').matches;
  const canHover = () => mq('(hover: hover) and (pointer: fine)').matches;
  const EMBED = root.classList.contains('embed') || /[?&]embed\b/.test(location.search);
  if (EMBED) root.classList.add('embed');
  const path = location.pathname.replace(/index\.html$/, '');
  const IS_HOME = path === '/' || path === '';
  const MODE_KEY = 'tn-mode';
  const NAME = 'Tanishq Narula';

  const DOORS = [
    { route: '/web-developer/', title: 'Web Development', sub: 'Modern web apps, from idea to launch',
      items: ['Responsive websites & web applications', 'CRM & business management software', 'Clean, modern front-end code', 'Performance-minded builds', 'From first idea to deployment'] },
    { route: '/app-developer/', title: 'AI & Automation', sub: 'Intelligent apps and smarter workflows',
      items: ['Intelligent, AI-powered applications', 'Automating repetitive workflows', 'AI features inside real products', 'Experimenting with new models & tools', 'Learning by building'] },
    { route: '/ui-ux-designer/', title: 'UI/UX Design', sub: 'Interfaces that feel effortless',
      items: ['User flows & wireframes', 'Clean, intuitive interfaces', 'Interactive prototypes', 'Consistent design systems', 'Designs that are ready to build'] },
    { route: '/graphic-designer/', title: 'Client Work', sub: 'Real projects for real clients',
      items: ['Freelance graphic design since 2024', 'Digital creatives & social media', 'Visual communication for brands', 'Web projects for real clients', 'Working closely with every client'] },
  ];
  const CAL_WORDS = ['Software', 'AI Systems', 'Automations', 'Web Apps', 'Interfaces'];

  /* ------------------------------------------------------------------ is React running this page? */
  // one feature failing must never take the others down with it
  const safe = (name, fn) => { try { fn(); } catch (e) { try { console.error('[tn] ' + name, e); } catch (x) {} } };
  const hasFiber = el => !!el && Object.keys(el).some(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
  const reactAlive = () => hasFiber(D.getElementById('cordHit')) || hasFiber(D.getElementById('main')) || hasFiber($('.hdr')) || hasFiber($('.rn'));

  /* ------------------------------------------------------------------ a spring (critically damped by default) */
  // same integrator the doors already use: tension/friction, interruptible, starts from wherever it is
  function spring({ tension = 170, friction = 26, mass = 1 } = {}, onFrame) {
    let x = 0, target = 0, v = 0, running = false, last = 0;
    const step = now => {
      if (!running) return;
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.064); last = now;
      const f = -tension * (x - target) - friction * v;
      v += (f / mass) * dt; x += v * dt;
      if (Math.abs(v) < 0.001 && Math.abs(x - target) < 0.001) { x = target; v = 0; running = false; onFrame(x); return; }
      onFrame(x); requestAnimationFrame(step);
    };
    return {
      set(t, vel) { target = t; if (vel !== undefined) v = vel; if (!running) { running = true; last = 0; requestAnimationFrame(step); } },
      snap(t) { x = target = t; v = 0; running = false; onFrame(x); },
      get: () => x, vel: () => v, stop() { running = false; },
    };
  }

  /* ------------------------------------------------------------------ scroll lock that never touches layout */
  const swallow = e => e.preventDefault();
  const keyStop = e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key) && !e.target.closest('input,textarea,select,[contenteditable]')) e.preventDefault(); };
  let holds = 0;
  function holdScroll(on) {
    holds = Math.max(0, holds + (on ? 1 : -1));
    const lenis = W.__lenis;
    if (on && holds === 1) {
      lenis?.stop?.();
      addEventListener('wheel', swallow, { passive: false });
      addEventListener('touchmove', swallow, { passive: false });
      addEventListener('keydown', keyStop);
    } else if (!on && holds === 0) {
      lenis?.start?.();
      removeEventListener('wheel', swallow);
      removeEventListener('touchmove', swallow);
      removeEventListener('keydown', keyStop);
    }
  }
  // the dialogs can scroll inside themselves while the page is held
  const scrollableInside = el => !!el?.closest?.('.modal__panel, .holo, .tnv__phone');
  addEventListener('wheel', e => { if (holds && scrollableInside(e.target)) e.stopImmediatePropagation(); }, { capture: true, passive: true });
  // ...and the full-size viewer's own scroller and video controls (scrubbing a recording on a phone is a drag)
  addEventListener('touchmove', e => { if (holds && e.target?.closest?.('.tnv__phone, .tnv__box video')) e.stopImmediatePropagation(); }, { capture: true, passive: true });

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ================================================================== theme: one key, one toggle */
  function setMode(dark) {
    const apply = () => {
      if (dark) root.dataset.mode = 'dark'; else delete root.dataset.mode;
      try { localStorage.setItem(MODE_KEY, dark ? 'dark' : 'light'); } catch (e) {}
      $('#cordHit')?.setAttribute('aria-checked', String(dark));
      $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1A1818' : '#EEEAE6');
    };
    if (D.startViewTransition && !reduced()) D.startViewTransition(apply); else apply();
  }
  // React owns the cord when it is running (pull it, or click it). If it is not, a click still switches the light.
  addEventListener('click', e => {
    if (!e.target.closest('#cordHit') || reactAlive()) return;
    e.preventDefault();
    setMode(root.dataset.mode !== 'dark');
    const cv = $('canvas.cord__cv');
    if (cv && !reduced()) cv.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(14px)' }, { transform: 'translateY(-4px)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  }, true);
  addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'cordHit' && !reactAlive()) { e.preventDefault(); setMode(root.dataset.mode !== 'dark'); }
  });

  /* ================================================================== the loader never sticks */
  if (root.classList.contains('tn-return')) {
    const l = D.getElementById('loader');
    if (l) { l.classList.add('out'); l.style.display = 'none'; }
    D.body.classList.add('ready'); W.dispatchEvent(new Event('intro:ready'));
  }
  setTimeout(() => {
    const l = D.getElementById('loader');
    if (l && !l.classList.contains('out')) {
      l.classList.add('out'); D.body.classList.add('ready');
      W.dispatchEvent(new Event('intro:ready'));
      setTimeout(() => { l.style.display = 'none'; }, 950);
    }
  }, EMBED ? 0 : 3600);

  /* ================================================================== header: translucent once you scroll */
  let stuckRaf = 0;
  const stuck = () => { stuckRaf = 0; const h = $('.hdr'); if (h) h.classList.toggle('stuck', scrollY > 10); };
  addEventListener('scroll', () => { if (!stuckRaf) stuckRaf = requestAnimationFrame(stuck); }, { passive: true });
  stuck();

  /* ================================================================== back to top: progress ring, and dark over dark */
  function lumUnder(x, y, skip) {
    const els = D.elementsFromPoint ? D.elementsFromPoint(x, y) : [];
    for (const el of els) {
      if (skip && skip.contains(el)) continue;
      for (let n = el; n && n !== D.documentElement; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor, m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
        if (m && (m[4] === undefined || +m[4] > 0.5)) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
      }
    }
    return root.dataset.mode === 'dark' ? 0.08 : 0.95;
  }
  let ttRaf = 0;
  function totop() {
    ttRaf = 0;
    const b = $('button.totop'); if (!b) return;
    const max = D.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    b.style.setProperty('--len', (2 * Math.PI * 24).toFixed(2));
    b.style.setProperty('--p', p.toFixed(4));
    const r = b.getBoundingClientRect();
    if (r.width) b.dataset.on = lumUnder(r.left + r.width / 2, r.top + r.height / 2, b) < 0.45 ? 'dark' : 'light';
    if (!reactAlive()) b.classList.toggle('show', scrollY > innerHeight * 0.7);
  }
  addEventListener('scroll', () => { if (!ttRaf) ttRaf = requestAnimationFrame(totop); }, { passive: true });
  // the trip back up goes through the smooth-scroll engine when it is running: a native smooth scroll gets cancelled
  // by a scroll that is still gliding, which is why it only worked sometimes. Every page, every back-to-top button.
  addEventListener('click', e => {
    if (e.button) return;
    const b = e.target.closest('button.totop, [data-nav="top"], .sf__bot button');
    if (!b) return;
    if (b.matches('.sf__bot button') && !/top/i.test(b.textContent + ' ' + (b.getAttribute('aria-label') || ''))) return;
    e.preventDefault(); e.stopPropagation();
    const L = W.__lenis;
    if (L && typeof L.scrollTo === 'function') {
      L.start && L.start();
      L.scrollTo(0, { duration: reduced() ? 0 : 1.15, easing: x => 1 - Math.pow(1 - x, 3), force: true });
    } else scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    const top = D.getElementById('main') || D.querySelector('main');
    if (top && e.detail === 0) { top.setAttribute('tabindex', '-1'); top.focus({ preventScroll: true }); }   // keyboard users land at the top too
  }, true);
  addEventListener('resize', totop);
  new MutationObserver(() => totop()).observe(root, { attributes: true, attributeFilter: ['data-mode'] });

  /* ================================================================== fallbacks for a page React did not pick up */
  function startFallbacks() {
    if (reactAlive() || EMBED) return;
    // clock
    const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const tick = () => {
      const d = new Date(), h = d.getHours();
      const t = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
      $$('.clock__time').forEach(e => { if (e.textContent !== t) e.textContent = t; });
      $$('.clock__date').forEach(e => { e.textContent = `${d.getDate()} ${M[d.getMonth()]}, ${d.getFullYear()}`; });
      $$('.clock__ds').forEach(e => { e.textContent = `${d.getDate()} ${M[d.getMonth()].slice(0, 3)}`; });
    };
    tick(); setInterval(tick, 15000);
    // flip calendar: the same rhythm React uses (1.25 s turn, 1.7 s rest)
    const cal = D.getElementById('cal');
    if (cal) {
      const face = $('.cal__face', cal), page = $('.cal__page', cal), leaf = $('.cal__leaf', cal), n = CAL_WORDS.length;
      const put = (el, i) => { $('.cal__word', el).textContent = CAL_WORDS[i]; $('.cal__no', el).textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`; };
      let i = 0;
      const turn = () => {
        if (D.hidden) return setTimeout(turn, 600);
        const next = (i + 1) % n;
        if (reduced() || !leaf.animate) { put(face, i = next); put(page, (i + 1) % n); return setTimeout(turn, 2400); }
        face.animate([{ opacity: 1 }, { opacity: 1, offset: 0.285 }, { opacity: 0, offset: 0.295 }, { opacity: 0 }], { duration: 1250, fill: 'forwards' });
        const a = leaf.animate([{ transform: 'translateZ(.004em) rotateX(0deg)' }, { transform: 'translateZ(.004em) rotateX(352deg)' }], { duration: 1250, easing: 'cubic-bezier(.5,.05,.2,1)', fill: 'forwards' });
        a.onfinish = () => { put(face, i = next); leaf.getAnimations({ subtree: true }).forEach(x => x.cancel()); put(page, (i + 1) % n); setTimeout(turn, 1700); };
      };
      if (face && page && leaf) { put(face, 0); put(page, 1); setTimeout(turn, 1300); }
    }
    // mobile wall of doors: scroll moves you along it
    const sec = D.getElementById('works'), row = sec && $('.doors__row', sec);
    if (sec && row) {
      const mob = () => {
        if (innerWidth >= 640) { row.style.transform = ''; return; }
        const r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight; if (span <= 0) return;
        const p = Math.min(1, Math.max(0, -r.top / span)), kids = row.children;
        if (kids.length > 1) row.style.transform = `translate3d(${(-(3 * p) * (kids[1].offsetLeft - kids[0].offsetLeft)).toFixed(2)}px,0,0)`;
        const k = Math.min(3, Math.round(3 * p));
        $$('.doors__dots i', sec).forEach((d, j) => d.classList.toggle('on', j === k));
        fillInfo(k); $('#dinfo')?.classList.add('on');
      };
      addEventListener('scroll', mob, { passive: true }); addEventListener('resize', mob); mob();
    }
  }
  addEventListener('load', () => setTimeout(() => safe('fallbacks', startFallbacks), 1200));

  // menu, back to top, see my work: only when React is not there to do it
  function buildMenu() {
    let m = D.getElementById('navm');
    if (m) return m;
    m = D.createElement('div');
    m.className = 'navm'; m.id = 'navm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Menu');
    const items = [['Home', '/'], ['Web Development', '/web-developer/'], ['AI & Automation', '/app-developer/'], ['UI/UX Design', '/ui-ux-designer/'], ['Client Work', '/graphic-designer/'], ['My story', '/#about'], ['Contact', '/contact/']];
    m.innerHTML = `<div class="shell navm__top"><a href="/" class="brand" aria-label="${NAME} home"><span>Tanishq.</span></a>
      <button type="button" class="close-btn" id="navClose" aria-label="Close menu" style="min-height:44px;min-width:44px;display:inline-flex;align-items:center;gap:.4rem;color:#fff">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l16 16M20 4 4 20"/></svg>Close</button></div>
      <nav class="shell navm__nav" aria-label="Menu links"><ul>${items.map(([l, h], i) => `<li><a href="${h}" class="navm__item" style="--d:${80 + i * 45}ms"><small>0${i + 1}</small><span>${esc(l)}</span></a></li>`).join('')}</ul></nav>
      <div class="shell navm__bot"><span>Jaipur, India</span><a href="mailto:tanishqnarula60@gmail.com" style="color:rgba(255,255,255,.7)">tanishqnarula60@gmail.com</a><a href="/contact/" id="navStart" style="color:#fff">Start a project →</a></div>`;
    D.body.appendChild(m);
    return m;
  }
  const setMenu = open => {
    const m = buildMenu();
    m.classList.toggle('open', open); D.body.classList.toggle('nav-open', open);
    $$('#menuBtn, .mob-hdr__btn--menu').forEach(b => b.setAttribute('aria-expanded', String(open)));
    if (open) setTimeout(() => $('#navClose', m)?.focus(), 60);
  };
  addEventListener('click', e => {
    if (reactAlive()) return;
    if (e.target.closest('#menuBtn, .mob-hdr__btn--menu')) { e.preventDefault(); setMenu(!D.getElementById('navm')?.classList.contains('open')); return; }
    if (e.target.closest('#navClose')) { setMenu(false); return; }
    if (e.target.closest('#navm a')) { setMenu(false); return; }
    if (e.target.closest('.cta-explore-btn, button.sf__ghost')) { e.preventDefault(); const w = D.getElementById('works'); if (w) w.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); else location.href = '/#works'; }
  });

  /* ================================================================== the project questionnaire */
  const STEPS = [
    { name: 'service', q: 'What do you need?', opts: [
      ['Website or web app', 'A new site, a web app or an upgrade'], ['AI tool or automation', 'Smart features or a workflow that runs itself'],
      ['UI/UX design', 'Flows, wireframes and interface design'], ['Graphic design', 'Social creatives, posters and brand visuals'],
      ['Something else', 'Tell me about it in the last step']] },
    { name: 'size', q: 'How big is the project?', opts: [
      ['Small', 'A single page, a fix or a few creatives'], ['Medium', 'A full website, a tool or a design set'],
      ['Large', 'A product, a platform or ongoing work'], ['Not sure yet', 'We can figure it out together']] },
    { name: 'timeline', q: 'When do you want to start?', opts: [['Within a month'], ['In 1 to 3 months'], ['I\'m flexible'], ['Just exploring for now']] },
    { name: 'client', q: 'Who is this for?', opts: [['A business'], ['A startup'], ['An agency, for one of its clients'], ['A personal project']] },
  ];
  let tq = null, tqStep = 0, tqLast = null;
  function buildInquiry() {
    if (tq) return tq;
    tq = D.createElement('div');
    tq.className = 'modal tq'; tq.id = 'tq'; tq.hidden = true;
    tq.setAttribute('role', 'dialog'); tq.setAttribute('aria-modal', 'true'); tq.setAttribute('aria-labelledby', 'tqTitle');
    const opt = (name, [v, sub]) => `<label class="tq__opt"><span>${esc(v)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><input type="radio" name="${name}" value="${esc(v)}"><i aria-hidden="true"></i></label>`;
    tq.innerHTML = `<div class="modal__panel">
      <button type="button" class="x-btn" data-tq-close aria-label="Close"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div id="tqForm">
        <div class="mhead"><div class="mhead__tag"><span class="mhead__dot" aria-hidden="true"></span><span class="mhead__eyebrow">Start a project</span></div>
          <h2 class="mhead__title" id="tqTitle">Tell me what you need built.</h2><small class="tq__min">Five quick questions, then I'll get back to you.</small></div>
        <form class="mform" novalidate>
          <div class="tq__top" aria-hidden="true"><span id="tqStepLbl">1 of 5</span><span class="tq__bar"><i id="tqBar"></i></span></div>
          ${STEPS.map((s, i) => `<fieldset data-step="${i}" ${i ? 'hidden' : ''}><legend tabindex="-1">${esc(s.q)}</legend>${s.opts.map(o => opt(s.name, o)).join('')}</fieldset>`).join('')}
          <fieldset data-step="4" hidden><legend tabindex="-1">Last step: how do I reach you?</legend>
            <div class="mfield"><label class="mfield__lbl" for="tqName">Name</label><div class="mfield__box"><input class="mfield__input" id="tqName" name="name" autocomplete="name" maxlength="80" placeholder="Your name" required></div></div>
            <div class="mfield"><label class="mfield__lbl" for="tqEmail">Email</label><div class="mfield__box"><input class="mfield__input" id="tqEmail" name="email" type="email" autocomplete="email" maxlength="120" placeholder="you@company.com" required></div></div>
            <div class="mfield"><label class="mfield__lbl" for="tqPhone">Phone <span style="text-transform:none;letter-spacing:0;opacity:.7">(optional)</span></label><div class="mfield__box"><input class="mfield__input" id="tqPhone" name="phone" type="tel" autocomplete="tel" maxlength="20" placeholder="With country code"></div></div>
            <div class="mfield"><label class="mfield__lbl" for="tqAbout">About the project</label><div class="mfield__box"><textarea class="mfield__input" id="tqAbout" name="project" rows="4" maxlength="1500" placeholder="What are you building, and what should it achieve? Links help." required></textarea></div></div>
          </fieldset>
          <p class="tq__err" id="tqErr" role="alert"></p>
          <div class="tq__bot">
            <button type="button" class="tq__back" id="tqBack" hidden>Back</button>
            <span class="tq__note" id="tqNote">Pick one to continue</span>
            <button type="submit" class="pill pill--dark pill--arrow mform__submit-btn" id="tqNext" hidden><span class="pill__in"><span id="tqNextLbl">Send on WhatsApp</span><span class="pill__badge pill__badge--wa"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg></span></span></button>
          </div>
        </form>
      </div>
      <div class="msuccess" id="tqDone" role="status" aria-live="polite" hidden>
        <div class="msuccess__badge" aria-hidden="true"><svg viewBox="0 0 48 48" fill="currentColor"><path d="M24 2c2.2 13.8 7.9 19.6 22 22-14.1 2.4-19.8 8.2-22 22-2.2-13.8-7.9-19.6-22-22 14.1-2.4 19.8-8.2 22-22Z"/></svg></div>
        <h2 class="msuccess__title" id="tqDoneT" tabindex="-1">Thank you</h2>
        <p class="msuccess__desc" id="tqDoneP"></p>
        <div class="msuccess__actions" id="tqDoneA"></div>
        <button type="button" class="pill pill--dark msuccess__close-btn" data-tq-close><span class="pill__in">Close</span></button>
      </div>
    </div>`;
    D.body.appendChild(tq);
    const form = $('form', tq);
    tq.addEventListener('click', e => { if (e.target === tq || e.target.closest('[data-tq-close]')) closeInquiry(); });
    tq.addEventListener('mousemove', e => { const p = $('.modal__panel', tq), r = p.getBoundingClientRect(); p.style.setProperty('--mouse-x', `${e.clientX - r.left}px`); p.style.setProperty('--mouse-y', `${e.clientY - r.top}px`); });
    form.addEventListener('change', e => {
      if (e.target.type === 'radio' && tqStep < 4) { $('#tqErr', tq).textContent = ''; setTimeout(() => goStep(tqStep + 1), reduced() ? 0 : 220); }
    });
    $('#tqBack', tq).addEventListener('click', () => goStep(tqStep - 1));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (tqStep < 4) { if (!form.querySelector(`fieldset[data-step="${tqStep}"] input:checked`)) return err('Pick one to continue.'); return goStep(tqStep + 1); }
      const f = new FormData(form), data = Object.fromEntries(f.entries());
      if (!data.name || data.name.trim().length < 2) return err('Please add your name.', '#tqName');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((data.email || '').trim())) return err('Please add an email I can reply to.', '#tqEmail');
      if (!data.project || data.project.trim().length < 15) return err('A sentence or two about the project, please.', '#tqAbout');
      submitInquiry(data, 'questionnaire');
    });
    tq.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); closeInquiry(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button:not([hidden]), input, textarea, [tabindex="0"]', tq).filter(n => n.offsetParent !== null && !n.disabled && !n.closest('[hidden]'));
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    return tq;
  }
  function err(msg, focus) { $('#tqErr', tq).textContent = msg; if (focus) $(focus, tq)?.focus(); const p = $('.modal__panel', tq); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); }
  function goStep(i) {
    tqStep = Math.max(0, Math.min(4, i));
    $$('fieldset[data-step]', tq).forEach(f => { f.hidden = +f.dataset.step !== tqStep; });
    $('#tqStepLbl', tq).textContent = `${tqStep + 1} of 5`;
    $('#tqBar', tq).style.setProperty('--p', ((tqStep + 1) / 5).toFixed(2));
    $('#tqBack', tq).hidden = tqStep === 0;
    $('#tqNext', tq).hidden = tqStep < 4;
    $('#tqNote', tq).textContent = tqStep < 4 ? 'Pick one to continue' : 'I usually reply within a day.';
    $('#tqErr', tq).textContent = '';
    const fs = $(`fieldset[data-step="${tqStep}"]`, tq);
    const first = fs.querySelector('input:checked') || fs.querySelector('input, textarea');
    setTimeout(() => (tqStep < 4 ? fs.querySelector('legend') : first)?.focus({ preventScroll: true }), 30);
    if (tqStep < 4 && first) first.tabIndex = 0;
  }
  function openInquiry(prefill) {
    buildInquiry();
    tqLast = D.activeElement;
    $('#tqForm', tq).hidden = false; $('#tqDone', tq).hidden = true;
    if (prefill !== 'keep') { $('form', tq).reset(); goStep(0); }
    tq.hidden = false; holdScroll(true);
    requestAnimationFrame(() => requestAnimationFrame(() => tq.classList.add('open', 'on')));
  }
  function closeInquiry() {
    if (!tq || tq.hidden) return;
    tq.classList.remove('open', 'on');
    setTimeout(() => { tq.hidden = true; }, reduced() ? 0 : 380);
    holdScroll(false);
    tqLast?.focus?.({ preventScroll: true });
  }
  W.tnOpenInquiry = openInquiry;

  function inquiryText(d) {
    const lines = [`Hi Tanishq 👋`, '', 'I\'d like to talk about a project.', ''];
    [['What I need', d.service], ['Size', d.size], ['Timeline', d.timeline], ['For', d.client], ['Name', d.name], ['Email', d.email], ['Phone', d.phone]]
      .forEach(([k, v]) => { if (v && String(v).trim()) lines.push(`${k}: ${String(v).trim()}`); });
    lines.push('', 'About the project:', (d.project || '').trim());
    return lines.join('\n');
  }
  // THE place to wire the email API: with INQUIRY.endpoint set, every inquiry POSTs
  // { name, email, phone, service, size, timeline, client, project, source, page, message, sentAt } as JSON.
  async function sendInquiry(d, source) {
    const payload = Object.assign({}, d, { source, page: location.href, message: inquiryText(d), sentAt: new Date().toISOString() });
    if (INQUIRY.endpoint) {
      const r = await fetch(INQUIRY.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('inquiry endpoint ' + r.status);
      return { via: 'api' };
    }
    return { via: 'mail' };
  }
  const mailUrl = d => `mailto:${INQUIRY.email}?subject=${encodeURIComponent('New project inquiry' + (d.service ? ' · ' + d.service : '') + (d.name ? ' — ' + d.name.trim() : ''))}&body=${encodeURIComponent(inquiryText(d))}`;
  const waUrl = d => `https://wa.me/${INQUIRY.whatsapp}?text=${encodeURIComponent(inquiryText(d))}`;
  // WhatsApp must open inside the click itself (a browser blocks a window opened later), so this stays synchronous.
  // If the browser refuses the new window, the email app opens with the same message instead.
  function openChannel(d) {
    let w = null;
    try { w = W.open(waUrl(d), '_blank'); } catch (e) { w = null; }
    if (w) { try { w.opener = null; } catch (e) {} return 'whatsapp'; }
    try { location.href = mailUrl(d); } catch (e) {}
    return 'mail';
  }
  function showDone(d, via, failed) {
    buildInquiry();
    const first = (d.name || '').trim().split(/\s+/)[0];
    $('#tqDoneT', tq).textContent = via === 'api' ? `Thanks${first ? ', ' + first : ''}!` : 'Almost there';
    $('#tqDoneP', tq).textContent =
      via === 'api' ? 'Your inquiry is in. I\'ll reply soon.' :
      via === 'mail' ? 'WhatsApp could not open here, so your email app has the message ready instead. Press send there and I\'ll reply soon.' :
      (failed ? 'The form could not send just now, so WhatsApp has your message ready instead. Press send there.'
              : 'WhatsApp has opened with your message ready to go. Press send there and I\'ll reply soon.');
    $('#tqDoneA', tq).innerHTML = via === 'api' ? '' :
      (via === 'mail'
        ? `<a class="pill pill--outline msuccess__action-btn" href="${esc(waUrl(d))}" target="_blank" rel="noopener noreferrer"><span class="pill__in">Try WhatsApp again</span></a>`
        : `<a class="pill pill--outline msuccess__action-btn" href="${esc(waUrl(d))}" target="_blank" rel="noopener noreferrer"><span class="pill__in">Open WhatsApp</span></a>`
          + `<a class="pill pill--outline msuccess__action-btn" href="${esc(mailUrl(d))}"><span class="pill__in">Send by email instead</span></a>`)
      + `<button type="button" class="pill pill--outline msuccess__action-btn" id="tqCopy"><span class="pill__in">Copy message</span></button>`
      + (via === 'api' ? '' : `<p class="msuccess__alt" style="flex-basis:100%;margin:.35rem 0 0">Or write to <a href="${esc(mailUrl(d))}">${esc(INQUIRY.email)}</a></p>`);
    $('#tqCopy', tq)?.addEventListener('click', async ev => { const el = ev.currentTarget.querySelector('.pill__in'); try { await navigator.clipboard.writeText(inquiryText(d)); el.textContent = 'Copied'; } catch (e) { el.textContent = 'Copy failed'; } });
    if (!tq.classList.contains('on')) openInquiry('keep');
    $('#tqForm', tq).hidden = true; $('#tqDone', tq).hidden = false;
    setTimeout(() => $('#tqDoneT', tq).focus(), 40);
  }
  function submitInquiry(d, source) {
    buildInquiry();
    if (!INQUIRY.endpoint) {                       // no API yet: straight to WhatsApp, inside this same click
      showDone(d, openChannel(d));
      return;
    }
    const btn = $('#tqNext', tq), lbl = $('#tqNextLbl', tq);
    btn.disabled = true; lbl.textContent = 'Sending…';
    sendInquiry(d, source).then(() => showDone(d, 'api'))
      .catch(() => showDone(d, openChannel(d), true))
      .finally(() => { btn.disabled = false; lbl.textContent = 'Send on WhatsApp'; });
  }

  // every "get in touch" opens the questionnaire, over whatever page (or room) you are on
  const CONTACT_SEL = '.cta-talk-btn, button.sf__btn, a.sf__btn, #navStart, a[href="#inquiry"], [data-contact], #mSend';
  addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let t = e.target.closest(CONTACT_SEL);
    const navContact = e.target.closest('.hdr .nav a[href^="/contact"], .rn a[href^="/contact"], #navm a[href^="/contact"], #navm button.navm__item');
    if (!t && navContact && (navContact.tagName === 'A' || /contact/i.test(navContact.textContent))) t = navContact;
    if (!t) return;
    if (t.closest('#tq')) return;
    e.preventDefault(); e.stopPropagation();
    if (D.getElementById('navm')?.classList.contains('open')) { D.getElementById('navClose')?.click(); }
    openInquiry();
  }, true);

  // the contact page's own form goes through the same pipeline
  addEventListener('submit', e => {
    const form = e.target;
    if (!form.matches || !form.matches('main form.mform') || form.closest('#tq')) return;
    e.preventDefault(); e.stopPropagation();
    const g = n => (form.querySelector(`[name="${n}"]`) || {}).value || '';
    const d = { name: g('name'), email: g('email'), phone: g('phone'), project: g('project') || g('message') };
    const bad = !d.name.trim() ? 'name' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()) ? 'email' : d.project.trim().length < 5 ? 'project' : null;
    if (bad) { form.querySelector(`[name="${bad}"]`)?.focus(); form.querySelector(`[name="${bad}"]`)?.closest('.mfield__box')?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 300 }); return; }
    submitInquiry(d, 'contact-page');
  }, true);

  /* ================================================================== rooms: a page opened inside a door */
  if (EMBED) {
    const post = m => { try { parent.postMessage(m, location.origin); } catch (e) {} };
    addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || a.target === '_blank' || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let u; try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.hash && !u.hash.startsWith('#works')) return;   // an anchor inside the room
      e.preventDefault(); e.stopPropagation();
      if ((u.pathname === '/' || u.pathname === '') && (!u.hash || u.hash === '#works')) post({ wall: 'close' });
      else post({ wall: 'go', to: u.pathname + u.hash });
    }, true);
    addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#tq:not([hidden])') && !$('.lb.open, #lb.open')) post({ wall: 'close' }); });
    addEventListener('message', e => {
      if (e.source !== parent || !e.data) return;
      const m = e.data;
      if (m.wall === 'mode') { if (m.mode === 'dark') root.dataset.mode = 'dark'; else delete root.dataset.mode; }
      if (m.wall === 'enter') { root.classList.remove('out'); scrollTo(0, 0); requestAnimationFrame(() => root.classList.add('in')); }
      if (m.wall === 'exit') { root.classList.add('out'); root.classList.remove('in'); $$('video').forEach(v => v.pause()); }
      if (m.wall === 'reset') root.classList.remove('out', 'in');
    });
  }

  /* ================================================================== doors (home page) */
  let fillInfo = () => {};
  if (IS_HOME && !EMBED) safe('doors', initDoors);

  function initDoors() {
    const sec = () => D.getElementById('works');
    const units = () => $$('#works .unit');
    const ANG = 72, WALK = 70 / 72;
    const springs = DOORS.map((_, i) => spring({ tension: 120, friction: 14 }, o => {
      const u = units()[i]; if (!u) return;
      const door = $('.door', u), v = Math.max(0, o);   // the frame's door stop: it never swings outward
      if (door) door.style.transform = `rotateY(${(v * ANG).toFixed(3)}deg)`;
      u.style.setProperty('--o', v.toFixed(4));
    }));
    let busy = false, active = -1, token = 0, px = -1, py = -1, walkRaf = 0;
    const MOB = mq('(max-width: 639.98px)');
    const info = () => D.getElementById('dinfo');
    fillInfo = i => {
      const d = info(), x = DOORS[i]; if (!d || !x) return;
      $('.dinfo__h', d).textContent = x.title; $('.dinfo__t', d).textContent = x.sub;
      $('.dinfo__p', d).innerHTML = x.items.map(s => `<li>${esc(s)}</li>`).join('');
    };
    const indexOf = el => { const w = el && el.closest ? el.closest('#works .doorway') : null; return w ? units().findIndex(u => u.contains(w)) : -1; };

    // React's own door handlers stay quiet: this engine drives the doors on every device
    ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach(type => addEventListener(type, e => {
      const i = indexOf(e.target); if (i < 0) return;
      e.stopPropagation();
      if (type === 'focusin' && e.target.matches(':focus-visible')) { set(i); prefetch(i); }
      if (type === 'focusout' && (px < 0 || indexOf(D.elementFromPoint(px, py)) < 0)) set(-1);
    }, true));

    // hover: the door cracks open and its note sits centred in the space of the doors that fade back
    function show(i) {
      const my = ++token, s = sec(), us = units(), d = info(); if (!s || !d) return;
      us.forEach((u, k) => u.classList.toggle('on', k === i));
      s.classList.add('focus');
      springs.forEach((sp, k) => sp.set(k === i ? 0.14 : 0));
      const wall = $('.doors__wall', s);
      const visible = us.filter(u => getComputedStyle(u).visibility !== 'hidden' && u.offsetWidth);
      const vi = visible.indexOf(us[i]); if (vi < 0 || !wall || visible.length < 3) return;
      const wr = wall.getBoundingClientRect(), r = us[i].getBoundingClientRect();
      const toRight = vi < 2 && visible[vi + 2];
      const a = (toRight ? visible[vi + 1] : (visible[vi - 2] || visible[vi - 1])).getBoundingClientRect();
      const b = (toRight ? visible[vi + 2] : visible[vi - 1]).getBoundingClientRect();
      const left = Math.min(a.left, b.left), right = Math.max(a.right, b.right);
      const place = () => {
        if (my !== token || active !== i) return;
        fillInfo(i);
        const w = Math.min(right - left, 22 * 16);
        d.style.width = w + 'px';
        d.style.left = (left - wr.left + (right - left - w) / 2) + 'px';
        d.style.top = (r.top - wr.top + r.height * 0.5 - d.offsetHeight / 2) + 'px';
        d.classList.add('on');
      };
      if (d.classList.contains('on')) { d.classList.remove('on'); setTimeout(place, 130); } else place();
    }
    // keep = the door being walked through: everything else settles, that one stays where it is
    function hide(keep = -1) {
      token++;
      sec()?.classList.remove('focus');
      units().forEach(u => u.classList.remove('on'));
      info()?.classList.remove('on');
      springs.forEach((sp, k) => { if (k !== keep) sp.set(0); });
    }
    const set = i => { if (busy) return; if (i === active) return; active = i; if (i < 0) hide(); else show(i); };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || MOB.matches) return;
      px = e.clientX; py = e.clientY; set(indexOf(e.target));
    }, { passive: true });
    addEventListener('scroll', () => { if (px >= 0 && !MOB.matches) set(indexOf(D.elementFromPoint(px, py))); }, { passive: true });
    D.documentElement.addEventListener('pointerleave', () => set(-1));
    addEventListener('blur', () => set(-1));

    // the page behind a door is fetched as soon as someone shows interest, so walking in is instant
    const fetched = new Set();
    function prefetch(i) {
      if (i < 0 || fetched.has(i) || !DOORS[i]) return; fetched.add(i);
      const l = D.createElement('link'); l.rel = 'prefetch'; l.href = DOORS[i].route; D.head.appendChild(l);
    }
    addEventListener('pointerover', e => prefetch(indexOf(e.target)), { passive: true });

    // "Magic happens behind the doors" is painted on as the wall comes into view, as on the reference
    (() => {
      const s = sec(); if (!s || reduced() || !('IntersectionObserver' in W) || root.classList.contains('tn-return')) return;
      if (s.getBoundingClientRect().top < innerHeight * 0.82) return;          // already on screen: leave it painted
      s.classList.remove('in'); s.classList.add('pre');
      const io = new IntersectionObserver(es => {
        if (!es.some(x => x.isIntersecting)) return;
        io.disconnect();
        s.classList.add('in');
        requestAnimationFrame(() => s.classList.remove('pre'));
      }, { rootMargin: '0px 0px -18% 0px' });
      io.observe(s);
      setTimeout(() => { s.classList.add('in'); s.classList.remove('pre'); }, 9000);   // never leave the doors hidden
    })();

    // click: the handle presses, the door swings open, and you walk through the gap beside it
    addEventListener('click', e => {
      const i = indexOf(e.target); if (i < 0) return;
      e.preventDefault(); e.stopPropagation();
      enter(i);
    }, true);

    function enter(i) {
      if (busy) return;
      const s = sec(), u = units()[i]; if (!s || !u) return;
      prefetch(i);
      hide(i); active = -1; busy = true;
      root.classList.add('tn-walking');
      $('#doorCursor')?.classList.remove('on');
      s.classList.add('lift');
      u.classList.add('press'); setTimeout(() => u.classList.remove('press'), 380);
      const r = reduced();
      setTimeout(() => springs[i].set(WALK), r ? 0 : 170);
      setTimeout(() => through(i), r ? 60 : 760);
    }

    // walking through: the whole wall scales up around the dark gap beside the open door until it fills the
    // screen, then the room (the page behind the door) takes over from that same dark
    function through(i) {
      const s = sec(), u = units()[i];
      const op = $('.opening', u).getBoundingClientRect(), dr = $('.door', u).getBoundingClientRect();
      const gapL = Math.min(Math.max(dr.right, op.left), op.right - 6);
      const gw = Math.max(op.right - gapL, 10), gh = op.height || 300;
      const cx = (gapL + op.right) / 2, cy = op.top + gh * 0.5;
      holdScroll(true);
      $('.hdr')?.classList.add('away'); $('.mob-hdr')?.classList.add('away'); $('#cord')?.classList.add('away');
      const sr = s.getBoundingClientRect();
      s.style.transformOrigin = `${(cx - sr.left).toFixed(1)}px ${(cy - sr.top).toFixed(1)}px`;
      s.classList.add('through');
      const tx = innerWidth / 2 - cx, ty = innerHeight / 2 - cy;
      const sEnd = Math.min(60, Math.max(innerWidth / gw, innerHeight / gh) * 1.15);
      const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const t0 = performance.now(), Dur = reduced() ? 1 : 1500;
      let handed = false;
      const step = now => {
        const p = Math.min(1, (now - t0) / Dur), k = ease(p), sc = Math.exp(Math.log(sEnd) * k), f = Math.min(1, k * 1.6);
        s.style.transform = `translate(${(tx * f).toFixed(2)}px, ${(ty * f).toFixed(2)}px) scale(${sc.toFixed(4)})`;
        if (!handed && (sc >= sEnd / 1.15 || p >= 1)) { handed = true; walkIn(i); }
        if (p < 1) walkRaf = requestAnimationFrame(step);
      };
      walkRaf = requestAnimationFrame(step);
    }
    let veil = null;
    function walkIn(i) {
      if (!veil) { veil = D.createElement('div'); veil.className = 'wallv tn-veil'; veil.setAttribute('aria-hidden', 'true'); D.body.appendChild(veil); }
      veil.classList.add('on');
      try { sessionStorage.setItem('tnDoor', String(i)); } catch (e) {}
      setTimeout(() => { location.href = DOORS[i].route; }, reduced() ? 0 : 260);
    }

    // coming back: you arrive at the wall with that door still open, and it swings shut behind you
    function closeBehind(i) {
      const s = sec(), u = units()[i]; if (!s || !u) return;
      cancelAnimationFrame(walkRaf);
      s.style.transform = ''; s.style.transformOrigin = '';
      s.classList.remove('through', 'lift', 'pre'); s.classList.add('in');
      veil?.classList.remove('on');
      root.classList.remove('tn-walking');
      $('.hdr')?.classList.remove('away'); $('.mob-hdr')?.classList.remove('away'); $('#cord')?.classList.remove('away');
      if (holds) { holds = 1; holdScroll(false); }
      busy = false;
      const top = s.getBoundingClientRect().top + scrollY;
      W.__lenis?.scrollTo?.(top, { immediate: true });
      scrollTo({ top, behavior: 'auto' });
      springs[i].snap(WALK);
      setTimeout(() => { springs[i].set(0); u.querySelector('.doorway')?.focus({ preventScroll: true }); }, reduced() ? 0 : 520);
    }
    let back = null;
    try {
      const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      back = sessionStorage.getItem('tnDoor'); sessionStorage.removeItem('tnDoor');
      if (!(location.hash === '#works' || (nav && nav.type === 'back_forward'))) back = null;   // only when you really came back
    } catch (e) {}
    if (back !== null && DOORS[+back]) {
      const go = () => closeBehind(+back);
      if (D.readyState === 'complete') setTimeout(go, 60); else addEventListener('load', () => setTimeout(go, 60), { once: true });
    }
    // the browser's back button can bring this page back from its cache, frozen mid-walk: swing the door shut
    addEventListener('pageshow', e => {
      if (!e.persisted) return;
      let i = -1; try { i = +sessionStorage.getItem('tnDoor'); sessionStorage.removeItem('tnDoor'); } catch (x) {}
      const open = springs.findIndex(sp => sp.get() > 0.5);
      closeBehind(i >= 0 && DOORS[i] ? i : Math.max(0, open));
    });

    // from the nav or a link on this page: go down to the doors, then open the right one and walk in
    function openDoor(i) {
      if (busy) return;
      const s = sec(); if (!s) return;
      if (MOB.matches) { location.href = DOORS[i].route; return; }
      prefetch(i);
      const top = s.getBoundingClientRect().top + scrollY;
      if (Math.abs(scrollY - top) > 4) { if (W.__lenis) W.__lenis.scrollTo(top, { duration: 0.9 }); else scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' }); }
      const t0 = performance.now();
      const settle = () => {
        if (Math.abs(scrollY - top) > 24 && performance.now() - t0 < 1600) return requestAnimationFrame(settle);
        enter(i);
      };
      requestAnimationFrame(settle);
    }
    W.tnOpenDoor = openDoor;
    addEventListener('click', e => {
      const a = e.target.closest('.hdr .nav a[href], #navm a[href], .sf .work a[href]');
      if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let u; try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
      const n = DOORS.findIndex(d => d.route === u.pathname || d.route === u.pathname + '/');
      if (n < 0 || MOB.matches) return;
      e.preventDefault(); e.stopPropagation();
      if (D.getElementById('navm')?.classList.contains('open')) D.getElementById('navClose')?.click();
      openDoor(n);
    }, true);
  }

  /* ================================================================== motion: things arrive as you reach them */
  function initMotion() {
    if (EMBED) return;
    const groups = [
      ['.sf__eye, .sf__h, .sf__p, .sf__cta, .sf__cols > div', 90],                            // the footer, on every page (its last row always shows)
      ['main#main.shell > div:first-child > *', 80],                                              // About, contact, privacy: their opening lines
      ['main#main.shell > div:nth-child(2) > *', 110],                                            // About: the cards
      ['main#main section > *:not(form)', 70],
    ];
    const seen = new Set();
    const els = [];
    groups.forEach(([sel, step]) => {
      let k = 0, parent = null;
      $$(sel).forEach(el => {
        if (seen.has(el) || el.closest('#works, #home, #about, .hero, .doors, .story, .modal, .holo, .navm')) return;
        if (el.parentElement !== parent) { parent = el.parentElement; k = 0; }
        seen.add(el);
        el.setAttribute('data-tn-r', '');
        el.style.setProperty('--tn-d', Math.min(k++ * step, 600) + 'ms');
        els.push(el);
      });
    });
    const show = el => el.classList.add('tn-in');
    if (!('IntersectionObserver' in W) || reduced()) { els.forEach(show); }
    else {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: 0 });
      els.forEach(el => { if (el.getBoundingClientRect().top < innerHeight) requestAnimationFrame(() => show(el)); else io.observe(el); });
      // at the end of the page everything is shown, whatever the observer thought
      const atEnd = () => { if (innerHeight + scrollY >= D.documentElement.scrollHeight - 4) els.forEach(show); };
      addEventListener('scroll', atEnd, { passive: true });
    }
    // "Have an idea? Let's build it.": the line lights up once it is read
    $$('.sf').forEach(sf => {
      const h2 = $('.sf__h', sf); if (!h2) return;
      if (!('IntersectionObserver' in W) || reduced()) { h2.classList.add('tn-lit'); return; }
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); setTimeout(() => h2.classList.add('tn-lit'), 350); } }, { threshold: 0.6 });
      io.observe(h2);
    });
    // the main buttons lean toward the pointer, a few pixels, on a spring
    if (canHover() && !reduced()) {
      $$('.sf__btn, .sf__ghost, .cta-talk-btn, .cta-explore-btn, .fig__card').forEach(el => {
        let raf = 0;
        const sx = spring({ tension: 260, friction: 22 }, () => draw()), sy = spring({ tension: 260, friction: 22 }, () => draw());
        const draw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.translate = `${sx.get().toFixed(2)}px ${sy.get().toFixed(2)}px`; }); };
        el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); sx.set(((e.clientX - r.left) / r.width - 0.5) * 10); sy.set(((e.clientY - r.top) / r.height - 0.5) * 8); });
        el.addEventListener('pointerleave', () => { sx.set(0); sy.set(0); });
      });
    }
  }
  if (D.readyState === 'loading') addEventListener('DOMContentLoaded', () => setTimeout(() => safe('motion', initMotion), 50)); else setTimeout(() => safe('motion', initMotion), 50);

  /* ================================================================== internal links load the page fully, so every page starts clean */
  addEventListener('click', e => {
    if (e.defaultPrevented || EMBED || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    let u; try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return;
    if (u.pathname === location.pathname) return;            // same page: let the hash scroll
    e.preventDefault(); e.stopPropagation();
    location.href = u.href;
  }, true);

  /* ================================================================== the story line: from the first chapter's dot to the last */
  function initStory() {
    if (!D.getElementById('about')) return;
    const measure = () => {
      const sec = D.getElementById('about'); if (!sec) return;
      const line = $('.story__line', sec), list = $('.story__list', sec), chs = $$('.ch', sec);
      if (!line || !list || chs.length < 2) return;
      const mark = c => list.offsetTop + c.offsetTop + (c.firstElementChild ? c.firstElementChild.offsetTop : 0) + 8;
      const last = chs[chs.length - 1];
      const firstY = mark(chs[0]);
      const endY = list.offsetTop + last.offsetTop + last.offsetHeight - parseFloat(getComputedStyle(last).paddingBottom || 0);
      [$('.story__rail', sec), $('.story__dtrack', sec), $('.story__ttrack', sec)].forEach(el => {
        if (!el) return;
        el.style.setProperty('--r0', firstY + 'px');
        el.style.setProperty('--rh', Math.max(0, endY - firstY) + 'px');
      });
    };
    measure();
    addEventListener('resize', measure);
    addEventListener('load', () => { measure(); setTimeout(measure, 1500); setTimeout(measure, 4000); });
    D.fonts?.ready.then(measure);
    // React may hand back fresh elements while you scroll: keep the marks on whatever is there now
    addEventListener('scroll', () => { const r = $('#about .story__rail'); if (r && !r.style.getPropertyValue('--rh')) measure(); }, { passive: true });
  }
  if (IS_HOME && !EMBED) safe('story', initStory);

  /* ================================================================== the story, arriving as you read it */
  // Each chapter comes in when you reach it: its date, then the title, the company and each line, rising out of
  // a soft blur. The heading gets the gold light the footer has. The left column (the year, its date, the counter
  // and the bar) is left exactly as the site draws it. Everything hangs on data attributes React never touches.
  function initStoryMotion() {
    const sec = D.getElementById('about'); if (!sec) return;
    const still = reduced() || !('IntersectionObserver' in W);

    // chapters: each part waits, then rises in turn
    const io = still ? null : new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.setAttribute('data-tn-in', ''); io.unobserve(e.target);
    }), { threshold: 0.12 });
    const prime = () => {
      $$('#about .ch').forEach(ch => {
        if (ch.hasAttribute('data-tn-ch')) return;
        ch.setAttribute('data-tn-ch', '');
        const parts = [$('.ch__date', ch), $('.ch__t', ch), $('.ch__org', ch), ...$$('.ch__b > li', ch)].filter(Boolean);
        parts.forEach((el, k) => { el.setAttribute('data-tn-s', ''); el.style.setProperty('--tn-d', Math.min(k * 70, 560) + 'ms'); });
        if (still) ch.setAttribute('data-tn-in', ''); else io.observe(ch);
      });
    };
    prime();
    new MutationObserver(prime).observe(sec, { childList: true, subtree: true });
    addEventListener('scroll', () => {                         // nothing stays hidden once you are past the story
      if (sec.getBoundingClientRect().bottom < innerHeight * 0.6) $$('#about .ch:not([data-tn-in])').forEach(ch => ch.setAttribute('data-tn-in', ''));
    }, { passive: true });


    // the heading lights up once it is on screen
    const h2 = $('.story__h', sec);
    if (h2) {
      if (still) h2.setAttribute('data-tn-lit', '');
      else { const ho = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { ho.disconnect(); setTimeout(() => h2.setAttribute('data-tn-lit', ''), 250); } }, { threshold: 0.6 }); ho.observe(h2); }
    }
  }
  if (IS_HOME && !EMBED) safe('story motion', initStoryMotion);


  /* ================================================================== the ability card (home page) */
  if (IS_HOME && !EMBED) safe('card', initCard);

  function initCard() {
    const CARD_IMG = '/images/profile/tanishq-card.webp';
    let layer = null, card = null, lastFocus = null, open = false, loadedOnce = false;
    const tilt = { rx: 0, ry: 0, px: 0, py: 0, lift: 0 };
    const paint = () => {
      if (!card) return;
      card.style.setProperty('--rx', tilt.rx.toFixed(2) + 'deg');
      card.style.setProperty('--ry', tilt.ry.toFixed(2) + 'deg');
      card.style.setProperty('--px', tilt.px.toFixed(3));
      card.style.setProperty('--py', tilt.py.toFixed(3));
      card.style.setProperty('--lift', tilt.lift.toFixed(3));
    };
    // tilt on critically damped springs (damping 1, response ~.4s): they start from wherever the card is
    const cl = v => Math.max(-1.15, Math.min(1.15, v));      // a fast flick can never tip the card over
    const sx = spring({ tension: 240, friction: 31 }, v => { v = cl(v); tilt.px = v; tilt.ry = v * 16; paint(); });
    const sy = spring({ tension: 240, friction: 31 }, v => { v = cl(v); tilt.py = v; tilt.rx = -v * 12; paint(); });
    const sl = spring({ tension: 200, friction: 28 }, v => { tilt.lift = v; paint(); });

    function build() {
      if (layer) return;
      layer = D.createElement('div');
      layer.className = 'holo'; layer.id = 'holo'; layer.hidden = true;
      layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Tanishq\'s ability card');
      layer.innerHTML = `<div class="holo__ld" id="holoLd" aria-hidden="true"><div class="cl"><p class="cl__name">Tanishq Narula</p><div class="cl__line"><i></i></div><p class="cl__row"><span>Loading the card</span><b>0%</b></p></div></div>
      <div class="holo__stage">
        <div class="tc" id="tc" role="button" tabindex="0" aria-label="Tanishq Narula's ability card. Press to flip it." aria-pressed="false">
          <i class="tc__aura" aria-hidden="true"></i>
          <span class="tc__in" aria-hidden="true">
            <span class="tc__face tc__front">
              <span class="tc__top"><span class="tc__badge">TN</span><span>AI · Web · UI/UX</span></span>
              <span class="tc__win"><i class="tc__grid"></i><i class="tc__ring"></i><img class="tc__me" src="/images/profile/tanishq-card.webp" alt="" decoding="async"><i class="tc__wsh"></i></span>
              <span class="tc__name">Tanishq Narula</span>
              <span class="tc__role">Software Developer · AI Builder · Designer</span>
              <i class="tc__rule"></i>
              <span class="tc__tag">Thinks in code.<br>Dreams in pixels.</span>
              <span class="tc__foot"><span>Jaipur, India</span><span>Edition 2026</span></span>
              <i class="tc__foil"></i><i class="tc__glare"></i><i class="tc__sweep"></i>
            </span>
            <span class="tc__face tc__back">
              <span class="tc__top"><span class="tc__badge">TN</span><span>Behind the doors</span></span>
              <span class="tc__mono">TN</span>
              <span class="tc__btag">Half code, half canvas,<br>fully curious.</span>
              <ul class="tc__doors"><li>Web Development</li><li>AI &amp; Automation</li><li>UI/UX Design</li><li>Client Work</li></ul>
              <span class="tc__foot"><span>github · tanishqnarula12</span><span>B.Tech IT · SKIT</span></span>
              <i class="tc__foil"></i><i class="tc__glare"></i>
            </span>
          </span>
        </div>
        <p class="tc__hint"><span class="tc__hm">Move across the card</span><span class="tc__ht">Tilt your phone or drag it</span> · tap to flip</p>
      </div>
      <button type="button" class="holo__x" id="holoClose"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>Close</button>`;
      D.body.appendChild(layer);
      card = $('#tc', layer);

      // pointer: a mouse tilts the card where it hovers; a finger drags it 1:1 and lets go with its speed
      let moved = 0;
      const toUnit = e => { const r = card.getBoundingClientRect(); return { x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)) }; };
      card.addEventListener('pointerenter', () => { if (!reduced()) sl.set(1); });
      card.addEventListener('pointermove', e => {
        if (reduced()) return;
        const p = toUnit(e);
        if (e.pointerType === 'mouse' && !drag) { sx.set(p.x); sy.set(p.y); return; }
        if (drag) {
          moved = Math.max(moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
          const r = card.getBoundingClientRect();
          const x = Math.max(-1, Math.min(1, drag.bx + (e.clientX - drag.x0) / (r.width / 2)));
          const y = Math.max(-1, Math.min(1, drag.by + (e.clientY - drag.y0) / (r.height / 2)));
          const now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
          drag.vx = (x - drag.lx) / dt; drag.vy = (y - drag.ly) / dt; drag.lx = x; drag.ly = y; drag.t = now;
          sx.snap(x); sy.snap(y);
        }
      });
      card.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { sx.set(0); sy.set(0); sl.set(0); } });
      card.addEventListener('pointerdown', e => {
        card.classList.add('live');
        if (e.pointerType === 'mouse') return;
        try { card.setPointerCapture(e.pointerId); } catch (x) {}
        drag = { x0: e.clientX, y0: e.clientY, bx: sx.get(), by: sy.get(), lx: sx.get(), ly: sy.get(), vx: 0, vy: 0, t: performance.now() };
        moved = 0; sl.set(1);
      });
      const release = () => {
        card.classList.remove('live');
        if (!drag) return;
        const d = drag; drag = null;
        sx.set(0, Math.max(-6, Math.min(6, d.vx))); sy.set(0, Math.max(-6, Math.min(6, d.vy))); sl.set(0);   // hand the finger's speed to the spring
      };
      card.addEventListener('pointerup', release);
      card.addEventListener('pointercancel', release);
      const flip = () => {
        const f = !card.classList.contains('flip');
        card.classList.toggle('flip', f);
        card.setAttribute('aria-pressed', String(f));
      };
      card.addEventListener('click', () => {
        if (moved > 10) { moved = 0; return; }             // that was a drag, not a tap
        flip();
      });
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      layer.addEventListener('click', e => { if (e.target === layer || e.target.classList.contains('holo__stage')) hide(); });
      $('#holoClose', layer).addEventListener('click', hide);
      layer.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.stopPropagation(); hide(); }
        if (e.key === 'Tab') { e.preventDefault(); (D.activeElement === card ? $('#holoClose', layer) : card).focus(); }
      });
    }
    let gyroOn = false, base = null;
    const onTilt = e => {
      if (!open || drag || e.gamma == null || e.beta == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      const ang = (screen.orientation && screen.orientation.angle) || W.orientation || 0;
      let gx = e.gamma - base.g, gy = e.beta - base.b;
      if (ang === 90) [gx, gy] = [gy, -gx]; else if (ang === -90 || ang === 270) [gx, gy] = [-gy, gx];
      sx.set(Math.max(-1, Math.min(1, gx / 22))); sy.set(Math.max(-1, Math.min(1, gy / 22))); sl.set(1);
    };
    function startGyro() {
      if (gyroOn || reduced() || canHover() || !('DeviceOrientationEvent' in W)) return;
      const go = () => { gyroOn = true; base = null; addEventListener('deviceorientation', onTilt); };
      const ask = W.DeviceOrientationEvent && W.DeviceOrientationEvent.requestPermission;
      if (typeof ask === 'function') ask.call(W.DeviceOrientationEvent).then(r => { if (r === 'granted') go(); }).catch(() => {});
      else go();
    }
    function stopGyro() { if (!gyroOn) return; gyroOn = false; removeEventListener('deviceorientation', onTilt); }
    let drag = null;
    function show() {
      build();
      startGyro();                                          // inside the tap that opened it: iOS only asks then
      if (open) return;
      open = true; lastFocus = D.activeElement;
      card.classList.remove('flip'); card.setAttribute('aria-pressed', 'false');
      sx.snap(0); sy.snap(0); sl.snap(0);
      layer.classList.remove('ready');
      const ld = $('#holoLd', layer), bar = $('.cl__line i', ld), pct = $('.cl__row b', ld);
      ld.classList.remove('out'); bar.style.transform = 'scaleX(0)'; pct.textContent = '0%';
      layer.hidden = false; holdScroll(true);
      $('.hdr')?.classList.add('away'); $('#cord')?.classList.add('away');
      requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('on')));
      // the loader counts up while the card's art and type arrive; it never pretends to finish early
      let done = false;
      const img = new Image(); img.decoding = 'async'; img.src = CARD_IMG;
      Promise.all([(img.decode ? img.decode() : Promise.resolve()).catch(() => {}), D.fonts ? D.fonts.ready : null]).then(() => { done = true; });
      const MIN = reduced() ? 0 : (loadedOnce ? 520 : 1300), t0 = performance.now();
      const easeOut = x => 1 - Math.pow(1 - x, 3);
      const tick = now => {
        if (!open) return;
        const t = MIN ? Math.min(1, (now - t0) / MIN) : 1;
        const p = done ? easeOut(t) : Math.min(0.92, easeOut(t) * 0.92);
        bar.style.transform = `scaleX(${p.toFixed(3)})`; pct.textContent = Math.round(p * 100) + '%';
        if (done && t >= 1) {
          loadedOnce = true;
          setTimeout(() => {
            if (!open) return;
            ld.classList.add('out'); layer.classList.add('ready');
            setTimeout(() => card.focus({ preventScroll: true }), 120);
          }, reduced() ? 0 : 160);
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    function hide() {
      if (!open) return;
      open = false; stopGyro();
      layer.classList.remove('on');                       // the card fades with the room, not before it
      setTimeout(() => { if (!open) { layer.hidden = true; layer.classList.remove('ready'); } }, reduced() ? 0 : 420);
      holdScroll(false);
      $('.hdr')?.classList.remove('away'); $('#cord')?.classList.remove('away');
      (lastFocus && lastFocus.focus ? lastFocus : D.getElementById('holoOpen'))?.focus({ preventScroll: true });
    }
    // the tag on the portrait opens it, and so does a click anywhere on the portrait
    addEventListener('click', e => {
      if (e.button || !e.target.closest('#holoOpen, #fig')) return;
      if (e.target.closest('#holoOpen') || canHover()) { e.preventDefault(); show(); }
    });
    // warm the card's picture once the page has settled, so it opens fully drawn
    addEventListener('load', () => setTimeout(() => { const i = new Image(); i.decoding = 'async'; i.src = '/images/profile/tanishq-card.webp'; }, 1500), { once: true });
  }

  /* ================================================================== project screens, full size
     Any screen in a room (a monitor's recording or design, a phone's app) opens full size: it grows out of
     the device it sits in, and shrinks back into it on close. A recording carries on from the same moment,
     and a phone design becomes a column you can scroll yourself. Over a screen, the cursor says what a click does. */
  const IS_ROOM = /^\/(web-developer|app-developer|ui-ux-designer|graphic-designer)\/?$/.test(path);
  if (IS_ROOM && !EMBED) safe('screens', initScreens);

  /* ================================================================== recordings: one at a time, and never stuck
     - Only the screen you're looking at plays. Phones decode one or two videos at a time at best; two playing at
       once is what made them stutter or freeze. The static rooms already pick like this (their own script sets
       window.__pickVideo); the Web Development page's React code now hands its play/pause calls here too.
     - Every 1.5s it checks again, so a recording the browser paused by itself (a background tab, a reveal that
       finished after the last scroll) starts again without anyone having to scroll.
     - If the phone refuses to autoplay (iPhone Low Power Mode, data saver), the screen shows a play sign; a tap
       opens it full size and plays from the tap, which is always allowed. */
  if (IS_ROOM && !EMBED) safe('videos', () => {
    const playSafe = v => {
      const scr = v.parentElement, p = v.play();
      if (p && p.then) p.then(() => { if (scr) delete scr.dataset.tnBlocked; })
        .catch(e => { if (scr && e && e.name === 'NotAllowedError') scr.dataset.tnBlocked = ''; });
    };
    W.__tnPlaySafe = playSafe;
    if (!W.__pickVideo) {
      W.__pickVideo = () => {
        if (W.__tnLb) return;
        const cards = $$('#stack .card'), vids = $$('#stack .card video');
        let best = null;
        if (!D.hidden) {
          const seen = [];
          for (const v of vids) {
            const c = v.closest('.card'), scr = v.parentElement;
            if (!c || !scr || !c.classList.contains('on') || v.error) continue;
            const r = scr.getBoundingClientRect(); if (r.height < 1) continue;
            const top = Math.max(r.top, 0); let bot = Math.min(r.bottom, innerHeight);
            for (let k = cards.indexOf(c) + 1; k < cards.length; k++) { const n = cards[k].getBoundingClientRect(); if (n.top < bot) bot = n.top; }
            const area = Math.max(0, bot - top); if (area < 40) continue;
            seen.push({ v, area, frac: area / r.height, mid: Math.abs((top + bot) / 2 - innerHeight / 2) });
          }
          const solid = seen.filter(x => x.frac >= .4);
          const pick = solid.length ? solid.sort((a, b) => a.mid - b.mid)[0] : seen.sort((a, b) => b.area - a.area)[0];
          best = pick ? pick.v : null;
        }
        vids.forEach(v => { if (v !== best && !v.paused) v.pause(); });
        if (best && best.paused) playSafe(best);
      };
      addEventListener('scroll', () => requestAnimationFrame(() => W.__pickVideo()), { passive: true });
    }
    D.addEventListener('visibilitychange', () => W.__pickVideo && W.__pickVideo());
    setInterval(() => { if (!D.hidden && !W.__tnLb && W.__pickVideo) W.__pickVideo(); }, 1500);
  });
  // the floating "Back to the doors" steps aside once the footer's last line is on screen, so it never sits on the copyright
  if (!EMBED) safe('back aside', () => {
    let raf = 0;
    const upd = () => {
      raf = 0;
      const bot = $('.sf__bot'), away = !!bot && bot.getBoundingClientRect().top < innerHeight - 8;
      $$('.backd, .totop').forEach(b => { if (away) b.dataset.tnAway = ''; else delete b.dataset.tnAway; });
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd); setTimeout(upd, 400);
  });

  /* ================================================================== phones: the light switch lives in the header
     On a narrow screen the hanging cord would sit over every heading, so CSS hides it below 769px and this puts a
     sun / moon button beside GitHub, LinkedIn and WhatsApp. It flips the theme through the cord's own control, so
     both stay in step. */
  if (!EMBED) safe('mobile switch', () => {
    const MOON = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
    const SUN = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    const mount = () => {
      const act = $('.mob-hdr__actions'); if (!act || $('.tn-mswitch', act)) return;
      const b = D.createElement('button');
      b.type = 'button'; b.className = 'mob-hdr__btn tn-mswitch';
      const paint = () => {
        const dark = root.dataset.mode === 'dark';
        b.innerHTML = dark ? SUN : MOON;
        b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      };
      paint();
      new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
      b.addEventListener('click', () => {
        const hit = D.getElementById('cordHit');
        if (hit && reactAlive()) hit.click(); else setMode(root.dataset.mode !== 'dark');
      });
      act.insertBefore(b, act.firstChild);
    };
    // the React header gets it only once it has hydrated, so the two never disagree
    if (W.__next_f) { let n = 0; const wait = () => { if (hasFiber($('.mob-hdr')) || ++n > 60) mount(); else setTimeout(wait, 150); }; wait(); }
    else mount();
  });

  /* ================================================================== the phone's status bar matches the page
     iOS and Android tint their bar from theme-color; one fixed value gave a dark bar over a light page (or the
     reverse). Follow the page's actual background, including when the theme flips. */
  if (!EMBED) safe('theme color', () => {
    const tint = () => {
      let m = $$('meta[name="theme-color"]');
      if (!m.length) { const t = D.createElement('meta'); t.name = 'theme-color'; D.head.appendChild(t); m = [t]; }
      const bg = getComputedStyle(D.body).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)') m.forEach(x => { x.removeAttribute('media'); x.content = bg; });
    };
    tint(); setTimeout(tint, 600);
    new MutationObserver(() => requestAnimationFrame(tint)).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
  });
  function initScreens() {
    const SEL = '#stack .mon__screen, #stack .phone__screen';
    const card = s => s.closest('.card');
    const titleOf = s => (card(s)?.querySelector('h2')?.textContent || '').trim();
    const subOf = s => (card(s)?.querySelector('.sub')?.textContent || '').trim();
    const prep = () => $$(SEL).forEach(s => {
      if (s.dataset.tnx || !s.querySelector('video, img.page, img.fit')) return;
      const play = !!s.querySelector('video');
      s.dataset.tnx = play ? 'play' : 'view';
      s.tabIndex = 0; s.setAttribute('role', 'button');
      s.setAttribute('aria-label', `${play ? 'Watch' : 'View'} ${titleOf(s)} full size`);
      s.closest('.stage')?.removeAttribute('aria-hidden');
    });
    // the React page gets its attributes only once it has hydrated, so the two never disagree
    if (W.__next_f) { let n = 0; const wait = () => { if (hasFiber($('#stack .card')) || ++n > 60) prep(); else setTimeout(wait, 150); }; wait(); }
    else prep();

    let lb, box, cap, xbtn, cur = null;
    function build() {
      lb = D.createElement('div'); lb.className = 'tnv'; lb.hidden = true;
      lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
      lb.innerHTML = '<div class="tnv__bg"></div><div class="tnv__box"></div><p class="tnv__cap"><b></b><span></span></p>'
        + '<button type="button" class="tnv__x" aria-label="Close"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
      D.body.appendChild(lb);
      box = $('.tnv__box', lb); cap = $('.tnv__cap', lb); xbtn = $('.tnv__x', lb);
      // a click anywhere but on the recording's controls or the scrolling design closes it
      lb.addEventListener('click', e => { if (!e.target.closest('.tnv__box video, .tnv__phone')) close(); });
      addEventListener('keydown', e => {
        if (!cur) return;
        // Esc in the video's own full screen only leaves full screen; the viewer stays open underneath
        if (e.key === 'Escape') { if (D.fullscreenElement || D.webkitFullscreenElement) return; e.preventDefault(); close(); return; }
        if (e.key !== 'Tab') return;
        const f = $$('button, video, [tabindex="0"]', lb), i = f.indexOf(D.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      });
      addEventListener('resize', () => { if (cur) place(cur); });
    }
    // where the full-size screen sits: as large as the window allows, in its own shape, a caption beneath
    function place(c) {
      const capH = 64, pad = innerWidth < 600 ? 12 : 40;
      let w, h;
      if (c.kind === 'phone') { w = Math.min(400, innerWidth - 24); h = Math.min(innerHeight - capH - 40, w * 2.165); }
      else { w = Math.min(innerWidth - pad * 2, 1680); h = w / c.ar; const mh = innerHeight - pad * 2 - capH; if (h > mh) { h = mh; w = h * c.ar; } }
      const L = (innerWidth - w) / 2, T = Math.max(12, (innerHeight - h - capH) / 2);
      box.style.left = L + 'px'; box.style.top = T + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
      cap.style.top = (T + h + 14) + 'px';
      return { L, T, w, h };
    }
    const fly = (r, b) => `translate(${(r.left + r.width / 2) - (b.L + b.w / 2)}px,${(r.top + r.height / 2) - (b.T + b.h / 2)}px) scale(${r.width / b.w},${r.height / b.h})`;
    function open(s) {
      if (cur) return;
      if (!lb) build();
      const v0 = s.querySelector('video'), r0 = s.getBoundingClientRect();
      const kind = v0 ? 'video' : s.querySelector('.phone__vp') ? 'phone' : 'image';
      let el, ar = r0.width / r0.height;
      if (kind === 'video') {
        el = D.createElement('video');
        // attributes as well as properties: iOS reads the attributes when deciding whether a video may play inline
        el.setAttribute('muted', ''); el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', '');
        el.muted = true; el.loop = true; el.playsInline = true; el.controls = true; el.preload = 'auto';
        el.poster = v0.poster; el.src = v0.currentSrc || v0.src;
        const t = v0.currentTime || 0;
        // start playing inside the tap itself: a play() that comes from the tap is allowed even when the phone blocks
        // autoplay (iPhone Low Power Mode, data saver); the moment it carries on from is set once the length is known
        const go = () => { const p = el.play(); if (p && p.catch) p.catch(() => {}); };
        el.__go = go;                                          // called as soon as it is in the page, still inside the tap
        el.addEventListener('loadedmetadata', () => { try { if (t && t < el.duration - .5) el.currentTime = t; } catch (x) {} if (el.paused) go(); }, { once: true });
        if (v0.videoWidth) ar = v0.videoWidth / v0.videoHeight;
      } else if (kind === 'image') {
        const i0 = s.querySelector('img');
        el = D.createElement('img'); el.src = i0.currentSrc || i0.src; el.alt = `${titleOf(s)} design`;
        if (i0.naturalWidth) ar = i0.naturalWidth / i0.naturalHeight;
      } else {
        const body = s.querySelector('.phone__vp img'), tab = s.querySelector('.phone__tab img');
        el = D.createElement('div'); el.className = 'tnv__phone'; el.tabIndex = 0;
        el.setAttribute('aria-label', `${titleOf(s)} design, scroll to see all of it`);
        el.innerHTML = `<img src="${esc(body.currentSrc || body.src)}" alt="${esc(titleOf(s))} design">`
          + (tab ? `<img class="tnv__tab" src="${esc(tab.currentSrc || tab.src)}" alt="">` : '');
      }
      cur = { s, kind, ar, v0, wasPlaying: !!v0 && !v0.paused, focus: D.activeElement };
      box.className = 'tnv__box tnv__box--' + kind;
      box.style.setProperty('--sb', getComputedStyle(s).getPropertyValue('--sb').trim() || '#fff');
      box.replaceChildren(el);
      if (el.__go) el.__go();
      $('b', cap).textContent = titleOf(s); $('span', cap).textContent = subOf(s);
      lb.setAttribute('aria-label', titleOf(s));
      if (v0) v0.pause();
      W.__tnLb = true;
      const b = place(cur);
      lb.hidden = false; root.classList.add('tnv-open'); holdScroll(true);
      s.style.opacity = '0';                                   // the screen lifts out of its device
      void lb.offsetWidth; lb.classList.add('on');
      if (!reduced()) box.animate([{ transform: fly(r0, b), borderRadius: '10px' }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.32,.72,0,1)' });
      requestAnimationFrame(() => xbtn.focus({ preventScroll: true }));
    }
    function close() {
      if (!cur) return;
      const c = cur; cur = null;
      const lv = box.querySelector('video');
      if (lv && c.v0) { try { c.v0.currentTime = lv.currentTime; } catch (x) {} }
      lb.classList.remove('on');
      let closed = false;
      const done = () => {
        if (closed) return; closed = true;
        box.getAnimations().forEach(a => a.cancel());
        lb.hidden = true; box.replaceChildren(); c.s.style.opacity = '';
        root.classList.remove('tnv-open'); holdScroll(false); W.__tnLb = false;
        if (W.__pickVideo) W.__pickVideo(); else if (c.wasPlaying) c.v0.play().catch(() => {});
        (c.focus && c.focus !== D.body && c.focus.focus ? c.focus : c.s).focus({ preventScroll: true });
      };
      setTimeout(done, 700);                                   // never left open if the animation can't run (a background tab)
      const r0 = c.s.getBoundingClientRect(), r = box.getBoundingClientRect();
      if (reduced() || r0.bottom < 0 || r0.top > innerHeight) { box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = done; return; }
      box.animate([{ transform: 'none' }, { transform: fly(r0, { L: r.left, T: r.top, w: r.width, h: r.height }), borderRadius: '10px' }],
        { duration: 440, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' }).onfinish = done;
    }
    D.addEventListener('click', e => { const s = !cur && !e.button && e.target.closest?.('[data-tnx]'); if (s) { e.preventDefault(); open(s); } });
    D.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-tnx]')) { e.preventDefault(); open(e.target); } });

    // the cursor: over a screen it becomes a small disc that says Watch or View, trailing the pointer on a spring
    if (!canHover()) return;
    const bub = D.createElement('div'); bub.className = 'tnc'; bub.setAttribute('aria-hidden', 'true'); bub.innerHTML = '<span></span>';
    D.body.appendChild(bub); root.classList.add('tnc-on');
    const lbl = bub.firstChild;
    let x = -99, y = -99, tx = -99, ty = -99, raf = 0, over = null;
    const loop = () => {
      x += (tx - x) * .24; y += (ty - y) * .24;
      bub.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      raf = (over || Math.abs(tx - x) + Math.abs(ty - y) > .3) ? requestAnimationFrame(loop) : 0;
    };
    const set = s => {
      if (s === over) return;
      if (s && !over) { x = tx; y = ty; }
      over = s;
      if (s) lbl.textContent = s.dataset.tnx === 'play' ? 'Watch' : 'View';
      bub.classList.toggle('on', !!s);
    };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      set(cur ? null : e.target.closest?.('[data-tnx]') || null);
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    addEventListener('scroll', () => { if (over && !over.matches(':hover')) set(null); }, { passive: true });
    D.documentElement.addEventListener('pointerleave', () => set(null));
  }
})();
