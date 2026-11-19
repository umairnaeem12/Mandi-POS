import { useEffect, useState } from 'react';
import { intlLocale } from '@/i18n';
import { useLang } from '@/stores/lang.store';

// Live date/time for the header.
export function Clock() {
  const [now, setNow] = useState(new Date());
  const locale = intlLocale(useLang().lang);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden text-end md:block">
      <div className="text-sm font-semibold tabular-nums text-foreground">
        {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {now.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}
