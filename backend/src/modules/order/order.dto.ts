import { z } from 'zod'

export const processPaymentSchema = z.object({
  outcome: z.enum(['SUCCESS', 'FAILURE'], {
    required_error: 'outcome là bắt buộc',
    invalid_type_error: 'outcome phải là SUCCESS hoặc FAILURE'
  })
})

export type ProcessPaymentDto = z.infer<typeof processPaymentSchema>
