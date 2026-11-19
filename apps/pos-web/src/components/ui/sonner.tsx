import { Toaster as SonnerToaster, toast } from 'sonner';
import { useLang } from '@/stores/lang.store';

// App-wide toaster. Mounted once at the root (see main.tsx).
export function Toaster() {
  const { dir } = useLang();
  return (
    <SonnerToaster
      dir={dir}
      position={dir === 'rtl' ? 'top-left' : 'top-right'}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border shadow-card font-sans',
        },
      }}
    />
  );
}

export { toast };
