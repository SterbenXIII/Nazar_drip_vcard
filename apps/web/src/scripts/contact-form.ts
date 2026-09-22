import {
  API_ENDPOINTS,
  FORM_ELEMENTS,
  leadSchema,
  PHONE_PREFIX,
  STORAGE_KEYS,
  VALIDATION_LIMITS,
} from '@vcard/shared'

document.addEventListener('astro:page-load', () => {
  const form = document.getElementById(FORM_ELEMENTS.FORM_ID) as HTMLFormElement
  const btn = document.getElementById(FORM_ELEMENTS.SUBMIT_BTN) as HTMLButtonElement
  const spinner = document.getElementById(FORM_ELEMENTS.SPINNER)
  const successMsg = document.getElementById(FORM_ELEMENTS.SUCCESS_MSG)
  const formStatus = document.getElementById('form-status')

  form?.addEventListener('submit', async (event) => {
    event.preventDefault()

    // Скидання помилок
    document.querySelectorAll(FORM_ELEMENTS.ERROR_CLASS).forEach((errorElement) => {
      errorElement.classList.add(FORM_ELEMENTS.HIDDEN_CLASS)
      errorElement.textContent = ''
    })
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
      field.removeAttribute('aria-invalid')
    })

    const formData = new FormData(form)
    const rawData: Record<string, unknown> = Object.fromEntries(formData.entries())

    // Explicitly handle array and renamed fields
    rawData[FORM_ELEMENTS.INPUT_SERVICES] = formData.getAll(FORM_ELEMENTS.INPUT_SERVICES)
    rawData.turnstileToken = formData.get(FORM_ELEMENTS.INPUT_TURNSTILE) || undefined

    // Валідація
    const result = leadSchema.safeParse(rawData)

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0])
        const errorEl = document.getElementById(`${fieldName}${FORM_ELEMENTS.ERROR_SUFFIX}`)

        if (errorEl) {
          errorEl.textContent = issue.message
          errorEl.classList.remove(FORM_ELEMENTS.HIDDEN_CLASS)
        }

        const field = form.elements.namedItem(fieldName)
        if (field instanceof HTMLElement) field.setAttribute('aria-invalid', 'true')
      })

      const firstInvalidField = form.querySelector<HTMLElement>('[aria-invalid="true"]')
      firstInvalidField?.focus()
      return
    }

    // Відправка
    try {
      btn.disabled = true
      spinner?.classList.remove(FORM_ELEMENTS.HIDDEN_CLASS)

      const response = await fetch(API_ENDPOINTS.LEADS_SUBMIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })

      if (response.ok) {
        form.reset()
        // Clear storage on success
        localStorage.removeItem(STORAGE_KEYS.CONTACT_FORM)

        btn.classList.add(FORM_ELEMENTS.HIDDEN_CLASS)
        successMsg?.classList.remove(FORM_ELEMENTS.HIDDEN_CLASS)
      } else {
        throw new Error('Server error')
      }
    } catch (error) {
      console.error(error)
      formStatus?.classList.remove(FORM_ELEMENTS.HIDDEN_CLASS)
      if (formStatus)
        formStatus.textContent = 'Помилка відправки. Спробуйте ще раз або зателефонуйте нам.'
    } finally {
      btn.disabled = false
      spinner?.classList.add(FORM_ELEMENTS.HIDDEN_CLASS)
    }
  })

  // Phone Mask Logic
  const phoneInput = document.getElementById(FORM_ELEMENTS.INPUT_PHONE) as HTMLInputElement

  if (phoneInput) {
    // Ensure prefix is always present on focus
    phoneInput.addEventListener('focus', () => {
      if (!phoneInput.value) {
        phoneInput.value = PHONE_PREFIX
      }
    })

    phoneInput.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement
      const value = input.value

      // Prevent deleting prefix
      if (!value.startsWith(PHONE_PREFIX)) {
        input.value = PHONE_PREFIX
        return
      }

      // Remove non-digit characters after prefix
      let numberPart = value.slice(PHONE_PREFIX.length).replaceAll(/\D/g, '')

      if (numberPart.startsWith('0')) {
        numberPart = numberPart.slice(1)
      }

      // Limit length to constant
      const truncated = numberPart.slice(0, VALIDATION_LIMITS.PHONE_NUMBER_LENGTH)

      input.value = PHONE_PREFIX + truncated
    })

    // Prevent cursor movement into prefix
    phoneInput.addEventListener('keydown', (event) => {
      const input = event.target as HTMLInputElement
      if (
        input.selectionStart &&
        input.selectionStart < PHONE_PREFIX.length &&
        (event.key === 'Backspace' || event.key === 'Delete')
      ) {
        event.preventDefault()
      }
    })

    phoneInput.addEventListener('click', () => {
      if (phoneInput.selectionStart && phoneInput.selectionStart < PHONE_PREFIX.length) {
        phoneInput.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length)
      }
    })
  }

  // --- Persistence Logic ---
  function saveFormData() {
    if (!form) return
    const formData = new FormData(form)
    const services = formData.getAll(FORM_ELEMENTS.INPUT_SERVICES)
    const phone = formData.get(FORM_ELEMENTS.INPUT_PHONE)

    const data = {
      services,
      phone,
    }
    try {
      localStorage.setItem(STORAGE_KEYS.CONTACT_FORM, JSON.stringify(data))
    } catch (error) {
      console.warn('LocalStorage unavailable', error)
    }
  }

  function loadFormData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACT_FORM)
      if (!saved) return

      const data = JSON.parse(saved)

      // Restore phone
      if (data.phone) {
        const phoneInput = document.getElementById(FORM_ELEMENTS.INPUT_PHONE) as HTMLInputElement
        if (phoneInput) phoneInput.value = data.phone
      }

      // Restore services
      if (data.services && Array.isArray(data.services)) {
        const checkboxes = document.querySelectorAll(
          `input[name="${FORM_ELEMENTS.INPUT_SERVICES}"]`,
        )
        checkboxes.forEach((checkboxElement) => {
          const checkbox = checkboxElement as HTMLInputElement
          if (data.services.includes(checkbox.value)) {
            checkbox.checked = true
          }
        })
      }
    } catch (error) {
      console.error('Failed to load form data', error)
    }
  }

  // Init persistence
  loadFormData()

  // Listen for changes
  const inputs = form?.querySelectorAll('input, select')
  inputs?.forEach((input) => {
    input.addEventListener('input', saveFormData)
    input.addEventListener('change', saveFormData)
  })
})
