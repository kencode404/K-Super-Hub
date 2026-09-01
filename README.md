# K-SuperHub

K-SuperHub is the shared account gateway and application directory for Kencode
apps hosted under `kencode404.github.io`.

The Hub is installable as a PWA and uses the K-SuperHub artwork for browser,
iPhone, Android, and maskable home-screen icons.

## Authentication flow

An app sends signed-out visitors to the hub with a validated return path:

```text
/K-Super-Hub/?next=/WorthDelta/
```

After email or Google authentication, the hub returns the user to the requesting
app. All apps use the same Supabase project and browser origin, so they share the
persisted session.

## Staying signed in

The session is persisted and auto-refreshed, so a visitor signs in once and
stays signed in across reloads, PWA relaunches, and moves between apps. The
Supabase client writes the session to `localStorage` and mirrors it to a
long-lived `Path=/` cookie (see `src/lib/authStorage.ts`), so the session
survives one store being cleared. Sign-out is local-scope only, and a launch
without a network connection retries once the device is back online instead of
falling back to the sign-in form.

## Off-origin apps

Badminton ELO runs on Vercel, so it cannot read this origin's storage. Its
card hands the current session over in the URL hash (`withSessionHandoff` in
`src/App.tsx`), in the same shape as Supabase's implicit-flow redirect; the
app reads it with `detectSessionInUrl` and lands the visitor signed in.

**This requires refresh token rotation to be OFF for the Supabase project**
(dashboard, under Authentication -> Sessions on current projects, or Auth ->
Settings on older ones). The handoff puts the same refresh token in two
independently refreshing clients. With rotation on, whichever redeems it
first invalidates it for the other, Supabase reads the second attempt as
token reuse, and both apps get signed out. With rotation off the token stays
redeemable and both clients can refresh from it.

Trade-off worth knowing: the handed-over refresh token sits in the card's
`href` and in the opened tab's history, and with rotation off it stays valid
until sign-out. Copying that link copies working credentials.

## Local development

Copy `.env.example` to `.env.local`, add the shared Supabase public credentials,
then run:

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```
