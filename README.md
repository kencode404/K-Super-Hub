# K-Super Hub

K-Super Hub is the shared account gateway and application directory for Kencode
apps hosted under `kencode404.github.io`.

The Hub is installable as a PWA and uses the K-Super Hub artwork for browser,
iPhone, Android, and maskable home-screen icons.

## Authentication flow

An app sends signed-out visitors to the hub with a validated return path:

```text
/K-Super-Hub/?next=/WorthDelta/
```

After email or Google authentication, the hub returns the user to the requesting
app. All apps use the same Supabase project and browser origin, so they share the
persisted session.

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
