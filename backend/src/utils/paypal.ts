const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com'

interface PayPalLink {
  href: string
  rel: string
}

export interface PayPalOrderResponse {
  id: string
  status: string
  links?: PayPalLink[]
  purchase_units?: Array<{
    payments?: { captures?: Array<{ id: string; status: string }> }
  }>
}

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() ?? ''
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() ?? ''
  if (!clientId || !clientSecret) throw new Error('PayPal Sandbox chưa được cấu hình.')
  return { clientId, clientSecret }
}

async function paypalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = credentials()
  const response = await fetch(`${PAYPAL_SANDBOX_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  const data = (await response.json()) as { access_token?: string; error_description?: string }
  if (!response.ok || !data.access_token)
    throw new Error(data.error_description || 'Không thể xác thực PayPal Sandbox.')
  return data.access_token
}

async function paypalRequest(path: string, init: RequestInit): Promise<PayPalOrderResponse> {
  const accessToken = await paypalAccessToken()
  const response = await fetch(`${PAYPAL_SANDBOX_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  })
  const data = (await response.json()) as PayPalOrderResponse & { message?: string }
  if (!response.ok) throw new Error(data.message || `PayPal trả về lỗi HTTP ${response.status}.`)
  return data
}

export function convertVndToUsd(amountVnd: number): string {
  const rate = Number(process.env.PAYPAL_VND_PER_USD ?? 25000)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('PAYPAL_VND_PER_USD không hợp lệ.')
  return Math.max(0.01, amountVnd / rate).toFixed(2)
}

export async function createPayPalOrder(input: {
  orderId: string
  amountVnd: number
}): Promise<{ paypalOrderId: string; approvalUrl: string; amountUsd: string }> {
  const amountUsd = convertVndToUsd(input.amountVnd)
  const returnUrl = process.env.PAYPAL_RETURN_URL || 'http://localhost:5173/payment-result'
  const cancelUrl = process.env.PAYPAL_CANCEL_URL || 'http://localhost:5173/payment-result'
  const data = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    headers: { 'PayPal-Request-Id': `voucherhub-${input.orderId}-${Date.now()}` },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.orderId,
          custom_id: input.orderId,
          description: `VoucherHub order ${input.orderId}`,
          amount: { currency_code: 'USD', value: amountUsd }
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: 'PAY_NOW',
            return_url: `${returnUrl}?paypal_success=true&order_id=${encodeURIComponent(input.orderId)}`,
            cancel_url: `${cancelUrl}?paypal_success=false&order_id=${encodeURIComponent(input.orderId)}`
          }
        }
      }
    })
  })
  const approvalUrl = data.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href
  if (!data.id || !approvalUrl) throw new Error('PayPal không trả về đường dẫn phê duyệt thanh toán.')
  return { paypalOrderId: data.id, approvalUrl, amountUsd }
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  status: string
  captureId: string | null
  rawResponse: PayPalOrderResponse
}> {
  const data = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: { 'PayPal-Request-Id': `voucherhub-capture-${paypalOrderId}` },
    body: '{}'
  })
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0]
  return { status: data.status, captureId: capture?.id ?? null, rawResponse: data }
}
