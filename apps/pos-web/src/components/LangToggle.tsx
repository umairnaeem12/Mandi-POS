import { useLangStore } from '@/stores/lang.store';
import { cn } from '@/lib/utils';

// Compact EN / ع switch for the header.
export function LangToggle() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <div className="flex items-center rounded-md border bg-card p-0.5 text-xs font-semibold">
      <button
        onClick={() => setLang('en')}
        className={cn('rounded px-2 py-1 transition-colors', lang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
      >
        EN
      </button>
      <button
        onClick={() => setLang('ar')}
        className={cn('rounded px-2 py-1 transition-colors', lang === 'ar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
      >
        ع
      </button>
    </div>
  );
}
