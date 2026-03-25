import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { CollaborationProvider } from './services/collaborationContext';
import { TourProvider } from './contexts/TourContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CollaborationProvider>
        <TourProvider>
          <App />
        </TourProvider>
      </CollaborationProvider>
    </BrowserRouter>
  </StrictMode>,
);
