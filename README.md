# AFIN

منصة جمع بيانات ميدانية ثنائية اللغة (عربي/إنكليزي)، بديل أبسط لـ KoboToolbox وODK.

Bilingual field data collection platform: form builder, online/offline collection,
submissions dashboard, roles and teams, XLSForm interop, end-to-end encrypted forms,
and an optional AI form assistant.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Prisma + SQLite
- Auth: JWT session cookie (jose) + bcrypt
- dnd-kit (builder), recharts (charts), leaflet (maps), xlsx (XLSForm + export)
- PWA: service worker + IndexedDB offline queue

## Setup

```
cp .env.example .env        # set the auth secret
npm install --legacy-peer-deps
npm run setup               # prisma generate + db push + seed
npm run dev                 # http://localhost:3000
```

Seeded login: `admin@afin.local` / `afin12345`

## Scripts

- `npm run dev` — dev server
- `npm run build` — prisma generate then next build
- `npm start` — production server
- `npm run setup` — generate client, push schema, seed
- `npm run db:studio` — Prisma Studio
- `npm run db:seed` — seed demo org, form and submissions

## Layout

```
prisma/schema.prisma   data model (User, Organization, Membership, Project, Form,
                       FormVersion, Submission, Invite, AuditLog, Setting)
src/lib/               db, auth, rbac, session, i18n, form schema/runtime, expr,
                       xlsform, export, ai, offline, crypto-client, ratelimit, security
src/components/        AppShell, OrgSwitcher, FormFill, FieldInput, builder/, data/
src/app/(app)/         dashboard, projects, forms, members, settings, audit
src/app/f/[token]/     public collection (PWA, offline)
src/app/api/           auth, projects, forms, collect, submissions, members, invites,
                       settings, ai, orgs
src/middleware.ts      CSP, security headers, CSRF guard
public/sw.js           service worker
```

## Roles

`owner > admin > editor > collector > viewer`. Checked in `src/lib/rbac.ts` and enforced on
every API route and server page.

## Forms

Forms are JSON schemas (`src/lib/form-schema.ts`). Field types: text, paragraph, integer,
decimal, email, phone, single-select, multi-select, rank, date, time, datetime, rating,
range, geopoint, photo, audio, video, file, signature, barcode, note, calculate, plus the
group and repeat containers (nested children).

Skip logic, constraints and calculations use `${field}` expressions evaluated in
`src/lib/expr.ts` (round, sum, min/max, age, daysBetween, regex, substr, concat, selected,
count, coalesce, iff, today/now …). Repeat groups collect a set of fields many times;
calculations and validation run per instance. Cascading selects filter a question's choices
over choice attributes (`@attr`) and earlier answers (`${field}`).

Builder: drag ordering, drill-in editing of groups and repeats, live preview, XLSForm
import/export (groups, repeats, cascading, choice attributes), templates, and an AI assistant.

## Encrypted forms

A form can be switched to end-to-end encryption (ODK style). The browser generates an
RSA-OAEP keypair; the public key is stored server side and the private key is wrapped with a
key derived from the owner passphrase (PBKDF2 + AES-GCM) — the passphrase is never sent. Each
submission is sealed with a fresh AES-256-GCM content key, itself RSA-wrapped to the form
public key (`src/lib/crypto-client.ts`). Decryption, export and analytics happen in the
browser after the owner enters the passphrase on the Data page. Encryption can only be enabled
before the first submission; server side geo and maps are dropped.

## Security

- JWT session cookie (httpOnly, SameSite Lax) + bcrypt; RBAC on every route.
- `src/middleware.ts`: CSP and security headers, plus cross-origin write rejection.
- Rate limiting (`src/lib/ratelimit.ts`) on login, register and collect.
- Account lockout after repeated failed logins; password strength rules on register.
- Submission payload size cap; audit entries for submissions.

## Offline collection

The public form (`/f/<token>`) is a PWA. Submissions made offline are stored in IndexedDB and
synced when the connection returns. Retries are deduplicated by a client-generated id.

## AI assistant

Pluggable provider (Anthropic or OpenAI). Configure per organization under Settings, or via
the env vars in `.env.example`. Disabled until a key is set.

## Data export

CSV (UTF-8 with BOM for Arabic) and Excel from the form Data tab. Choice values are rendered
as their localized labels.
