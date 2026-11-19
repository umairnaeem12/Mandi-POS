import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { DirectionProvider } from '@radix-ui/react-direction';
import App from './App';
import { queryClient } from './lib/queryClient';
import { Toaster } from './components/ui/sonner';
import { useLang } from './stores/lang.store';
import './index.css';

// Subscribing here re-renders the whole tree on a language switch, so plain
// helpers like formatDate() pick up the new locale too.
function Root() {
  const { dir } = useLang();
  return (
    <DirectionProvider dir={dir}>
      <App />
      <Toaster />
    </DirectionProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
);
