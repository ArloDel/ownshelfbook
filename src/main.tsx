import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './styles.css';
import { useDataStore } from './store/dataStore';
import { useUiStore } from './store/uiStore';

if (import.meta.env.DEV) {
  // Handy for manual checks from the browser console during development.
  Object.assign(window, { __data: useDataStore, __ui: useUiStore });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
