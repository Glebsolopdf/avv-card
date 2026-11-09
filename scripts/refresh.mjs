#!/usr/bin/env node
// Backend of the overview site: reads tariffs and servers from the Core client API and writes the public
// data.json that the page loads. The visitor's browser never talks to Core or sees the token.
// Only tariff terms and the COUNTRIES of the servers are published: no server names, speeds or counts.
// On any failure the previous data.json stays in place and the exit code is non-zero.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.env.CORE_CLIENT_URL;
const tokenFile = process.env.CORE_CLIENT_TOKEN_FILE;
const out = process.env.CARD_DATA_OUT || fileURLToPath(new URL('../public/data/data.json', import.meta.url));
if (!base || !tokenFile) {
  console.error('CORE_CLIENT_URL and CORE_CLIENT_TOKEN_FILE are required');
  process.exit(2);
}
const baseUrl = new URL(base);
if (baseUrl.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(baseUrl.hostname)) {
  console.error('CORE_CLIENT_URL must be https or loopback: the token is never sent in clear text over a network');
  process.exit(2);
}
const token = readFileSync(tokenFile, 'utf8').trim();

async function get(path) {
  const res = await fetch(new URL(path, base), {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const body = await res.text();
  if (body.length > 65536) throw new Error(`${path}: response too large`);
  return JSON.parse(body);
}

const str = (v, max = 64) => (typeof v === 'string' && v.length <= max ? v : undefined);
const num = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : undefined);
const RESET_MODES = new Set(['dynamic', 'static']);
const QUOTA_TYPES = new Set(['periodic', 'lifetime']);

try {
  const [t, s] = await Promise.all([get('/client/v1/tariffs'), get('/client/v1/servers')]);
  if (!Array.isArray(t.tariffs) || !Array.isArray(s.servers)) throw new Error('unexpected response shape');
  const countries = [...new Set(s.servers
    .map((x) => String(x?.country_code ?? '').toLowerCase())
    .filter((c) => /^[a-z]{2}$/.test(c)))].sort();
  const tariffs = t.tariffs
    .filter((x) => x && Number.isSafeInteger(x.id) && str(x.name) && num(x.price_stars) !== undefined && num(x.duration_days) !== undefined)
    .map((x) => ({
      id: x.id,
      key: str(x.key),
      name: x.name,
      price_stars: x.price_stars,
      regular_price_stars: num(x.regular_price_stars),
      promo_label: str(x.promo_label),
      promo_ends_at: str(x.promo_ends_at),
      duration_days: x.duration_days,
      quotas: (Array.isArray(x.quotas) ? x.quotas : []).filter((q) => q && QUOTA_TYPES.has(q.type)).map((q) => ({
        type: q.type,
        reset_mode: RESET_MODES.has(q.reset_mode) ? q.reset_mode : undefined,
        limit_bytes: num(q.limit_bytes),
        period_minutes: num(q.period_minutes),
        period_months: num(q.period_months),
      })),
    }));
  // an empty answer is far more likely a Core fault than a real "no tariffs": keep the previous file
  if (!tariffs.length) throw new Error('no valid tariffs in the response');
  const data = { updated_at: new Date().toISOString(), tariffs, countries };
  writeFileSync(`${out}.tmp`, JSON.stringify(data));
  renameSync(`${out}.tmp`, out);
  console.log(`wrote ${out}: ${data.tariffs.length} tariffs, ${data.countries.length} countries`);
} catch (e) {
  console.error(`refresh failed, keeping the previous data: ${e.message}`);
  process.exit(1);
}
