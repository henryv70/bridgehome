import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@/lib/theme';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from './module_bindings';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppDataProvider } from '@/lib/data';
import App from './App';
import './style.css';

// In development the Vite server proxies SpacetimeDB, so phones on the same
// Wi-Fi (and the Expo app) reach everything through one address.
const sameOrigin = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
const HOST = import.meta.env.DEV ? sameOrigin : (import.meta.env.VITE_SPACETIMEDB_HOST || sameOrigin);
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'bridgehome-3386g';
const TOKEN_KEY = `bridgehome/${DB_NAME}/auth_token`;
// Keep identities created before the proxy was introduced.
const LEGACY_KEY = `ws://localhost:3000/${DB_NAME}/auth_token`;

const connectionBuilder = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(LEGACY_KEY) ?? undefined)
  .onConnect((_conn, _identity, token) => localStorage.setItem(TOKEN_KEY, token))
  .onConnectError((_ctx, err) => console.warn('Could not connect to SpacetimeDB:', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
        <AppDataProvider>
          <TooltipProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <Toaster position="top-center" />
          </TooltipProvider>
        </AppDataProvider>
      </SpacetimeDBProvider>
    </ThemeProvider>
  </StrictMode>,
);
