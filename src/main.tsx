import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { LogProvider } from './context/LogContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LogProvider>
        <App />
      </LogProvider>
    </ThemeProvider>
  </StrictMode>,
);
