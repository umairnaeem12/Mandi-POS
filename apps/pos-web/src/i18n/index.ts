import { billing } from './ns/billing';
import { categories } from './ns/categories';
import { common } from './ns/common';
import { customers } from './ns/customers';
import { dashboard } from './ns/dashboard';
import { enums } from './ns/enums';
import { inventory } from './ns/inventory';
import { invoices } from './ns/invoices';
import { kitchen } from './ns/kitchen';
import { login } from './ns/login';
import { menu } from './ns/menu';
import { orders } from './ns/orders';
import { pos } from './ns/pos';
import { reports } from './ns/reports';
import { roles } from './ns/roles';
import { settings } from './ns/settings';
import { shell } from './ns/shell';
import { staff } from './ns/staff';
import { tables } from './ns/tables';
import type { Entry } from './entry';

export type Lang = 'en' | 'ar';

const dict = {
  billing,
  categories,
  common,
  customers,
  dashboard,
  enums,
  inventory,
  invoices,
  kitchen,
  login,
  menu,
  orders,
  pos,
  reports,
  roles,
  settings,
  shell,
  staff,
  tables,
};

type Dict = typeof dict;

// 'namespace.key', checked at compile time, so a typo fails the build.
export type TKey = { [N in keyof Dict]: `${N}.${keyof Dict[N] & string}` }[keyof Dict];

export type TVars = Record<string, string | number>;

function lookup(key: string): Entry | undefined {
  const dot = key.indexOf('.');
  const ns = dict[key.slice(0, dot) as keyof Dict] as Record<string, Entry> | undefined;
  return ns?.[key.slice(dot + 1)];
}

function interpolate(text: string, vars?: TVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function translate(lang: Lang, key: TKey, vars?: TVars): string {
  const entry = lookup(key);
  return entry ? interpolate(entry[lang], vars) : key;
}

export type EnumGroup =
  | 'orderStatus'
  | 'paymentStatus'
  | 'tableStatus'
  | 'orderType'
  | 'paymentMethod'
  | 'discountType'
  | 'staffStatus'
  | 'unit'
  | 'stockTx'
  | 'role'
  | 'module';

// Label for a backend enum value or seeded role name; unknown values pass through as-is.
export function translateEnum(lang: Lang, group: EnumGroup, value: string | null | undefined): string {
  if (!value) return '';
  const entry = lookup(`enums.${group}.${value}`);
  return entry ? entry[lang] : value;
}

// Intl locale for dates and numbers. Arabic keeps Western digits (0-9) on purpose.
export function intlLocale(lang: Lang): string | undefined {
  return lang === 'ar' ? 'ar-u-nu-latn' : undefined;
}
