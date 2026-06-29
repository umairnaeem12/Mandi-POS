import { Toaster as SonnerToaster, toast } from 'sonner';

// App-wide toaster. Mounted once at the root (see main.tsx).
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
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
