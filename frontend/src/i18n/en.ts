/**
 * English translation bundle (Phase 3 — i18n).
 *
 * Keys are grouped by UI area. Keep this file and `vi.ts` in lockstep: every
 * key here must exist there.
 */
export const en = {
  nav: {
    home: 'Home',
    browse: 'Browse',
    cart: 'Cart',
    wishlist: 'Wishlist',
    points: 'Points',
    referrals: 'Refer',
    orders: 'Orders',
    myCodes: 'My Codes',
    partnerWorkspace: 'Partner Workspace',
    adminConsole: 'Admin Console',
    account: 'Account',
    logIn: 'Log in',
    logOut: 'Log out',
    signUp: 'Sign up'
  },
  home: {
    eyebrow: 'Discount voucher marketplace',
    titleLine1: 'Deals worth',
    titleLine2: 'sharing.',
    subtitle:
      'Browse and buy discount vouchers from partner restaurants, spas, cinemas and travel brands. Pay securely, get a unique code, redeem in store.',
    browseCta: 'Browse vouchers',
    createAccount: 'Create an account',
    partnerWorkspace: 'Partner workspace',
    adminConsole: 'Admin console',
    statVouchers: 'Curated vouchers',
    statPartners: 'Trusted partners',
    statCategories: 'Categories',
    statCheckout: 'Secure checkout'
  },
  auth: {
    accountEyebrow: 'Account',
    welcomeBack: 'Welcome back',
    welcomeSubtitle: 'Enter your credentials to continue.',
    emailOrPhone: 'Email or phone',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    logIn: 'Log in',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    loginRequiredNotice: 'Please log in to continue to that page.'
  },
  browse: {
    title: 'Browse vouchers',
    subtitle: 'Find a deal across food, spa, entertainment, travel and more.',
    searchPlaceholder: 'Search vouchers…',
    emptyResults: 'No vouchers match your search. Try adjusting the filters.'
  },
  common: {
    loading: 'Loading…',
    retry: 'Retry',
    save: 'Save',
    saved: 'Saved',
    language: 'Language'
  }
}

/** Structural type of the translation bundle (string leaves, not literals). */
export type TranslationBundle = typeof en
export default en
