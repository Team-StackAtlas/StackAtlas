import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { LogProvider } from './context/LogContext';
import { ToastProvider } from './components/ui/ToastProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <LogProvider>
          <App />
        </LogProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
