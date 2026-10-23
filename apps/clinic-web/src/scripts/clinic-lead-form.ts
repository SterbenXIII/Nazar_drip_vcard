import { API_ENDPOINTS, leadSchema, VALIDATION_LIMITS } from '@vcard/shared'

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
  form?.querySelectorAll<HTMLElement>('.field-error').forEach((element) => {
    element.textContent = ''
  })
  form?.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute('aria-invalid')
  })
}

const validateField = (field: HTMLInputElement) => {
  const schema =
    field.name === 'name'
      ? leadSchema.shape.name
      : field.name === 'phone'
        ? leadSchema.shape.phone
        : undefined
  if (!schema) return

  const result = schema.safeParse(field.value)
  const error = form?.querySelector<HTMLElement>(`#${field.name}-error`)
  if (!result.success) {
    if (error) error.textContent = result.error.issues[0]?.message ?? ''
    field.setAttribute('aria-invalid', 'true')
    return
  }

  if (error) error.textContent = ''
  field.removeAttribute('aria-invalid')
}

form?.addEventListener(
  'invalid',
  (event) => {
    const field = event.target
    if (!(field instanceof HTMLInputElement)) return

    validateField(field)
  },
  true,
)

form?.addEventListener(
  'blur',
  (event) => {
    const field = event.target
    if (field instanceof HTMLInputElement) validateField(field)
  },
  true,
)

form?.addEventListener('input', (event) => {
  const field = event.target
  if (!(field instanceof HTMLInputElement)) return

  if (field.name === 'phone') {
    const value = field.value
      .replace(/[^\d+().\s-]/g, '')
      .slice(0, VALIDATION_LIMITS.MAX_PHONE_INPUT_LENGTH)
    if (value !== field.value) field.value = value
  }

  if (field.getAttribute('aria-invalid') === 'true') validateField(field)
})

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

  const formData = new FormData(form)
  const district = formData.get('district')
  const services = formData.getAll('services')
  const payload = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    ...(typeof district === 'string' && district ? { district } : {}),
    ...(services.length > 0 ? { services } : {}),
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
