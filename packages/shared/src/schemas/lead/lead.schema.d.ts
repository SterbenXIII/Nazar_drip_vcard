import { type z } from 'zod'
export declare const leadSchema: z.ZodObject<
  {
    name: z.ZodString
    phone: z.ZodString
    district: z.ZodEnum<{
      Центр: 'Центр'
      Сихів: 'Сихів'
      Франківський: 'Франківський'
      Личаківський: 'Личаківський'
      Шевченківський: 'Шевченківський'
      Залізничний: 'Залізничний'
      '\u0417\u0430 \u043C\u0456\u0441\u0442\u043E (\u043E\u0431\u0433\u043E\u0432\u043E\u0440\u044E\u0454\u0442\u044C\u0441\u044F)': 'За місто (обговорюється)'
    }>
    services: z.ZodArray<z.ZodString>
    source: z.ZodOptional<z.ZodString>
    turnstileToken: z.ZodOptional<z.ZodString>
  },
  z.core.$strip
>
export type LeadPayload = z.infer<typeof leadSchema>
//# sourceMappingURL=lead.schema.d.ts.map
