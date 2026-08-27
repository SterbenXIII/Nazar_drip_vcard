import { logger } from '@/config/logger'
import { ERROR_MESSAGES } from '@/constants/messages'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstileToken(
  secretKey: string,
  token: string,
  ip?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)

    if (ip) {
      formData.append('remoteip', ip)
    }

    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
      body: formData,
      method: 'POST',
    })

    const outcome = await verifyRes.json()

    if (!outcome.success) {
      return { success: false, error: ERROR_MESSAGES.TURNSTILE_VERIFICATION_FAILED }
    }

    return { success: true }
  } catch (error) {
    logger.error(error, 'Turnstile verification error')
    return { success: false, error: ERROR_MESSAGES.TURNSTILE_VERIFICATION_FAILED }
  }
}
