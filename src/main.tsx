import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1e3a8a', color: '#fff', fontWeight: 'bold' } }} />
      <App />
    </ConfirmProvider>
  </StrictMode>,
);
