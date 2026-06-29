import { create } from 'zustand';

export type Lang = 'en' | 'ar';

const STORAGE_KEY = 'pos.lang';

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: (localStorage.getItem(STORAGE_KEY) as Lang) || 'en',
  setLang: (l) => {
    localStorage.setItem(STORAGE_KEY, l);
    set({ lang: l });
  },
  toggle: () => get().setLang(get().lang === 'en' ? 'ar' : 'en'),
}));

// Pick the best display name for the current language (falls back to English).
export function pickName(lang: Lang, en: string, ar?: string | null): string {
  return lang === 'ar' && ar ? ar : en;
}

// Hook: returns { lang, isAr, dn } where dn(en, ar) resolves the display name.
export function useLang() {
  const lang = useLangStore((s) => s.lang);
  return {
    lang,
    isAr: lang === 'ar',
    dn: (en: string, ar?: string | null) => pickName(lang, en, ar),
  };
}
