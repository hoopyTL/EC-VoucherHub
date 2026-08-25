/**
 * i18n setup (Phase 3 — multi-language EN/VI).
 *
 * Initialises react-i18next with two bundled resource namespaces (English +
 * Vietnamese). The active language is persisted in localStorage so the choice
 * survives reloads; English is the default/fallback. Strings are organised by
 * UI area (nav, home, auth, browse, common) — components read them with the
 * `useTranslation()` hook and `t('area.key')`.
 *
 * Only the high-traffic chrome + landing/auth/browse copy is translated here;
 * the pattern scales to the rest of the app by adding keys to both bundles.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import vi from './locales/vi.json'

/** localStorage key for the persisted language choice. */
export const LANG_STORAGE_KEY = 'voucher_system_lang'

/** Supported language codes. */
export type Lang = 'en' | 'vi'

function getInitialLanguage(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY)
    return saved === 'en' || saved === 'vi' ? saved : 'vi'
  } catch {
    return 'vi'
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi }
  },
  lng: getInitialLanguage(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false } // React already escapes
})

/** Change + persist the active language. */
export function setLanguage(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // ignore storage errors
  }
  void i18n.changeLanguage(lang)
}

export default i18n
