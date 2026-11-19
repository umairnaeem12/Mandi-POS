import type { Namespace } from '../entry';

export const login = {
  brandName: { en: 'Mandi Bukhari Restaurant', ar: 'مطعم مندي بخاري' },
  heroTitle: { en: 'Mandi Bukhari POS', ar: 'نظام مندي بخاري لنقاط البيع' },
  heroText: {
    en: 'Manage orders, tables, kitchen, invoices, and sales from one powerful dashboard.',
    ar: 'أدر الطلبات والطاولات والمطبخ والفواتير والمبيعات من لوحة تحكم واحدة متكاملة.',
  },
  featureOrdering: { en: 'Fast table ordering', ar: 'طلبات سريعة للطاولات' },
  featureKitchen: { en: 'Live kitchen updates', ar: 'تحديثات فورية للمطبخ' },
  featureInvoices: { en: 'Professional invoices', ar: 'فواتير احترافية' },
  featureDashboard: { en: 'Real-time sales dashboard', ar: 'لوحة مبيعات لحظية' },
  footer: { en: '© {year} Restaurant POS · v0.1.0', ar: '© {year} نظام نقاط البيع · الإصدار 0.1.0' },

  welcome: { en: 'Welcome back', ar: 'مرحباً بعودتك' },
  signInPrompt: { en: 'Sign in to your account to continue.', ar: 'سجّل الدخول إلى حسابك للمتابعة.' },
  identifier: { en: 'Email or username', ar: 'البريد الإلكتروني أو اسم المستخدم' },
  identifierRequired: { en: 'Email or username is required', ar: 'البريد الإلكتروني أو اسم المستخدم مطلوب' },
  passwordRequired: { en: 'Password is required', ar: 'كلمة المرور مطلوبة' },
  forgotPassword: { en: 'Forgot password?', ar: 'نسيت كلمة المرور؟' },
  forgotPasswordHint: {
    en: 'Contact your administrator to reset your password.',
    ar: 'تواصل مع مسؤول النظام لإعادة تعيين كلمة المرور.',
  },
  showPassword: { en: 'Show password', ar: 'إظهار كلمة المرور' },
  hidePassword: { en: 'Hide password', ar: 'إخفاء كلمة المرور' },
  rememberMe: { en: 'Remember me on this device', ar: 'تذكرني على هذا الجهاز' },
  signIn: { en: 'Sign in', ar: 'تسجيل الدخول' },
  signingIn: { en: 'Signing in…', ar: 'جارٍ تسجيل الدخول…' },
  loginFailed: { en: 'Login failed', ar: 'فشل تسجيل الدخول' },
  devDefault: { en: 'Default: {creds}', ar: 'الافتراضي: {creds}' },
} satisfies Namespace;
