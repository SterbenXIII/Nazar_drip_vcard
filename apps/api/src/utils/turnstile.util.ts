import { logger } from '@/config/logger'
import { ERROR_MESSAGES } from '@/constants/messages'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_TIMEOUT_MS = 5000

export async function verifyTurnstileToken(
  secretKey: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)

    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
      body: formData,
      method: 'POST',
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    })

    if (!verifyRes.ok) {
      return { success: false, error: ERROR_MESSAGES.TURNSTILE_VERIFICATION_FAILED }
    }

    const outcome: unknown = await verifyRes.json()

    if (
      typeof outcome !== 'object' ||
      outcome === null ||
      !('success' in outcome) ||
      outcome.success !== true
    ) {
      return { success: false, error: ERROR_MESSAGES.TURNSTILE_VERIFICATION_FAILED }
    }

    return { success: true }
  } catch {
    logger.error('Turnstile verification request failed')
    return { success: false, error: ERROR_MESSAGES.TURNSTILE_VERIFICATION_FAILED }
  }
}
