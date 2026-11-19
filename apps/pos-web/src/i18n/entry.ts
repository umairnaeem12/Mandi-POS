// One UI string in both languages. Keeping them side by side means a missing
// Arabic translation is a type error, not a blank label.
export interface Entry {
  en: string;
  ar: string;
}

export type Namespace = Record<string, Entry>;
