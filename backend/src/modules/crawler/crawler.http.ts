const USER_AGENT = 'VoucherHubCrawler/1.0 (+educational project; public promotions only)'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchPublicHtml(url: string, attempts = 2): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(15_000)
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.text()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await delay(750 * attempt)
    }
  }
  throw lastError
}
