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
import vi from './locales/vi.json'

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi }
  },
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false } // React already escapes
})

export default i18n
