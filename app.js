(function () {
  var S = window.SITE || {};

  // links from content.js
  document.querySelectorAll('[data-cabinet]').forEach(function (a) { a.href = S.cabinetUrl || '#'; });
  document.querySelectorAll('[data-bot]').forEach(function (a) {
    if (S.botUrl) { a.href = S.botUrl; a.target = '_blank'; a.rel = 'noopener'; }
  });

  // ---- data: tariffs and server countries (data.json is written by the site's backend, refresh.mjs)
  var list = document.getElementById('plans');
  var cl = document.getElementById('countries');
  var buy = S.botUrl || '#tarify';
  var names = null;
  try { names = new Intl.DisplayNames(['ru'], { type: 'region' }); } catch (e) {}

  function bytes(n) {
    var gb = n / 1e9;
    return gb >= 1000 ? (Math.round(gb / 100) / 10) + ' ТБ' : (Math.round(gb * 10) / 10) + ' ГБ';
  }
  function period(q) {
    if (q.type === 'lifetime') { return 'на весь срок'; }
    if (q.period_months) { return q.period_months === 1 ? 'в календарный месяц' : 'за ' + q.period_months + ' мес.'; }
    var d = Math.round((q.period_minutes || 0) / 1440);
    if (q.period_minutes && q.period_minutes % 1440 === 0) { return d === 7 ? 'в неделю' : 'за ' + d + ' дн.'; }
    return q.period_minutes ? 'за ' + q.period_minutes + ' мин.' : '';
  }
  function quotaText(q) { return bytes(q.limit_bytes) + ' ' + period(q); }

  function renderTariffs(items) {
    list.textContent = '';
    items.forEach(function (t) {
      var pop = S.popularKey && t.key === S.popularKey;
      var li = document.createElement('li');
      li.className = 'plan' + (pop ? ' plan--pop' : '');
      li.innerHTML =
        (pop ? '<span class="plan__flag">Самый популярный</span>' : '') +
        '<h3></h3><div class="plan__price"><span></span><small>Stars</small><s class="old" hidden></s></div>' +
        '<ul class="plan__facts"><li class="d"></li></ul><p class="promo" hidden></p>' +
        '<a class="btn">Купить в Telegram</a>';
      // the link is built through the DOM and the id must be a plain integer: data.json text never reaches innerHTML
      var buyLink = li.querySelector('.btn');
      buyLink.href = S.botUrl && Number.isSafeInteger(t.id) ? S.botUrl + '?start=buy_' + t.id : buy;
      if (S.botUrl) { buyLink.target = '_blank'; buyLink.rel = 'noopener'; }
      li.querySelector('h3').textContent = t.name;
      li.querySelector('.plan__price span').textContent = t.price_stars;
      if (t.regular_price_stars && t.regular_price_stars > t.price_stars) {
        var old = li.querySelector('.old'); old.hidden = false; old.textContent = t.regular_price_stars;
        if (t.promo_label) { var p = li.querySelector('.promo'); p.hidden = false; p.textContent = t.promo_label; }
      }
      li.querySelector('.d').textContent = t.duration_days + ' дней';
      var facts = li.querySelector('.plan__facts');
      (t.quotas || []).forEach(function (q) {
        var f = document.createElement('li'); f.textContent = 'Трафик: ' + quotaText(q); facts.appendChild(f);
      });
      list.appendChild(li);
    });
    list.hidden = !items.length;
  }


  // ---- flags as big pixels; hovering makes the pixels drop away one by one, leaving the real flag
  var COLS = 16, ROWS = 12, CELL = 4;      // 16x12 big pixels; each is drawn on a 4x4 patch with a 1px dark seam
  function pixelFlag(tile, box, src) {
    var cv = document.createElement('canvas');
    cv.width = COLS * CELL; cv.height = ROWS * CELL;
    cv.className = 'px';
    cv.setAttribute('aria-hidden', 'true');
    box.appendChild(cv);
    var g = cv.getContext('2d', { willReadFrequently: true });
    var base = null, alpha = new Float32Array(COLS * ROWS).fill(1), from = alpha.slice(), to = alpha.slice(), delay = new Float32Array(COLS * ROWS), t0 = 0, raf = 0;
    var DUR = 140, SPREAD = 160;
    var im = new Image();
    im.onload = function () {
      var tmp = document.createElement('canvas'); tmp.width = COLS; tmp.height = ROWS;
      var tg = tmp.getContext('2d', { willReadFrequently: true });
      tg.drawImage(im, 0, 0, COLS, ROWS);
      base = tg.getImageData(0, 0, COLS, ROWS);
      paint();
    };
    im.src = src;
    function paint() {
      if (!base) { return; }
      var W = COLS * CELL, out = g.createImageData(W, ROWS * CELL), d = out.data;
      for (var cy = 0; cy < ROWS; cy++) {
        for (var cx = 0; cx < COLS; cx++) {
          var i = cy * COLS + cx, a = alpha[i], r = base.data[i * 4], gr = base.data[i * 4 + 1], b = base.data[i * 4 + 2];
          for (var y = 0; y < CELL; y++) {
            for (var x = 0; x < CELL; x++) {
              var p = ((cy * CELL + y) * W + cx * CELL + x) * 4;
              var seam = x === CELL - 1 || y === CELL - 1;
              if (seam) { d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = Math.round(46 * a); }
              else { d[p] = r; d[p + 1] = gr; d[p + 2] = b; d[p + 3] = Math.round(255 * a); }
            }
          }
        }
      }
      g.putImageData(out, 0, 0);
    }
    function frame(now) {
      var busy = false;
      for (var i = 0; i < alpha.length; i++) {
        var k = Math.min(1, Math.max(0, (now - t0 - delay[i]) / DUR));
        if (k < 1) { busy = true; }
        alpha[i] = from[i] + (to[i] - from[i]) * k;
      }
      paint();
      raf = busy ? requestAnimationFrame(frame) : 0;
    }
    function go(target) {
      if (still) { alpha.fill(target); paint(); return; }
      from = alpha.slice();
      for (var i = 0; i < alpha.length; i++) { to[i] = target; delay[i] = Math.random() * SPREAD; }
      t0 = performance.now();
      if (!raf) { raf = requestAnimationFrame(frame); }
    }
    tile.addEventListener('pointerenter', function () { go(0); });
    tile.addEventListener('pointerleave', function () { go(1); });
  }

  function renderCountries(codes) {
    var rows = codes.map(function (c) { return String(c).toLowerCase(); }).filter(function (c) { return /^[a-z]{2}$/.test(c); }).map(function (code) {
      var name = code.toUpperCase();
      try { if (names) { name = names.of(name) || name; } } catch (e) { /* unknown region: keep the code */ }
      return { code: code, name: name };
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); });
    cl.textContent = '';
    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="flag"><img alt="" width="160" height="120" loading="lazy"></span><span class="nm"></span><span class="cc"></span>';
      var img = li.querySelector('img');
      img.src = 'flags/' + r.code + '.svg';
      img.onerror = function () { img.remove(); };
      pixelFlag(li, li.querySelector('.flag'), 'flags/' + r.code + '.svg');
      li.querySelector('.nm').textContent = r.name;
      li.querySelector('.cc').textContent = r.code.toUpperCase();
      cl.appendChild(li);
    });
    document.getElementById('servers').hidden = !rows.length;
  }

  function apply(d) {
    renderTariffs(d.tariffs || []);
    renderCountries(d.countries || []);
    document.getElementById('sample') && (document.getElementById('sample').hidden = !d.sample);
  }
  apply(S.fallback || {});

  // the page picks up new data by itself; the visitor does nothing
  function pull() {
    return fetch('data.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (d && Array.isArray(d.tariffs)) { apply(d); }
    }).catch(function () {});
  }
  var ready = pull();
  setInterval(pull, Math.max(1, S.refreshMinutes || 10) * 60000);

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  // ---- pixel icons
  var ICONS = {
    bolt:   ['...####.','..###...','.###....','.######.','....###.','...###..','..###...','.##.....'],
    server: ['########','#.....##','########','........','########','#.....##','########','........'],
    shield: ['.######.','########','##....##','##....##','##....##','.##..##.','..####..','...##...'],
    window: ['########','#......#','#.####.#','#......#','#.####.#','#......#','########','........']
  };
  document.querySelectorAll('[data-icon]').forEach(function (el) {
    ICONS[el.dataset.icon].forEach(function (row, y) {
      for (var x = 0; x < 8; x++) {
        if (row[x] === '#') {
          var r = document.createElementNS(NS, 'rect');
          r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 1); r.setAttribute('height', 1);
          el.appendChild(r);
        }
      }
    });
  });

  // pixel-icon pieces get an order for the assembly
  document.querySelectorAll('.pix').forEach(function (svg) {
    Array.prototype.forEach.call(svg.querySelectorAll('rect'), function (r, n) { r.style.setProperty('--r', n); });
  });

  // ---- hero headline: words rise out of a mask
  var h1 = document.querySelector('.hero h1');
  if (h1 && !still) {
    var words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute('aria-label', words.join(' '));
    h1.innerHTML = words.map(function (w, n) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + n + '">' + w + '</span></span>';
    }).join(' ');
  }

  // ---- pixel dissolve between sections (ordered dithering); the sweep follows the scroll
  var BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  var CELL = 8, ROWS = 12;
  var edges = Array.prototype.slice.call(document.querySelectorAll('canvas.edge'));
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function drawEdge(cv, shift) {
    var cols = cv.width / CELL, g = cv.getContext('2d');
    g.fillStyle = cv._b; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = cv._a;
    for (var r = 0; r < ROWS; r++) {
      var density = 1 - (r + 0.5) / ROWS + shift;
      for (var c = 0; c < cols; c++) {
        if (BAYER[r % 4][c % 4] / 16 < density) { g.fillRect(c * CELL, r * CELL, CELL, CELL); }
      }
    }
  }

  // ---- scroll engine: everything is a function of one smoothed scroll value
  var bar = document.querySelector('.progress');
  var bands = Array.prototype.slice.call(document.querySelectorAll('.band'));
  var steps = document.querySelector('.steps');
  var tints = Array.prototype.slice.call(document.querySelectorAll('.sec--tint'));
  var endEl = document.querySelector('.end');
  var vh = innerHeight, sy = scrollY, target = scrollY;

  var scrub = [];
  function collect() {
    document.querySelectorAll('.sec h2, .end h2').forEach(function (hd, n) {
      if (still) { return; }
      var ws = hd.textContent.trim().split(/\s+/);
      hd.setAttribute('aria-label', ws.join(' '));
      hd.innerHTML = ws.map(function (w, m) { return '<span class="w" aria-hidden="true"><span style="--i:' + m + '">' + w + '</span></span>'; }).join(' ');
    });
    var groups = ['.sec h2', '.end h2', '.cells', '.countries', '.limits', '.plans', '.steps', '.faq', '.end__in'];
    document.querySelectorAll(groups.join(',')).forEach(function (g) {
      var single = g.matches('.sec h2, .end h2');
      (single ? [g] : Array.prototype.slice.call(g.children)).forEach(function (el, n) {
        el.style.setProperty('--d', (single ? 0 : Math.min(n, 5) * 0.09) + 's');
        if (!still) { el.classList.add('rv'); }
        scrub.push(el);
      });
    });
    if (!still) { document.documentElement.classList.add('js'); }
    measure();
  }
  function measure() {
    vh = innerHeight;
    edges.forEach(function (cv) {
      var cols = Math.ceil(cv.parentNode.clientWidth / CELL);
      cv.width = cols * CELL; cv.height = ROWS * CELL; cv.style.height = ROWS * CELL + 'px';
      cv._a = css(cv.dataset.a); cv._b = css(cv.dataset.b);
      cv._top = cv.getBoundingClientRect().top + scrollY;
      cv._last = -1; drawEdge(cv, 0);
    });
    bands.forEach(function (b) { b._top = b.getBoundingClientRect().top + scrollY; });
  }
  function countUp(el) {
    if (!el.classList.contains('plan')) { return; }
    var span = el.querySelector('.plan__price span'), to = parseInt(span.textContent, 10), t0 = performance.now();
    (function tick(now) {
      var k = Math.min(1, (now - t0) / 1100);
      span.textContent = Math.round(to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) { requestAnimationFrame(tick); }
    })(t0);
  }
  var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  function frame() {
    sy += (target - sy) * (still ? 1 : 0.14);
    if (Math.abs(target - sy) < 0.3) { sy = target; }

    // all layout reads first, then all writes, so a frame never forces a second layout
    var max = document.documentElement.scrollHeight - vh;
    var bw, tt, et, sr, st;
    if (!still) {
      bw = bands.map(function (b) { return b.firstChild.scrollWidth - b.clientWidth; });
      tt = tints.map(function (t) { return t.getBoundingClientRect().top; });
      et = endEl ? endEl.getBoundingClientRect().top : 0;
      sr = steps ? steps.getBoundingClientRect() : null;
      st = scrub.map(function (el) { return el.getBoundingClientRect().top; });
    }
    bar.style.setProperty('--p', max > 0 ? clamp(sy / max) : 0);

    if (!still) {
      // marquee band
      bands.forEach(function (b, n) {
        var rel = (sy + vh - b._top) * 0.45, rev = b.classList.contains('band--rev');
        b.firstChild.style.transform = 'translate3d(' + (rev ? (-bw[n] + rel) : -rel).toFixed(1) + 'px,0,0)';
      });
      tints.forEach(function (t, n) { t.style.setProperty('--by', (-tt[n] * 0.25).toFixed(0) + 'px'); });
      if (endEl) { endEl.style.setProperty('--ey', (-et * 0.2).toFixed(0) + 'px'); }
      if (steps) {
        var sp = clamp((vh * 0.78 - sr.top) / (sr.height + vh * 0.25));
        Array.prototype.forEach.call(steps.children, function (li, n) { li.classList.toggle('act', sp > n / steps.children.length * 0.9 + 0.02); });
      }

      // blocks play their reveal once, when they come into view
      for (var i = scrub.length - 1; i >= 0; i--) {
        if (st[i] < vh * 0.92) { countUp(scrub[i]); scrub[i].classList.add('in'); scrub.splice(i, 1); }
      }

      // pixel dissolve sweeps with the scroll
      edges.forEach(function (cv) {
        var rel = clamp((sy + vh - cv._top) / (vh + cv.height));
        var shift = Math.round((0.5 - rel) * 0.9 * 10) / 10;
        if (shift !== cv._last && rel > 0 && rel < 1) { cv._last = shift; drawEdge(cv, shift); }
      });
    }
    raf = 0;
    if (sy !== target) { raf = requestAnimationFrame(frame); }
  }
  var raf = 0;
  function kick() { target = scrollY; if (!raf) { raf = requestAnimationFrame(frame); } }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { measure(); kick(); });
  window.addEventListener('load', function () { measure(); kick(); });
  // reveal effects start once the first data has arrived (or after a short wait), so new blocks still animate
  Promise.race([ready, new Promise(function (r) { setTimeout(r, 700); })]).then(function () { collect(); frame(); });

  // ---- seamless hand-off to the cabinet: warm up the connection, wipe the screen, then navigate
  if (S.cabinetUrl) {
    var pre = document.createElement('link');
    pre.rel = 'preconnect'; pre.href = new URL(S.cabinetUrl).origin;
    document.head.appendChild(pre);
  }
  // pixel wipe: the curtain's colour and grid are drawn block by block on a canvas under the lettering. 'cover' fills blocks
  // outward from `origin` (ragged, pixel-edged circle); 'erode' clears them from the edges toward the centre. Only new blocks are
  // painted each frame, so it stays cheap; the lettering is ordinary DOM above the canvas.
  function pixelWipe(host, mode, ms, done, origin) {
    var cs = getComputedStyle(host), bg = cs.backgroundColor, fg = cs.color;
    var W = innerWidth, H = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), cell = 40;
    var cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    var cv = document.createElement('canvas');
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var ox = (((W - 56) / 2) % 56 + 56) % 56, oy = (((H - 56) / 2) % 56 + 56) % 56;
    function paint(x, y, w, h) {
      ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = .11; ctx.fillStyle = fg;
      for (var gx = ox + Math.ceil((x - ox) / 56) * 56; gx < x + w; gx += 56) { ctx.fillRect(gx, y, 1, h); }
      for (var gy = oy + Math.ceil((y - oy) / 56) * 56; gy < y + h; gy += 56) { ctx.fillRect(x, gy, w, 1); }
      ctx.globalAlpha = 1;
    }
    var cx = origin ? origin.x : W / 2, cy = origin ? origin.y : H / 2;
    var far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)), keys = [], order = [], i;
    for (i = 0; i < cols * rows; i++) {
      var d = Math.hypot(((i % cols) + .5) * cell - cx, (Math.floor(i / cols) + .5) * cell - cy) / far;
      keys.push((mode === 'erode' ? 1 - d : d) * .84 + Math.random() * .16); order.push(i);
    }
    order.sort(function (a, b) { return keys[a] - keys[b]; });
    host.insertBefore(cv, host.firstChild);
    if (mode === 'erode') { paint(0, 0, W, H); }
    host.style.background = 'none'; host.style.backgroundImage = 'none';
    var n = 0, t0 = null;
    function frame(now) {
      if (t0 === null) { t0 = now; }
      var p = Math.min(1, (now - t0) / ms), e = p * p * (3 - 2 * p), to = Math.round(e * order.length), k, c, r;
      for (; n < to; n++) {
        k = order[n]; c = (k % cols) * cell; r = Math.floor(k / cols) * cell;
        if (mode === 'erode') { ctx.clearRect(c, r, cell, cell); } else { paint(c, r, cell, cell); }
      }
      if (p < 1) { requestAnimationFrame(frame); } else if (done) { done(); }
    }
    requestAnimationFrame(frame);
  }

  var warmed = false;
  function warm() {
    if (warmed || !S.cabinetUrl) { return; }
    warmed = true;
    var l = document.createElement('link');
    l.rel = 'prefetch'; l.href = S.cabinetUrl; l.as = 'document';
    document.head.appendChild(l);
    var pc = document.createElement('link');
    pc.rel = 'preconnect'; pc.href = new URL(S.cabinetUrl).origin;
    document.head.appendChild(pc);
  }
  document.querySelectorAll('[data-cabinet]').forEach(function (a) {
    a.addEventListener('pointerenter', warm); a.addEventListener('focus', warm);
    a.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
      e.preventDefault();
      var theme = document.documentElement.getAttribute('data-theme') === 'soft' ? 'soft' : 'light';
      var target = a.href.split('#')[0] + '#for-landing=' + theme;
      var go = function () { location.href = target; };
      if (still || !document.body.animate) { go(); return; }
      var r = a.getBoundingClientRect();
      var c = document.createElement('div');
      c.className = 'curtain';
      c.setAttribute('aria-hidden', 'true');
      c.style.setProperty('--cx', Math.round(r.left + r.width / 2) + 'px');
      c.style.setProperty('--cy', Math.round(r.top + r.height / 2) + 'px');
      document.body.appendChild(c);
      c.innerHTML = '<b class="avv">' + ['A', 'V', 'V'].map(function (ch) {
        return '<span class="l"><i class="g2">' + ch + '</i><i class="g1">' + ch + '</i><i class="m">' + ch + '</i></span>';
      }).join('') + '<span class="dot"></span></b>';
      c.style.clipPath = 'none';
      pixelWipe(c, 'cover', 700, null, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      // each letter rises, then its two ghosts peel off to the left like a trail; the dot lands last
      var out = 'cubic-bezier(.19,1,.22,1)';
      Array.prototype.forEach.call(c.querySelectorAll('.l'), function (l, n) {
        var d = 150 + n * 70;
        l.animate([{ opacity: 0, transform: 'translateY(28%)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: d, easing: out, fill: 'backwards' });
        l.querySelector('.g1').animate([{ transform: 'translateX(0)', opacity: 0 }], { duration: 400, delay: d + 100, easing: out, fill: 'backwards' });
        l.querySelector('.g2').animate([{ transform: 'translateX(0)', opacity: 0 }], { duration: 450, delay: d + 170, easing: out, fill: 'backwards' });
      });
      c.querySelector('.dot').animate([{ transform: 'scale(0)' }, { transform: 'scale(1.3)', offset: .6 }, { transform: 'scale(1)' }], { duration: 300, delay: 560, easing: out, fill: 'backwards' });
      setTimeout(go, 1150);
    });
  });
  // coming back with the back button: the curtain must not stay
  window.addEventListener('pageshow', function (e) { if (e.persisted) { document.querySelectorAll('.curtain').forEach(function (n) { n.remove(); }); } });

  // ---- paper plane: it takes off, carries a Telegram-blue sky over the whole page, then Telegram opens
  var flying = false;
  var PLANE_D = 'M21.6 3.2 2.7 10.5c-1.3.5-1.3 1.3-.2 1.6l4.8 1.5 1.9 5.7c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8L23 4.9c.3-1.3-.5-1.9-1.4-1.7ZM8.6 13.3l9.5-6c.4-.3.8-.1.5.2l-7.8 7-.3 3.3-1.9-4.5Z';
  function cleanFlight() {
    document.querySelectorAll('.flight,.plane,.tg-sky').forEach(function (n) { n.remove(); });
    flying = false;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-bot], .plan .btn');
    if (!a || !S.botUrl || a.href.indexOf(S.botUrl) !== 0) { return; }
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
    if (still || !document.body.animate || !CSS.supports('offset-path', 'path("M0 0L1 1")')) { return; }
    e.preventDefault();
    if (flying) { return; }
    flying = true;

    var icon = a.querySelector('.tg') || a;
    var r = icon.getBoundingClientRect();
    var W = innerWidth, H = innerHeight;
    var sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    var ex = W / 2, ey = H / 2;
    // to the centre of the screen (the sky closes over the page), then out past the top-right edge
    var d1 = 'M' + sx + ' ' + sy + ' C' + (sx + 90) + ' ' + (sy - 220) + ' ' + (sx + 300) + ' ' + (sy - 40) + ' ' + (sx + (ex - sx) * 0.55) + ' ' + (sy + (ey - sy) * 0.55 - 120) +
      ' S' + (ex - 40) + ' ' + (ey + 90) + ' ' + ex + ' ' + ey;
    var d = d1 + ' C' + (ex + 120) + ' ' + (ey - 270) + ' ' + (W * 0.82) + ' -40 ' + (W + 200) + ' -220';
    var NS2 = 'http://www.w3.org/2000/svg';

    var sky = document.createElement('div');
    sky.className = 'tg-sky'; sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = '<b>Переходим в Telegram</b><a class="tg-open" href="' + a.href + '" target="_blank" rel="noopener" hidden>Открыть Telegram</a><small class="tg-count" hidden>Этот экран исчезнет через <span>10</span> с</small>';
    document.body.appendChild(sky);

    var svg = document.createElementNS(NS2, 'svg');
    svg.setAttribute('class', 'flight'); svg.setAttribute('aria-hidden', 'true');
    var defs = document.createElementNS(NS2, 'defs'), mk = document.createElementNS(NS2, 'mask');
    mk.setAttribute('id', 'trail-mask'); mk.setAttribute('maskUnits', 'userSpaceOnUse');
    mk.setAttribute('x', '-300'); mk.setAttribute('y', '-400'); mk.setAttribute('width', W + 800); mk.setAttribute('height', H + 800);
    var reveal = document.createElementNS(NS2, 'path');
    reveal.setAttribute('d', d); reveal.setAttribute('fill', 'none'); reveal.setAttribute('stroke', '#fff'); reveal.setAttribute('stroke-width', '16');
    mk.appendChild(reveal); defs.appendChild(mk); svg.appendChild(defs);
    var dots = document.createElementNS(NS2, 'path');
    dots.setAttribute('d', d); dots.setAttribute('mask', 'url(#trail-mask)');
    svg.appendChild(dots);
    document.body.appendChild(svg);
    var len = reveal.getTotalLength();
    var probe = document.createElementNS(NS2, 'path'); probe.setAttribute('d', d1);
    var f = probe.getTotalLength() / len;          // share of the route that ends at the centre
    reveal.style.strokeDasharray = len + ' ' + len;

    var plane = document.createElement('div');
    plane.className = 'plane';
    plane.style.offsetPath = 'path("' + d + '")';
    plane.innerHTML = '<svg viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="' + PLANE_D + '"/></svg>';
    document.body.appendChild(plane);

    var FLY = 2300, EASE = 'cubic-bezier(.4,0,.35,1)';
    icon.style.opacity = '0';
    var move = plane.animate([{ offsetDistance: '0%' }, { offsetDistance: '100%' }], { duration: FLY, easing: EASE, fill: 'forwards' });
    // the scale goes on the inner svg: a scale on the box itself would also stretch the offset-path travel
    plane.firstChild.animate([
      { transform: 'rotate(45deg) scale(.7)' },
      { transform: 'rotate(45deg) scale(1.1)', offset: f * 0.25 },
      { transform: 'rotate(45deg) scale(2.2)', offset: f },
      { transform: 'rotate(45deg) scale(1)' }], { duration: FLY, easing: 'ease-in-out', fill: 'forwards' });
    reveal.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: FLY, easing: EASE, fill: 'forwards' });

    // the sky is a circle centred on the plane; it owns the screen when the plane reaches the middle
    var R = Math.hypot(W, H) / 2 + 80, start = 0.06;
    (function follow() {
      var p = move.effect.getComputedTiming().progress || 0;
      var at = Math.min(p, f);
      var pt = reveal.getPointAtLength(len * at);
      var k = Math.min(1, Math.max(0, (at - start) / (f - start)));
      sky.style.clipPath = k >= 1 ? 'none' : 'circle(' + (R * Math.pow(k, 1.6)).toFixed(1) + 'px at ' + pt.x.toFixed(1) + 'px ' + pt.y.toFixed(1) + 'px)';
      if (p > Math.min(0.98, f + 0.08)) { sky.classList.add('on'); }
      if (p < 1) { requestAnimationFrame(follow); }
    })();

    // the plane has left the screen: open Telegram in a new tab. The sky stays 10 s with a countdown;
    // the plane flies back to the button in the last moments, then the sky folds into the button.
    var HOLD = 10000, CLOSE_LEAD = 600, FOLD = 1000;
    move.onfinish = function () {
      var w = null;
      try { w = window.open(a.href, '_blank', 'noopener'); } catch (err) { w = null; }
      if (!w) { sky.querySelector('.tg-open').hidden = false; }   // blocked: offer a visible link instead of leaving the site
      var count = sky.querySelector('.tg-count'), num = count.querySelector('span'), left = HOLD / 1000;
      count.hidden = false; num.textContent = left;
      var tick = setInterval(function () { left -= 1; num.textContent = Math.max(0, left); if (left <= 0) { clearInterval(tick); } }, 1000);

      // while the sky covers the page, take the visitor back to the top
      setTimeout(function () {
        var root = document.documentElement, prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        try { history.replaceState(null, '', location.pathname + location.search + '#top'); } catch (err) { /* ignore */ }
        root.style.scrollBehavior = prev;
      }, 1200);

      // teleport: the flying plane disappears and the one on the button comes back, all under the blue screen
      plane.remove(); svg.remove();
      icon.style.opacity = '';
      if (icon.animate) { icon.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }

      setTimeout(function () {                                     // the text steps back, then the sky closes like an iris
        sky.classList.add('closing');
        setTimeout(function () {
          var big = Math.hypot(W, H) / 2 + 80;
          var fold = sky.animate([{ clipPath: 'circle(' + big + 'px at 50% 50%)' }, { clipPath: 'circle(0px at 50% 50%)' }], { duration: FOLD, easing: 'cubic-bezier(.7,0,.25,1)', fill: 'forwards' });
          fold.onfinish = cleanFlight;
        }, CLOSE_LEAD);
      }, HOLD - CLOSE_LEAD);
    };
  });
  function path_point(p, at) { return p.getPointAtLength(at); }
  window.addEventListener('pageshow', function () { cleanFlight(); });

  // ---- light / dark toggle (remembered in the browser)
  var toggle = document.querySelector('.theme-toggle');
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'soft' ? 'soft' : 'light'; }
  function setTheme(t, save) {
    document.documentElement.setAttribute('data-theme', t);
    toggle.setAttribute('aria-pressed', String(t === 'soft'));
    if (save) { try { localStorage.setItem('avv-theme', t); } catch (e) {} }
    window.dispatchEvent(new Event('resize'));
  }
  toggle.addEventListener('click', function () { setTheme(currentTheme() === 'soft' ? 'light' : 'soft', true); });
  setTheme(currentTheme(), false);
})();
