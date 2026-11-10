const BOT = "antivibecodingvpnbot";
document.querySelectorAll("[data-buy]").forEach(a => a.href = "https://t.me/" + BOT + "?start=buy_" + a.dataset.buy);   // ссылка ведёт на тариф по его id
document.querySelectorAll("[data-tg]").forEach(a => a.href = "https://t.me/" + BOT);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduce) {
  history.scrollRestoration = "manual"; scrollTo(0, 0); document.documentElement.classList.add("js-lock");
  document.documentElement.style.overflow = "hidden";
  setTimeout(() => { document.documentElement.style.overflow = ""; }, 6800);
}
if (reduce) {
  document.documentElement.classList.add("flat");
} else {
  const MOB = matchMedia("(max-width:800px),(pointer:coarse)").matches;   // телефон: без блюра и тяжёлых теней
  let VH = innerHeight, VW = innerWidth;
  const track = document.getElementById("track"), stage = document.getElementById("stage"),
        dots = document.getElementById("dots"),
        dotBtns = [...dots.querySelectorAll("button")];
  let lm = 0;
  const LG = {}; stage.querySelectorAll(".lg").forEach(el => LG[el.dataset.l] = el);
  const items = [...stage.querySelectorAll("[data-at]")].map(el => ({
    el, pe: el.hasAttribute("data-pe"), ry: +(el.dataset.ry || 0), at: +el.dataset.at, hold: +el.dataset.hold, enter: +(el.dataset.enter || 0.6), glow: +(el.dataset.glow || 0), rx: !!el.dataset.rx, soft: !!el.dataset.soft,
    mega: el.classList.contains("t-num") || el.querySelector(".mega") ? (el.matches(".mega") ? el : el.querySelector(".mega")) : null
  }));
  const EXIT = 0.45;
  /* выход начинается сразу после остановки сцены, а не позже: уходит быстро и по очереди */
  const STOPS0 = [0, 1.85, 3.5, 4.85, 5.8, 6.75, 7.7, 8.9];
  {
    const groups = new Map();
    for (const it of items) {
      const stop = STOPS0.find(v => v >= it.at - .01);
      it.settle = Math.min(.3, stop - it.at - .02); if (it.settle < .06) it.settle = 0;   // окно «отдачи» после прилёта
      if (it.hold >= 50) continue;                       // финальные карточки остаются
      if (!groups.has(stop)) groups.set(stop, []);
      groups.get(stop).push(it);
    }
    for (const [stop, list] of groups) {
      list.sort((a, b) => a.at - b.at);
      list.forEach((it, i) => { it.hold = Math.max(.02, stop + .03 + i * .035 - it.at); });
    }
  }
  const PRE = [ // освещение сцен: слой света, цвет текста
    // l — какой готовый слой света показывать
    { at: 0, l: "w", c: [255, 255, 255], x: 50 }, { at: 1.5, l: "w", c: [210, 228, 255], x: 50 },
    { at: 3.0, l: "w", c: [225, 235, 255], x: 50 }, { at: 4.65, l: "c", c: [40, 190, 255], x: 20 }, { at: 5.6, l: "o", c: [255, 120, 40], x: 80 },
    { at: 6.55, l: "v", c: [160, 90, 255], x: 38 }, { at: 7.7, l: "w", c: [255, 255, 255], x: 50 }, { at: 8.9, l: "w", c: [255, 255, 255], x: 50 }
  ];
  const sm = t => t * t * (3 - 2 * t);
  function lighting(pos) {
    let i = 0; while (i < PRE.length - 2 && pos > PRE[i + 1].at) i++;
    const a = PRE[i], b = PRE[i + 1];
    const t = sm(Math.min(1, Math.max(0, ((pos - a.at) / (b.at - a.at) - .5) / .4 + .5)));
    const c = a.c.map((v, k) => Math.round(v + (b.c[k] - v) * t));
    return { c: c.join(","), x: a.x + (b.x - a.x) * t, raw: c, la: a.l, lb: b.l, t };
  }

  /* «тяжёлая» прокрутка: показываемая позиция догоняет настоящую с инерцией */
  let cur = scrollY, last = 0, running = false;
  // наведение: у каждого слоя света свой вес, он плавно догоняет цель, поэтому смена карточек не прыгает
  const HV = { c: 0, o: 0, v: 0 }, HVCOL = { c: [40, 190, 255], o: [255, 120, 40], v: [160, 90, 255] };
  let hoverL = null, hovered = null, onlyEnd = false, maskV = 1;
  const hvBusy = () => Object.keys(HV).some(k => HV[k] !== (k === hoverL ? 1 : 0));
  const TAU = 0.42;                      // секунды: чем больше, тем тяжелее
  const scenes = [...stage.querySelectorAll(".scene")];
  function tick(t) {
    const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    const target = scrollY, diff = target - cur;
    cur += diff * (1 - Math.exp(-dt / (anim ? .12 : TAU)));
    { const mt = onlyEnd ? 0 : 1; maskV += (mt - maskV) * (1 - Math.exp(-dt / .35)); if (Math.abs(mt - maskV) < .004) maskV = mt; }
    for (const k in HV) { const tg = k === hoverL ? 1 : 0; HV[k] += (tg - HV[k]) * (1 - Math.exp(-dt / .38)); if (Math.abs(tg - HV[k]) < .004) HV[k] = tg; }
    const lean = MOB ? 0 : Math.max(-5, Math.min(5, (target - cur) * .006));   // наклон камеры по скорости
    for (const sc of scenes) sc.style.transform = lean ? `rotateX(${lean.toFixed(2)}deg)` : "";
    if (Math.abs(target - cur) < .3) { cur = target; for (const sc of scenes) sc.style.transform = ""; }
    frame();
    if (cur !== target || hvBusy() || maskV !== (onlyEnd ? 0 : 1)) requestAnimationFrame(tick); else { running = false; last = 0; }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

  function frame() {
    const vh = VH, pos = cur / vh;
    stage.classList.toggle("calm", pos > 7.25);
    if (onlyEnd && pos < 6.9) { onlyEnd = false; kick(); }   // вернулись к X20 свайпом назад: остановка 6.75 не меньше 6.75, поэтому порог с запасом (прыжок «К тарифам» стартует с 7.05)
    let lightMax = 0;
    for (const it of items) {
      const d = pos - it.at;
      let z = 0, y = 0, op = 1, sp = 0, g = 0, rx = 0, ry = 0, bl = 0;
      if (d < -it.enter) { op = 0; }
      else if (d < 0) {
        const f = -d / it.enter;
        const fe = Math.pow(f, 1.9);                         // чем ближе к месту, тем медленнее влетает
        z = -3200 * (it.soft ? .09 : 1) * fe; y = (it.soft ? 140 : 80) * fe; ry = it.ry * fe * 38; op = Math.min(1, (1 - f) * 2.4); sp = f; rx = f; bl = Math.min(1, f * 1.6) * (it.soft ? 9 : 16);
      } else if (d <= it.hold) {
        if (it.glow) g = Math.min(1, d / it.glow);
        if (it.settle && d < it.settle) {                // «тяга назад»: пролетает чуть дальше места и мягко возвращается
          const u = d / it.settle, k = Math.sin(Math.PI * u) * (1 - u);
          z = 74 * k * (it.soft ? .6 : 1); y = -18 * k; ry = -it.ry * 9 * k;
        }
      } else {
        const x = Math.min(1, (d - it.hold) / EXIT);
        z = 620 * Math.pow(x, 1.4); y = -46 * x; ry = -it.ry * x * 26; op = Math.max(0, 1 - x * 1.9); sp = x * .6; bl = x * (it.soft ? 8 : 16); g = it.glow ? op : 0;
      }
      if (it.at < 7.35) op *= maskV;
      const e = it.el;
      if (it.rx || it.pe) e.style.pointerEvents = op > .6 ? "auto" : "none";
      if (op <= 0.003) { if (e._v !== 0) { e.style.opacity = 0; e._v = 0; } continue; }
      e._v = 1;
      e.style.opacity = op.toFixed(3);
      e.style.transform = `translate3d(0,${y.toFixed(1)}px,${z.toFixed(1)}px)` + (it.rx ? ` rotateX(${(rx * -50).toFixed(1)}deg)` : "") + (ry ? ` rotateY(${ry.toFixed(1)}deg)` : "");
      if (MOB && !it.mega) bl *= .35;   // на телефоне весь текст, кроме заголовка и крупных чисел, размывается слабее
      e.style.filter = bl > .4 ? `blur(${bl.toFixed(1)}px)` : "";
      if (it.glow || it.mega) {
        const tgt = it.mega || e;
        tgt.style.setProperty("--g", g.toFixed(3));
        if (g > lightMax) lightMax = g;
      }
    }
    const hvSum = Math.min(1, HV.c + HV.o + HV.v);
    lightMax += hvSum * .45;
    if (hovered && hovered.style.pointerEvents === "none") { hovered = null; hoverL = null; kick(); }   // карточка скрылась из-под курсора
    lm = lm + (lightMax - lm) * .25;
    const L = lighting(pos);
    if (hvSum > 0) {            // цвет подсветки и текста: смесь цветов наведённых карточек
      const tot = HV.c + HV.o + HV.v, mix = [0, 0, 0];
      for (const k in HV) for (let q = 0; q < 3; q++) mix[q] += HVCOL[k][q] * HV[k] / tot;
      L.raw = L.raw.map((v, q) => Math.round(v + (mix[q] - v) * hvSum));
    }
    const wts = { w: 0, c: 0, o: 0, v: 0 };
    wts[L.la] += 1 - L.t; wts[L.lb] += L.t;
    for (const k in wts) wts[k] *= 1 - hvSum;
    for (const k in HV) wts[k] += HV[k] * (hvSum ? hvSum / (HV.c + HV.o + HV.v) : 0);
    const kk = Math.min(1, lm / 1.1);                       // яркость: только прозрачность готовых слоёв, без перерисовки
    for (const k in wts) {
      const el = LG[k], o = wts[k] * (.6 + .4 * kk);
      if (o < .01) { if (el._on) { el.style.display = "none"; el._on = false; } continue; }
      if (!el._on) { el.style.display = ""; el._on = true; }
      el.style.opacity = o.toFixed(3);
    }
    const glowV = L.raw.map(v => Math.round(v * .6 + 255 * .4)).join(","), accV = `rgb(${L.raw.map(v => Math.round(v * .55 + 255 * .45)).join(",")})`;
    if (glowV !== stage._gl) { stage._gl = glowV; stage.style.setProperty("--glow-rgb", glowV); }   // меняем наследуемые переменные только когда цвет сдвинулся
    if (accV !== stage._ac) { stage._ac = accV; stage.style.setProperty("--acc", accV); }
    // индикатор тарифов
    dots.classList.toggle("on", pos > 4.3 && pos < 7.0);
    const centres = [4.6, 5.55, 6.5];
    dotBtns.forEach((b, i) => b.classList.toggle("on", Math.abs(pos - centres[i] - .1) < .5));
  }

  addEventListener("resize", () => {
    if (innerWidth === VW && Math.abs(innerHeight - VH) < 160) return;   // адресная строка скрылась/показалась
    const p = cur / VH; VW = innerWidth; VH = innerHeight; setH(); cur = p * VH; scrollTo(0, cur); frame();
  });
  addEventListener("scroll", kick, { passive: true });
  stage.querySelectorAll(".cells li").forEach(li => {
    li.addEventListener("mouseenter", () => { if (li.style.pointerEvents !== "auto") return; hovered = li; hoverL = li.dataset.l; kick(); });
    li.addEventListener("mouseleave", () => { if (hovered === li) { hovered = null; hoverL = null; } kick(); });
  });
  function setH() { track.style.height = (8.9 + 1) * VH + "px"; }
  setH();
  frame();

  /* постраничная прокрутка: один жест подводит к следующему объекту и проигрывает его анимацию */
  const STOPS = STOPS0;
  const t0 = performance.now();
  let anim = false, blockUntil = 0, idleTimer = 0;
  const ease = t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;   // медленный старт и мягкая остановка
  function goTo(pos) {
    const from = scrollY, to = Math.round(pos * VH), dist = Math.abs(to - from);
    if (dist < 2) return;
    anim = true; const dur = Math.min(2200, 1100 + dist / VH * 500), st = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - st) / dur);
      scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step); else { anim = false; blockUntil = performance.now() + 500; }
    })(st);
  }
  function stepBy(dir) {
    if (anim || performance.now() - t0 < 6800) return;
    const pos = scrollY / VH;
    const next = dir > 0 ? STOPS.find(v => v > pos + .06) : [...STOPS].reverse().find(v => v < pos - .06);
    if (next !== undefined) goTo(next);
  }
  addEventListener("wheel", e => {
    e.preventDefault();
    const now = performance.now();
    if (anim) return;
    if (now < blockUntil) { if (Math.abs(e.deltaY) < 30) blockUntil = now + 250; return; }   // хвост инерции трекпада
    if (Math.abs(e.deltaY) < 4) return;
    stepBy(e.deltaY);
  }, { passive: false });
  let ty = null;
  addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchend", e => {
    if (ty === null) return; const dy = ty - e.changedTouches[0].clientY; ty = null;
    if (Math.abs(dy) > 36) stepBy(dy);
  }, { passive: true });
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input,textarea,select")) return;
    const k = e.key;
    if (["ArrowDown", "PageDown", " ", "ArrowRight"].includes(k) && !e.shiftKey) { e.preventDefault(); stepBy(1); }
    else if (["ArrowUp", "PageUp", "ArrowLeft"].includes(k) || (k === " " && e.shiftKey)) { e.preventDefault(); stepBy(-1); }
    else if (k === "Home") { e.preventDefault(); if (!anim) goTo(STOPS[0]); }
    else if (k === "End") { e.preventDefault(); if (!anim) goTo(STOPS[STOPS.length - 1]); }
  });
  /* перетащили ползунок или изменили окно: докатываем до ближайшего объекта */
  addEventListener("scroll", () => {
    if (anim) return; clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (anim || performance.now() - t0 < 6800) return;
      const pos = scrollY / VH, near = STOPS.reduce((a, b) => Math.abs(b - pos) < Math.abs(a - pos) ? b : a);
      goTo(near);
    }, 320);
  }, { passive: true });
  dotBtns.forEach(b => b.addEventListener("click", () => { if (!anim) goTo(+b.dataset.go + .25); }));
  /* переход в Telegram: квадрат цвета тарифа вырастает из кнопки, сцена проваливается, затем открывается бот */
  const tgEl = document.getElementById("tg"), tgSub = document.getElementById("tgSub");
  let tgBusy = false;
  function goTelegram(a) {
    if (tgBusy) return; tgBusy = true;
    const li = a.closest("li"), r = a.getBoundingClientRect();
    tgEl.style.setProperty("--ox", (r.left + r.width / 2) + "px"); tgEl.style.setProperty("--oy", (r.top + r.height / 2) + "px");
    tgSub.textContent = li && li.querySelector("h3") ? li.querySelector("h3").textContent.replace(/\s+/g, " ") + " · " + li.querySelector(".c-price").textContent.replace(/\s+/g, " ") : "Antivibecoding VPN";
    tgEl.classList.add("on"); void tgEl.offsetWidth;
    stage.classList.add("dive");
    requestAnimationFrame(() => tgEl.classList.add("run"));
    setTimeout(() => tgEl.classList.add("draw"), 600);
    setTimeout(() => tgEl.classList.add("fill"), 1650);
    setTimeout(() => tgEl.classList.add("blink"), 2050);
    setTimeout(() => { location.href = a.href; }, 2900);
  }
  addEventListener("pageshow", e => {                       // вернулись назад из Telegram: убираем переход
    if (!tgBusy && !e.persisted) return;
    tgBusy = false; tgEl.classList.remove("on", "run", "draw", "fill", "blink"); stage.classList.remove("dive");
  });
  document.querySelectorAll("a[data-buy], a[data-tg]").forEach(a => a.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); goTelegram(a);
  }));

  /* стрелка внизу: показывается на первом экране, исчезает после начала прокрутки */
  const down = document.getElementById("down");
  setTimeout(() => down.classList.remove("first"), 7500);
  down.addEventListener("click", e => { e.preventDefault(); stepBy(1); });
  const hideDown = () => { const p = scrollY / VH; down.classList.toggle("show", scrollY < 20 || (p > 7.45 && p < 8.1)); };
  addEventListener("scroll", hideDown, { passive: true }); addEventListener("resize", hideDown);

  /* «К тарифам»: вспышка света, сцена проваливается в неё, дальше появляются только карточки */
  const veil = document.getElementById("veil");
  document.getElementById("jump").addEventListener("click", e => {
    e.preventDefault();
    if (anim || performance.now() - t0 < 6800) return;
    const end = 7.7;                       // остановка с карточками тарифов
    if (scrollY / VH > end - .6) { goTo(end); return; }
    anim = true; stage.classList.add("dive"); veil.classList.add("on");
    setTimeout(() => {
      const y = Math.round((end - .65) * VH);
      onlyEnd = true; maskV = 0;                 // старые сцены не показываем
      scrollTo(0, y); cur = y; frame();
      stage.classList.remove("dive"); veil.classList.remove("on");
      setTimeout(() => { anim = false; goTo(end); }, 350);
    }, 950);
  });
}
