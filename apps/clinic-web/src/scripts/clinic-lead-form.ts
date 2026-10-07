import { API_ENDPOINTS, leadSchema } from '@vcard/shared'

const CLINIC_SOURCE = 'clinic-web'
const REQUEST_TIMEOUT_MS = 10_000

const form = document.querySelector<HTMLFormElement>('#clinic-lead-form')
const submitButton = document.querySelector<HTMLButtonElement>('#clinic-submit')
const requestStatus = document.querySelector<HTMLParagraphElement>('#clinic-request-status')

const resetTurnstile = () => {
  const tokenInput = form?.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')
  if (tokenInput) tokenInput.value = ''
  const turnstile = (window as Window & { turnstile?: { reset: () => void } }).turnstile
  try {
    turnstile?.reset()
  } catch {
    // The token is cleared even if the external widget has already unloaded.
  }
}

const clearErrors = () => {
  document.querySelectorAll<HTMLElement>('.field-error').forEach((element) => {
    element.textContent = ''
  })
  form?.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute('aria-invalid')
  })
}

const setStatus = (message = '', state = '') => {
  if (!requestStatus) return
  requestStatus.textContent = message
  requestStatus.dataset.state = state
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (submitButton?.disabled) return

  clearErrors()
  setStatus()

  if (form.dataset.clinicReady !== 'true') {
    setStatus(
      'Відправлення стане доступним після окремої специфікації доставки й конфіденційності.',
      'error',
    )
    return
  }

  const formData = new FormData(form)
  const payload = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    district: formData.get('district'),
    services: formData.getAll('services'),
    source: CLINIC_SOURCE,
    turnstileToken: formData.get('cf-turnstile-response') || undefined,
  }
  const result = leadSchema.safeParse(payload)

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const name = String(issue.path[0])
      const error = document.getElementById(`${name}-error`)
      const fields = form.elements.namedItem(name)

      if (error) error.textContent = issue.message
      if (fields instanceof HTMLElement) fields.setAttribute('aria-invalid', 'true')
      if (fields instanceof RadioNodeList) fields[0]?.setAttribute('aria-invalid', 'true')
    })
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }

  if (submitButton) {
    submitButton.disabled = true
    submitButton.textContent = 'Надсилаємо…'
  }
  setStatus('Надсилаємо звернення…', 'pending')

  try {
    const requestedTimeout = Number(form.dataset.requestTimeoutMs)
    const timeout = Number.isFinite(requestedTimeout) ? requestedTimeout : REQUEST_TIMEOUT_MS
    const response = await fetch(API_ENDPOINTS.LEADS_SUBMIT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      signal: AbortSignal.timeout(timeout),
    })
    if (!response.ok) throw new Error('Lead request failed')

    form.reset()
    setStatus('Звернення надіслано.', 'success')
  } catch {
    resetTurnstile()
    setStatus('Не вдалося надіслати звернення. Спробуйте ще раз.', 'error')
  } finally {
    if (submitButton) {
      submitButton.disabled = false
      submitButton.textContent = 'Надіслати звернення'
    }
  }
})
