import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  ArrowSquareOut,
  Calculator,
  CheckCircle,
  ChartLineUp,
  LockKey,
  Racquet,
  SignOut,
  Sparkle,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react'
import { supabase } from './lib/supabase'
import { InvestmentGrowthCalculator } from './features/investment-growth/InvestmentGrowthCalculator'

type AuthMode = 'login' | 'signup'

const HUB_PATH = '/K-Super-Hub/'
const RETURN_KEY = 'k-super-hub:return-to'
const PENDING_KEY = 'k-super-hub:auth-return-pending'
const HUB_ICON = `${import.meta.env.BASE_URL}k-super-hub-icon.png`

const apps = [
  {
    name: 'WorthDelta',
    path: '/WorthDelta/',
    description: 'See the change. Know your worth.',
    eyebrow: 'Personal finance',
    icon: ChartLineUp,
    image: `${import.meta.env.BASE_URL}worthdelta-icon.png`,
    // The artwork already carries its own padding.
    insetIcon: false,
    accent: 'lime',
    // Same origin as the hub, so it shares the signed-in session.
    external: false,
  },
  {
    name: 'Badminton ELO',
    path: 'https://badminton-elo-rating.vercel.app/',
    description: 'Rate every match. Rank every rival.',
    eyebrow: 'Match ratings',
    icon: Racquet,
    image: `${import.meta.env.BASE_URL}badminton-elo-icon.png`,
    // Full-bleed line art: inset it so the rounded tile does not clip it.
    insetIcon: true,
    accent: 'violet',
    // Hosted off-origin: opens in its own tab and cannot share the session.
    external: true,
  },
] as const

const tools = [
  {
    name: 'Growth Projection',
    description: 'Map a target XIRR into a date-accurate wealth projection.',
    eyebrow: 'XIRR calculator',
    hash: '#tools/investment-growth',
    icon: Calculator,
  },
] as const

function safeReturnPath(candidate: string | null) {
  if (!candidate) return null

  try {
    const destination = new URL(candidate, window.location.origin)
    const isKnownApp = apps.some((app) => !app.external && destination.pathname.startsWith(app.path))
    if (destination.origin !== window.location.origin || !isKnownApp) return null
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return null
  }
}

function requestedReturnPath() {
  return safeReturnPath(new URLSearchParams(window.location.search).get('next'))
}

function storedReturnPath() {
  return safeReturnPath(window.localStorage.getItem(RETURN_KEY))
}

function rememberReturnPath(path: string | null) {
  if (path) window.localStorage.setItem(RETURN_KEY, path)
}

function clearReturnPath() {
  window.localStorage.removeItem(RETURN_KEY)
  window.localStorage.removeItem(PENDING_KEY)
}

function continueTo(path: string) {
  clearReturnPath()
  window.location.replace(new URL(path, window.location.origin).href)
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="google-mark">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.37l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.91a6.02 6.02 0 0 1 0-3.82V7.47H3.04a10 10 0 0 0 0 9.06l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.62C7.18 7.72 9.39 5.95 12 5.95Z" />
    </svg>
  )
}

function Brand() {
  return (
    <a className="brand" href={HUB_PATH} aria-label="K-SuperHub home">
      <span className="brand-mark brand-image-mark" aria-hidden="true"><img src={HUB_ICON} alt="" /></span>
      <strong>K-SuperHub</strong>
    </a>
  )
}

function AuthScreen({ onSession }: { onSession: (session: Session) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const returnPath = useMemo(() => requestedReturnPath(), [])
  const returnApp = apps.find((app) => !app.external && returnPath?.startsWith(app.path))

  useEffect(() => {
    rememberReturnPath(returnPath)
  }, [returnPath])

  async function handleEmailAuth(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    rememberReturnPath(returnPath)
    if (returnPath) window.localStorage.setItem(PENDING_KEY, 'true')

    const result = mode === 'signup'
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL(HUB_PATH, window.location.origin).href,
            data: { full_name: name },
          },
        })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    if (result.data.session) {
      onSession(result.data.session)
      return
    }
    setMessage('Check your email to confirm your account. This hub will continue where you left off.')
  }

  async function handleGoogleAuth() {
    setLoading(true)
    setError('')
    rememberReturnPath(returnPath)
    if (returnPath) window.localStorage.setItem(PENDING_KEY, 'true')

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL(HUB_PATH, window.location.origin).href },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-atmosphere" aria-labelledby="welcome-title">
        <Brand />
        <div className="orbit orbit-one" aria-hidden="true" />
        <div className="orbit orbit-two" aria-hidden="true" />
        <div className="signal-card signal-top" aria-hidden="true"><Sparkle />One identity</div>
        <div className="signal-card signal-bottom" aria-hidden="true"><LockKey />Private by design</div>
        <div className="welcome-copy">
          <p className="eyebrow">Your connected workspace</p>
          <h1 id="welcome-title">One key.<br /><span>Every world.</span></h1>
          <p>Sign in once to move securely between every app in your Kencode collection.</p>
        </div>
        <div className="app-trail" aria-label="Connected applications">
          <span className="trail-node active">K</span><i /><span className="trail-node">Δ</span><i /><span className="trail-node ghost">+</span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="form-title">
        <div className="mobile-brand"><Brand /></div>
        <div className="auth-card">
          {returnApp && <p className="return-chip"><ArrowRight /> Continue to {returnApp.name}</p>}
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Join the hub'}</p>
          <h2 id="form-title">{mode === 'login' ? 'Access your workspace' : 'Create your K-SuperHub account'}</h2>
          <p className="form-intro">{mode === 'login' ? 'Your apps are waiting on the other side.' : 'One secure account will unlock your connected apps.'}</p>

          <button className="google-button" type="button" onClick={handleGoogleAuth} disabled={loading}>
            <GoogleMark /> Continue with Google
          </button>
          <div className="divider"><span>or use email</span></div>

          <form onSubmit={handleEmailAuth} noValidate>
            {mode === 'signup' && <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>}
            <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required />{mode === 'signup' && <small>Use at least 8 characters.</small>}</label>

            {error && <p className="form-alert error" role="alert"><WarningCircle />{error}</p>}
            {message && <p className="form-alert success" role="status"><CheckCircle />{message}</p>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <SpinnerGap className="spin" /> : <ArrowRight />}
              {mode === 'login' ? 'Enter the hub' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">{mode === 'login' ? 'New around here?' : 'Already have an account?'}{' '}<button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
        </div>
        <p className="security-note"><LockKey /> Protected by Supabase authentication</p>
      </section>
    </main>
  )
}

