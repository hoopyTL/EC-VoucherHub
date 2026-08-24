const CHECKOUT_SELECTION_KEY = 'voucherhub_checkout_selection'

export function readCheckoutSelection(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CHECKOUT_SELECTION_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function saveCheckoutSelection(ids: string[]): void {
  try {
    sessionStorage.setItem(CHECKOUT_SELECTION_KEY, JSON.stringify(ids))
  } catch {
    // Selection still works in memory when browser storage is unavailable.
  }
}

export function clearCheckoutSelection(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_SELECTION_KEY)
  } catch {
    // Ignore restricted storage environments.
  }
}
