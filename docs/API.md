# Customer cabinet API

HTTP API of the customer cabinet gateway. Base path: `/api`. Everything below is what the cabinet's own web page uses.
It is **not a stable public contract**: paths and fields may change between releases.

Conventions are in the [Conventions](#conventions) section; the allowed fields of every response are fixed by the
gateway, so extra data from the backend never reaches the client.

## Conventions

- **Format:** JSON (`Content-Type: application/json`), except where a path says otherwise.
- **Authentication:** a session cookie (`HttpOnly`, `Secure`, `SameSite=Strict`) set by a sign-in call. The user is
  always taken from the session, never from the request, so one customer cannot address another's data.
- **CSRF:** every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) must carry the header
  `X-CSRF-Token` with the `csrf_token` returned by sign-in or `GET /api/auth/session`, and an `Origin` header equal
  to the cabinet's own origin. Otherwise: `403 bad_csrf` or `403 bad_origin`.
- **Errors:** `{"error": {"code": "<machine_code>", "message": "<human text>"}}` with a matching HTTP status. Some
  errors add fields (for example `retry_at`). The text of `message` is in Russian.
- **Unauthenticated:** a path that needs a session answers `401 unauthenticated`. Unknown paths under `/api/`
  answer the same way when there is no session, and `404 not_found` with one.
- **Rate limits:** the sign-in paths and paths that check a link or password are throttled harder than the rest.
  A `429` means wait and retry.

## Public (no session)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness: `{"ok": true}`. |
| GET | `/api/auth/session` | Session state. |
| POST | `/api/auth/lookup` | Check a subscription link. |
| POST | `/api/auth/login` | Sign in with link and password. |
| POST | `/api/auth/register` | Set a first password and sign in. |
| POST | `/api/auth/telegram/start` | Begin sign-in through the Telegram bot. |
| POST | `/api/auth/telegram/status` | Poll that sign-in. |

### `GET /api/auth/session`

```json
{ "authenticated": true, "csrf_token": "…", "telegram_login": true }
```

When signed out: `{ "authenticated": false, "telegram_login": true }`. `telegram_login` tells whether sign-in
through Telegram is available.

### `POST /api/auth/lookup`

Request: `{ "subscription": "<subscription link or token>" }`

Response: `{ "has_password": true }`

Errors: `404 invalid_subscription` (no such link; the answer is the same for an unknown and a malformed link),
`400 foreign_link` (a link that does not belong to this service), `429`.

### `POST /api/auth/login`

Request: `{ "subscription": "<link>", "password": "<password>" }`

Response: `{ "authenticated": true, "csrf_token": "…" }` and the session cookie.

Errors: `401 invalid_credentials`, `429`.

### `POST /api/auth/register`

Sets the first password for an account that has none, then signs in.

Request: `{ "subscription": "<link>", "password": "<8–64 characters>" }`

Response: same as login. Errors: `404 invalid_subscription`, `400 invalid_request` (password length).

### `POST /api/auth/telegram/start`

Starts a sign-in confirmed in the Telegram bot. Returns a link to open in Telegram:

```json
{ "url": "https://t.me/…", "expires_at": "…" }
```

The browser receives a short-lived poll cookie; only that browser can finish the sign-in.
Errors: `404 not_found` (Telegram sign-in is off), `429 telegram_too_many`, `503 bot_unavailable`.

### `POST /api/auth/telegram/status`

No body. Response: `{ "status": "pending" }`, `{ "status": "expired" }`, or
`{ "status": "approved", "authenticated": true, "csrf_token": "…" }` with the session cookie.

## Session

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/logout` | End the session. `204`. |

## Account

All need a session.

### `GET /api/me`

The account summary:

```json
{
  "user_id": 1,
  "name": "…",
  "enabled": true,
  "access": { "status": "…", "entitled": true, "expires_at": "…" },
  "restriction_reason": "",
  "grace": null,
  "plan": { "tariff_id": 1, "name": "…", "duration_days": 30, "assigned_at": "…" },
  "quotas": [
    { "id": 1, "kind": "…", "type": "…", "limit_bytes": 0, "used_bytes": 0, "remaining_bytes": 0,
      "resets_at": "…", "state": "…", "exhausted": false }
  ],
  "subscription": { "url": "…", "created_at": "…" },
  "traffic": { "total_bytes": 0 },
  "servers": [ { "name": "…", "country_code": "…", "speed": "…", "online": true, "online_users": 0 } ]
}
```

`grace` is `null` or `{ id, status: "available"|"active"|"ended", started_at, ends_at, quota_bytes, used_bytes,
remaining_bytes, end_reason, deletion_at }`. `plan` and `subscription` can be `null`. If the account no longer
exists the session is ended and the answer is `401`.

### `GET /api/me/profile`

Telegram first name and whether a picture exists: `{ "first_name": "…" | null, "has_avatar": true }`.

### `GET /api/me/avatar`

The Telegram profile picture (`image/jpeg`, never cached). `404 not_found` when there is none.

### `GET /api/me/purchases`

`{ "paid": 0, "last_paid_at": "…" | null }` — number of payments and time of the latest.

### `POST /api/me/password`

Request: `{ "current": "<current password>", "next": "<8–64 characters>" }`

Response: `{ "ok": true }`. All other sessions of this account end.
Errors: `401 wrong_password`, `400 invalid_request`.

## Telegram link

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/me/telegram` | Link state. |
| POST | `/api/me/telegram/link` | Start linking. |
| POST | `/api/me/telegram/unlink` | Unlink. |

