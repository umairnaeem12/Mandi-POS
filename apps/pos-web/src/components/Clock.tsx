import { useEffect, useState } from 'react';

// Live date/time for the header.
export function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden text-right md:block">
      <div className="text-sm font-semibold tabular-nums text-foreground">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}
