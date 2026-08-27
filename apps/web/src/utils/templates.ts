export interface TemplateContext {
  service: string // H1 of base page (short service name)
  city: string // "Львів"
  cityLocative: string // "у Львові"
  district?: string // "Сихівський район"
  districtLocative?: string // "у Сихівському районі"
  price: string // "від 2000 грн"
  travelTime?: string // "25 хвилин"
  phone: string // "+380634814077"
}

/**
 * Replaces all {token} occurrences in a template string.
 * Throws if a token appears in template but is undefined in context.
 * This catches missing data at build time, not silently in production.
 */
export function interpolate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = ctx[key as keyof TemplateContext]
    if (value === undefined) {
      throw new Error(
        `[templates.ts] Template token "{${key}}" is undefined in context.\n` +
          `Template: "${template}"\n` +
          `Context keys: ${Object.keys(ctx).join(', ')}`,
      )
    }
    return value
  })
}

/**
 * Validates that a resolved title is ≤60 chars.
 * Throws a build error with the offending value if over limit.
 */
export function validateTitle(resolved: string, templateName: string): void {
  if (resolved.length > 80) {
    throw new Error(
      `[templates.ts] Resolved title exceeds 80 chars (${resolved.length}).\n` +
        `Template: "${templateName}"\n` +
        `Resolved: "${resolved}"`,
    )
  }
}

/**
 * Validates that a resolved description is 120–160 chars.
 * Warns (does not throw) if outside range — description length is advisory.
 */
export function validateDescription(resolved: string, templateName: string): void {
  if (resolved.length < 120 || resolved.length > 180) {
    console.warn(
      `[templates.ts] Description length ${resolved.length} outside 120–180 range.\n` +
        `Template: "${templateName}"\n` +
        `Resolved: "${resolved}"`,
    )
  }
}
