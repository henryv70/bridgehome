import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@/lib/theme';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from './module_bindings';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppDataProvider } from '@/lib/data';
import { LanguageProvider } from '@/lib/i18n';
import { LanguageSync } from '@/components/app/language';
import { DB_NAME, HOST, TOKEN_KEY, storedToken } from '@/lib/session';
import App from './App';
import './style.css';

const connectionBuilder = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(storedToken())
  .onConnect((_conn, _identity, token) => localStorage.setItem(TOKEN_KEY, token))
  .onConnectError((_ctx, err) => console.warn('Could not connect to SpacetimeDB:', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
        <AppDataProvider>
          <LanguageProvider>
          <LanguageSync />
          <TooltipProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <Toaster position="top-center" />
          </TooltipProvider>
          </LanguageProvider>
        </AppDataProvider>
      </SpacetimeDBProvider>
    </ThemeProvider>
  </StrictMode>,
);