function HubDashboard({ session }: { session: Session }) {
  const displayName = session.user.user_metadata.full_name ?? session.user.email?.split('@')[0] ?? 'there'

  return (
    <main className="hub-shell">
      <header className="hub-header">
        <Brand />
        <nav className="hub-nav" aria-label="Hub collections"><a href="#apps">Apps</a><a href="#tools">Tools</a></nav>
        <div className="hub-user"><span className="avatar">{displayName[0].toUpperCase()}</span><span><strong>{displayName}</strong><small>{session.user.email}</small></span><button type="button" onClick={() => void supabase.auth.signOut({ scope: 'local' })}><SignOut />Sign out</button></div>
      </header>
      <section className="hub-hero">
        <div><p className="eyebrow">Command center</p><h1>Good to see you, {displayName}.</h1><p>Your connected apps are ready. One account keeps the doors open.</p></div>
        <div className="hub-pulse" aria-hidden="true"><span><img src={HUB_ICON} alt="" /></span></div>
      </section>
      <section className="apps-section" id="apps" aria-labelledby="apps-title">
        <div className="section-heading"><div><p className="eyebrow">Your collection</p><h2 id="apps-title">Connected apps</h2></div><span>{apps.length} live</span></div>
        <div className="app-grid">
          {apps.map((app) => {
            const Icon = app.icon
            const external = app.external ? { target: '_blank' as const, rel: 'noopener noreferrer' } : {}
            return <a className={`app-card ${app.accent}`} href={app.path} key={app.path} {...external}><span className={`app-icon has-image${app.insetIcon ? ' inset-image' : ''}`}><img src={app.image} alt="" /><Icon className="fallback-icon" /></span><span className="app-copy"><small>{app.eyebrow}</small><strong>{app.name}</strong><p>{app.description}</p></span><span className="app-arrow">{app.external ? <ArrowSquareOut /> : <ArrowRight />}</span></a>
          })}
          <article className="app-card coming-soon"><span className="app-icon"><Sparkle /></span><span className="app-copy"><small>Next workspace</small><strong>More to come</strong><p>Your future apps will appear here.</p></span></article>
        </div>
      </section>
      <section className="tools-section" id="tools" aria-labelledby="tools-title">
        <div className="section-heading"><div><p className="eyebrow">Useful by design</p><h2 id="tools-title">Tools</h2></div><span>{tools.length} live</span></div>
        <div className="tool-grid">
          {tools.map((tool) => {
            const Icon = tool.icon
            return <a className="tool-card" href={tool.hash} key={tool.hash}><span className="tool-card-icon"><Icon /></span><span className="app-copy"><small>{tool.eyebrow}</small><strong>{tool.name}</strong><p>{tool.description}</p></span><span className="app-arrow"><ArrowRight /></span></a>
          })}
        </div>
      </section>
    </main>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const handleRouteChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleRouteChange)
    return () => window.removeEventListener('hashchange', handleRouteChange)
  }, [])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      setLoading(false)
    }

    void restoreSession()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    // Launching without a connection can leave a stored session unrecovered.
    // Retry once the device is back online rather than asking for a sign-in.
    const retryRestore = () => void restoreSession()
    window.addEventListener('online', retryRestore)

    return () => {
      active = false
      window.removeEventListener('online', retryRestore)
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const requested = requestedReturnPath()
    const pending = window.localStorage.getItem(PENDING_KEY) === 'true'
    const destination = requested ?? (pending ? storedReturnPath() : null)
    if (destination) continueTo(destination)
  }, [session])

  if (loading) return <main className="boot-screen"><span className="brand-mark brand-image-mark" aria-hidden="true"><img src={HUB_ICON} alt="" /></span><SpinnerGap className="spin" aria-label="Loading K-SuperHub" /></main>
  if (!session) return <AuthScreen onSession={setSession} />
  if (route === '#tools/investment-growth') {
    return <InvestmentGrowthCalculator session={session} onBack={() => { window.location.hash = ''; setRoute('') }} onSignOut={() => void supabase.auth.signOut({ scope: 'local' })} />
  }
  return <HubDashboard session={session} />
}

export default App
