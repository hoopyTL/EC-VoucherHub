import { createHash } from 'node:crypto'

export function cleanText(value: string | undefined | null): string | undefined {
  const result = value
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
  return result || undefined
}

export function normalizeUrl(value: string, baseUrl: string): string {
  return new URL(value, baseUrl).toString()
}

export function deterministicExternalId(source: string, sourceUrl: string): string {
  return createHash('sha256').update(`${source}:${sourceUrl}`).digest('hex')
}

export function parseVnd(value: string | undefined): number | undefined {
  if (!value) return undefined
  const compact = value.replace(/\s/g, '')
  const match = compact.match(/(?:₫|VND|đ)([\d.,]+)/i) ?? compact.match(/([\d.,]+)(?:₫|VND|đ)/i)
  if (!match) return undefined
  const digits = match[1].replace(/[^\d]/g, '')
  return digits ? Number(digits) : undefined
}

export function parsePercentage(value: string | undefined): number | undefined {
  const match = value?.match(/(?:giảm\s*)?(\d{1,3})\s*%/i)
  if (!match) return undefined
  const result = Number(match[1])
  return result >= 0 && result <= 100 ? result : undefined
}

export function parseVietnameseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (!match) return undefined
  const result = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
  return Number.isNaN(result.getTime()) ? undefined : result
}
