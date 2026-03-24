import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for debugging blank screens
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error Catch:', { message, source, lineno, colno, error });
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `
      <div style="padding: 20px; color: #ef4444; font-family: sans-serif;">
        <h1 style="font-size: 1.25rem; font-weight: bold;">Something went wrong</h1>
        <p style="font-size: 0.875rem; color: #6b7280; margin-top: 8px;">The application failed to load. Please check the console for details.</p>
        <pre style="margin-top: 16px; padding: 12px; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; font-size: 0.75rem; overflow: auto;">${message}</pre>
        <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Reload Application</button>
      </div>
    `;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
