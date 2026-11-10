// Тарифы Terra из data.json: подставляет цены, объёмы и сроки; значения в HTML остаются запасными.
/* актуальные тарифы: цены, объёмы и сроки берутся из data.json (его пишет refresh.mjs), в HTML лежат только запасные значения */
const fmtN = n => String(n).replace(".", ",");
const plDays = n => n + " " + (n % 10 === 1 && n % 100 !== 11 ? "день" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "дня" : "дней");
const fmtGb = g => g >= 1000 ? fmtN(+(g / 1000).toFixed(1)) + " ТБ" : g + " ГБ";
function applyData(d) {
  if (!d || !Array.isArray(d.tariffs)) return;
  const T = {};
  for (const id of [9, 10, 11]) {
    const t = d.tariffs.find(x => x && x.id === id), q = t && Array.isArray(t.quotas) && t.quotas.find(x => x && x.type === "lifetime");
    if (!t || !q || !Number.isInteger(t.price_stars) || t.price_stars <= 0 || !Number.isInteger(t.duration_days) || t.duration_days <= 0 || !(q.limit_bytes > 0)) continue;
    const gb = Math.round(q.limit_bytes / 1e9), per = t.price_stars / gb;
    T[id] = { gb, days: t.duration_days, price: t.price_stars, per,
      v: { gb: String(gb), daysn: plDays(t.duration_days), price: String(t.price_stars), perday: "≈ " + fmtN(Math.round(gb / t.duration_days)) + " ГБ",
           pergb: "≈ " + fmtN(per.toFixed(3)) + " Stars", video: "≈ " + Math.round(gb / 3.05 / 10) * 10 + " ч" } };
  }
  for (const id in T) {
    document.querySelectorAll('[data-tid="' + id + '"]').forEach(box => {
      box.querySelectorAll("[data-f]").forEach(el => { const v = T[id].v[el.dataset.f]; if (v !== undefined && el.textContent !== v) el.textContent = v; });
      box.querySelectorAll(".mega").forEach(m => m.setAttribute("aria-label", T[id].gb + " гигабайт"));
    });
  }
  const all = Object.values(T), set = (k, v) => document.querySelectorAll('[data-f="' + k + '"]').forEach(el => { if (el.textContent !== v) el.textContent = v; });
  if (all.length) {
    set("gbmin", fmtGb(Math.min(...all.map(x => x.gb)))); set("gbmax", fmtGb(Math.max(...all.map(x => x.gb))));
    const dmin = Math.min(...all.map(x => x.days)), dmax = Math.max(...all.map(x => x.days));
    set("dayrange", dmin === dmax ? plDays(dmin) : dmin + "–" + plDays(dmax));
  }
  if (T[9] && T[11]) set("saving", Math.max(0, Math.round((1 - T[11].per / T[9].per) * 100)) + "%");
}
function loadData() {
  const get = u => fetch(u, { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject());
  get("data/data.json").catch(() => get("data.json")).then(applyData).catch(() => {});   // не вышло: остаются значения из HTML
}
loadData(); setInterval(loadData, 10 * 60 * 1000);
