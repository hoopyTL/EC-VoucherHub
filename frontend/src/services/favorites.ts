const FAVORITES_KEY = 'voucherhub:favorites'

export function getFavoriteVoucherIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function isVoucherFavorite(id: string): boolean {
  return getFavoriteVoucherIds().includes(id)
}

export function toggleVoucherFavorite(id: string): boolean {
  const ids = getFavoriteVoucherIds()
  const favorite = !ids.includes(id)
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorite ? [...ids, id] : ids.filter((item) => item !== id)))
  window.dispatchEvent(new CustomEvent('voucherhub:favorites-changed'))
  return favorite
}
