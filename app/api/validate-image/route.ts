import { type NextRequest, NextResponse } from 'next/server'

const TIMEOUT_MS = 8_000

/** Basic SSRF-prevention: only allow HTTPS external URLs */
function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * GET /api/validate-image?url=<encoded_url>
 *
 * Validates that a URL responds with an image/* content-type.
 * Uses HEAD first; falls back to a range-limited GET if the CDN
 * doesn't support HEAD (common with Facebook's scontent CDN).
 *
 * Response:
 *   200 { valid: true,  contentType: "image/jpeg" }
 *   200 { valid: false, reason: string }
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ valid: false, reason: 'Falta el parámetro url' })
  }

  if (!isSafeUrl(url)) {
    return NextResponse.json({
      valid: false,
      reason: 'La URL debe comenzar con https://',
    })
  }

  const headers = {
    // Mimic a real browser to avoid CDN bot-blocking
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
  }

  // --- Attempt 1: HEAD request -----------------------------------------------
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Next.js: don't cache the validation response
      cache: 'no-store',
    })

    if (res.ok) {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.startsWith('image/')) {
        return NextResponse.json({ valid: true, contentType: ct })
      }
      // HEAD succeeded but content-type is not an image — fall through to GET
    }

    // 4xx / 5xx from HEAD → image is definitely broken
    if (res.status >= 400) {
      return NextResponse.json({
        valid: false,
        reason: `La imagen no es accesible (HTTP ${res.status})`,
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('TimeoutError') || msg.includes('abort')) {
      return NextResponse.json({
        valid: false,
        reason: 'La URL no respondió a tiempo (timeout). Verifica el enlace.',
      })
    }
    // Network error or HEAD not supported → try GET range request
  }

  // --- Attempt 2: range-limited GET (first byte only) -------------------------
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...headers, Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })

    if (res.ok || res.status === 206) {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.startsWith('image/')) {
        return NextResponse.json({ valid: true, contentType: ct })
      }
      return NextResponse.json({
        valid: false,
        reason: `La URL no apunta a una imagen (tipo: ${ct || 'desconocido'})`,
      })
    }

    return NextResponse.json({
      valid: false,
      reason: `La imagen no es accesible (HTTP ${res.status})`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('TimeoutError') || msg.includes('abort')) {
      return NextResponse.json({
        valid: false,
        reason: 'La URL no respondió a tiempo (timeout). Verifica el enlace.',
      })
    }
    return NextResponse.json({
      valid: false,
      reason: 'No se pudo acceder a la URL. Verifica el enlace e intenta de nuevo.',
    })
  }
}
