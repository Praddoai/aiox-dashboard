import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize theme early to prevent flash of unstyled content
const initTheme = () => {
  const stored = localStorage.getItem('aios-ui-store');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      const theme = state?.theme;
      if (theme === 'glass' || theme === 'matrix' || theme === 'aiox') {
        // Glass, Matrix & AIOX need .dark class + data-theme attribute
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', theme);
      } else if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch {
      // Ignore parse errors
    }
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
};

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
