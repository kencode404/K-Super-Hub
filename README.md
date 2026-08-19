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
