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

Badminton ELO runs on Vercel, so it cannot read this origin's storage and
cannot share the hub's session. It keeps its own Supabase session instead:
same project, its own sign-in, its own refresh chain. Its card is a plain
link that opens in a new tab.

The first visit in a given browser signs in there once (one tap with Google,
since it is the same Supabase project). After that the app persists its own
session, so the card is a one-click landing.

An earlier version handed the hub's session over in the URL hash. That put
one refresh token into two independently refreshing clients: whichever
redeemed it first invalidated it for the other, Supabase read the second
attempt as token reuse, and both apps were signed out. Separate sessions
avoid that without weakening refresh token rotation for the project.

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
