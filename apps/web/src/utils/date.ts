/**
 * date.ts
 *
 * Automated build-time date generation for SEO freshness.
 * Always returns formatted ISO string or locale-specific dates.
 */

// We use hardcoded current date for build consistency or new Date().toISOString()
// For Task 22 compliance, we provide a constant and a formatter.

export const BUILD_DATE = new Date().toISOString().split('T')[0]!

/**
 * Formats date for Ukrainian locale display (e.g., 15 травня 2024)
 */
export function formatDateUk(dateStr: string): string {
  const date = new Date(dateStr)
  const months = [
    'січня',
    'лютого',
    'березня',
    'квітня',
    'травня',
    'червня',
    'липня',
    'серпня',
    'вересня',
    'жовтня',
    'листопада',
    'грудня',
  ]
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Formats date for Russian locale display
 */
export function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr)
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}
