import { create } from 'zustand';
import {
  translate,
  translateEnum,
  type EnumGroup,
  type Lang,
  type TKey,
  type TVars,
} from '@/i18n';

export type { Lang };

const STORAGE_KEY = 'pos.lang';

function readStored(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

// dir on <html> flips the whole layout; Radix and sonner get it through props too.
function applyToDocument(lang: Lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const initial = readStored();
applyToDocument(initial);

export const useLangStore = create<LangState>((set, get) => ({
  lang: initial,
  setLang: (l) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // private mode: the choice just won't survive a reload
    }
    applyToDocument(l);
    set({ lang: l });
  },
  toggle: () => get().setLang(get().lang === 'en' ? 'ar' : 'en'),
}));

// Pick the best display name for the current language (falls back to English).
export function pickName(lang: Lang, en: string, ar?: string | null): string {
  return lang === 'ar' && ar ? ar : en;
}

// For code outside React render (toasts in mutation callbacks, plain helpers).
export function t(key: TKey, vars?: TVars): string {
  return translate(useLangStore.getState().lang, key, vars);
}

export function tEnum(group: EnumGroup, value: string | null | undefined): string {
  return translateEnum(useLangStore.getState().lang, group, value);
}

// Hook: subscribes the component to language changes.
// dn(en, ar) resolves a bilingual name, t(key) a UI string, tEnum(group, value) an enum label.
export function useLang() {
  const lang = useLangStore((s) => s.lang);
  return {
    lang,
    isAr: lang === 'ar',
    dir: (lang === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    dn: (en: string, ar?: string | null) => pickName(lang, en, ar),
    t: (key: TKey, vars?: TVars) => translate(lang, key, vars),
    tEnum: (group: EnumGroup, value: string | null | undefined) => translateEnum(lang, group, value),
  };
}
