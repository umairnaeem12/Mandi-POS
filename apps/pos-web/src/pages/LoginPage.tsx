import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ChefHat,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  Loader2,
  Lock,
  User,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { t as tr, useLang } from '@/stores/lang.store';
import type { TKey } from '@/i18n';
import { landingPath } from '@/lib/landing';
import { LangToggle } from '@/components/LangToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

// Messages are i18n keys, translated at render so they follow the language toggle.
const schema = z.object({
  identifier: z.string().min(1, 'login.identifierRequired' satisfies TKey),
  password: z.string().min(1, 'login.passwordRequired' satisfies TKey),
  rememberMe: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

const FEATURES: { icon: typeof Zap; text: TKey }[] = [
  { icon: Zap, text: 'login.featureOrdering' },
  { icon: ChefHat, text: 'login.featureKitchen' },
  { icon: FileText, text: 'login.featureInvoices' },
  { icon: LayoutDashboard, text: 'login.featureDashboard' },
];

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const { t, isAr } = useLang();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // Seed credentials are pre-filled only in local dev; the deployed site is public.
    defaultValues: {
      identifier: import.meta.env.DEV ? 'admin@restaurant.local' : '',
      password: import.meta.env.DEV ? 'admin123' : '',
      rememberMe: true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.identifier, values.password);
      navigate(landingPath(useAuthStore.getState().user), { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : tr('login.loginFailed');
      setServerError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-slate-900 lg:flex lg:flex-col">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-primary/40" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <span className="text-lg font-bold">{t('login.brandName')}</span>
          </div>

          <div className="max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-4xl font-extrabold leading-tight tracking-tight"
            >
              {t('login.heroTitle')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="mt-4 text-lg text-slate-300"
            >
              {t('login.heroText')}
            </motion.p>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: isAr ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 + i * 0.07 }}
                  className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 backdrop-blur-sm ring-1 ring-white/10"
                >
                  <f.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{t(f.text)}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-400">{t('login.footer', { year: new Date().getFullYear() })}</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="relative flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="absolute end-4 top-4">
          <LangToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          {/* Mobile brand */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">{t('shell.appName')}</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">{t('login.welcome')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('login.signInPrompt')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">{t('login.identifier')}</Label>
              <div className="relative">
                <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="identifier"
                  autoFocus
                  dir="ltr"
                  className="px-9"
                  placeholder="admin@restaurant.local"
                  {...register('identifier')}
                />
              </div>
              {errors.identifier && (
                <p className="text-xs text-destructive">{t(errors.identifier.message as TKey)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('common.password')}</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setServerError(t('login.forgotPasswordHint'))}
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  className="px-9"
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{t(errors.password.message as TKey)}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                {...register('rememberMe')}
              />
              {t('login.rememberMe')}
            </label>

            {serverError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('login.signingIn')}
                </>
              ) : (
                t('login.signIn')
              )}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              {t('login.devDefault', { creds: 'admin@restaurant.local / admin123' })}
            </p>
          )}

        </motion.div>
      </div>
    </div>
  );
}