`GET` returns `{ "available": false }` when the feature is off, otherwise
`{ "available": true, "state": "unlinked" | "linked" | "unknown", … }`. A linked state adds `linked_at`, `origin`,
`next_change_at` and basic Telegram details. `unknown` means the bot did not answer.

`link` returns the data needed to confirm in the bot. `unlink` returns `{ "ok": true }` and ends the account's other
sessions. Errors: `409 telegram_already_linked`, `409 telegram_not_linked`, `409 telegram_payment_pending`,
`429 telegram_cooldown` (with `retry_at`; the link can be changed once per 10 minutes), `429 telegram_too_many`,
`503 bot_unavailable`.

## Subscription, routing, AmneziaWG

### `POST /api/me/subscription/rotate`

Issues a new subscription link and invalidates the old one.

Response: `{ "url": "…", "created_at": "…" }`. Error: `429 rotate_cooldown` (once per 10 minutes).

### `GET /api/me/routing` · `POST /api/me/routing`

Split-tunneling setting. `GET` → `{ "allowed": true, "enabled": false, "chosen": false }`.
`POST` with `{ "enabled": true }` returns the same shape. `403 routing_not_allowed` when the administrator has not
enabled it for this account.

### `GET /api/me/awg`

AmneziaWG locations available to the account:

```json
{ "services": [ { "service_id": 1, "name": "…", "country_code": "…" } ] }
```

### `POST /api/me/awg/{serviceId}`

Creates (or returns) the client configuration for one location. No body.

```json
{ "service_id": 1, "name": "…", "filename": "…", "config": "<config file text>", "amnezia_key": "vpn://…" }
```

The response contains the account's private key. It is sent only to that customer and is not stored or logged by
the gateway. Error: `404 awg_unavailable`.

### `POST /api/me/awg/{serviceId}/rotate`

Replaces the key pair; same response shape. Errors: `404 awg_unavailable`, `429 awg_rotate_cooldown`
(once per 10 minutes).

## Plans and status

### `GET /api/plans`

Tariffs on sale. Payment itself happens in the Telegram bot; every tariff has a link that opens its invoice.

```json
{
  "bot_url": "https://t.me/…",
  "tariffs": [
    {
      "id": 1, "name": "…", "price_stars": 0, "price_rub": 0, "duration_days": 30,
      "regular_price_stars": 0, "promo_ends_at": "…", "promo_label": "…",
      "quotas": [ { "type": "…", "reset_mode": "…", "limit_bytes": 0, "period_minutes": 0, "period_months": 0 } ],
      "buy_url": "https://t.me/…?start=buy_1"
    }
  ]
}
```

`price_rub` is present only if a ruble price is set. `regular_price_stars`, `promo_ends_at` and `promo_label`
appear only while a promotion runs.

### `GET /api/status`

Five-day record of server availability and people online; identical for every customer.

```json
{
  "since": 0, "bucket_ms": 0, "sample_ms": 0, "updated_at": "…",
  "online": { "avg": [0], "peak": [0] },
  "downtime_minutes": [0],
  "servers": [ { "name": "…", "online": true, "online_users": 0, "uptime": 0.99, "up": [1] } ],
  "incidents": [ { "server": "…", "from": "…", "to": "…" | null } ]
}
```

Arrays are per time column (`since` + `i × bucket_ms`). `null` in `up`/`online` means no sample in that column.

## Banner

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/banner` | Banner meant for this account, or none. |
| POST | `/api/banner/{bannerId}/dismiss` | Dismiss it. |
| GET | `/api/banner/image/{imageId}` | A banner picture. |

`GET /api/banner` → `{ "banner": null }` or `{ "banner": { "id", "title", "description", "button_text", "link_url",
"image_id", "mobile_image_id", "image_fit", "align", "height_desktop", "height_mobile", "background", "text_color",
"text_size", "dismissible" } }`. A failure of the banner source simply means no banner. `dismiss` → `{ "ok": true }`.

## Support tickets

Needs a session. The user is always the signed-in one. Text is at most 2000 characters, a subject at most 100.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/me/tickets` | List own tickets. |
| POST | `/api/me/tickets` | Create a ticket. `201`. |
| GET | `/api/me/tickets/{ticketId}` | A ticket with its messages (`?before=<messageId>` for older ones). |
| POST | `/api/me/tickets/{ticketId}/messages` | Add a message. |
| POST | `/api/me/tickets/{ticketId}/attachments` | Attach a photo or video. |
| GET | `/api/me/tickets/{ticketId}/attachments/{aid}` | Download an attachment (supports `Range`). |

- `GET /api/me/tickets` → `{ "enabled": true, "tickets": [ … ] }`; when support is off, `{ "enabled": false, "tickets": [] }`.
- Create: `{ "subject": "…", "body": "…" }` (`subject` optional, `body` required).
- Message: `{ "body": "…" }`.
- Attachment: the **raw file as the request body** (not JSON), file name in `?name=…` (up to 80 characters),
  `Content-Type` of the file. Types: JPEG, PNG, WebP, GIF, MP4, WebM, QuickTime. Up to 10 MB per file and 10 MB of
  attachments in total per account.
- Errors: `404 not_found`, `409 ticket_limit` (three open tickets), `409 ticket_closed`, `409 ticket_full`,
  `429 ticket_flood`, `429 ticket_quota`, `413 ticket_media_limit`, `415 ticket_media_type`,
  `503 ticket_media_disabled`, `400 ticket_too_long`, `400 ticket_empty`, `503 bot_unavailable`.
