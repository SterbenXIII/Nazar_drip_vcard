export const DISTRICTS = [
  'Центр',
  'Сихів',
  'Франківський',
  'Личаківський',
  'Шевченківський',
  'Залізничний',
  'За місто (обговорюється)',
] as const

export type District = (typeof DISTRICTS)[number]
