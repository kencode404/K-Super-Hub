/**
 * Storage used to persist the Supabase session.
 *
 * The browser default is `localStorage` alone, which the hub loses whenever a
 * device evicts site data — and the user is then asked to sign in again. This
 * adapter keeps the same value in three places, so a session survives as long
 * as any one of them does:
 *
 *   1. `localStorage`  — primary, shared across every app on the origin.
 *   2. a long-lived cookie on `Path=/` — survives localStorage being cleared,
 *      and is chunked because the session JSON can exceed the 4KB cookie cap.
 *   3. memory — last resort when the browser blocks persistent storage
 *      (private mode, embedded webviews), so at least the tab stays signed in.
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // 400 days: the cap Chrome enforces.
const COOKIE_CHUNK_SIZE = 3000
const MAX_COOKIE_CHUNKS = 12

const memoryStore = new Map<string, string>()

function cookieAttributes() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  return `; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

function readCookieChunk(name: string) {
  const prefix = `${encodeURIComponent(name)}=`
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : null
}

function readCookie(key: string) {
  try {
    let value = ''
    for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
      const chunk = readCookieChunk(`${key}.${index}`)
      if (chunk === null) break
      value += chunk
    }
    return value || null
  } catch {
    return null
  }
}

function expireCookiesFrom(key: string, firstIndex: number) {
  for (let index = firstIndex; index < MAX_COOKIE_CHUNKS; index += 1) {
    document.cookie = `${encodeURIComponent(`${key}.${index}`)}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}

function writeCookie(key: string, value: string) {
  try {
    const chunks: string[] = []
    for (let start = 0; start < value.length; start += COOKIE_CHUNK_SIZE) {
      chunks.push(value.slice(start, start + COOKIE_CHUNK_SIZE))
    }
    if (chunks.length > MAX_COOKIE_CHUNKS) {
      // Too large to mirror; localStorage remains the source of truth.
      expireCookiesFrom(key, 0)
      return
    }
    chunks.forEach((chunk, index) => {
      document.cookie = `${encodeURIComponent(`${key}.${index}`)}=${encodeURIComponent(chunk)}${cookieAttributes()}`
    })
    expireCookiesFrom(key, chunks.length)
  } catch {
    // Cookies unavailable — the other two layers still apply.
  }
}

function removeCookie(key: string) {
  try {
    expireCookiesFrom(key, 0)
  } catch {
    // Nothing to clean up.
  }
}

function readLocal(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Quota or blocked storage — the cookie and memory copies still apply.
  }
}

function removeLocal(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Already gone.
  }
}

export const persistentAuthStorage = {
  getItem(key: string) {
    const local = readLocal(key)
    if (local !== null) return local

    const cookie = readCookie(key)
    if (cookie !== null) {
      // Restore the primary copy so later reads are cheap again.
      writeLocal(key, cookie)
      memoryStore.set(key, cookie)
      return cookie
    }

    return memoryStore.get(key) ?? null
  },

  setItem(key: string, value: string) {
    memoryStore.set(key, value)
    writeLocal(key, value)
    writeCookie(key, value)
  },

  removeItem(key: string) {
    memoryStore.delete(key)
    removeLocal(key)
    removeCookie(key)
  },
}
