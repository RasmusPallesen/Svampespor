import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import { App } from './App';

/**
 * `registerType: 'autoUpdate'` (vite.config.ts) installerer en ny service
 * worker i baggrunden og kalder selv skipWaiting — men uden dette lytter
 * ingen efter, hvornår den rent faktisk overtager siden. Uden det er man
 * altid én genindlæsning bagud: første genindlæsning efter en udrulning
 * henter bare den nye SW, kun den ANDEN får glæde af den. For en app under
 * aktiv, ugentlig udvikling er det forskellen på "rettelsen virker ikke"
 * og "rettelsen virker" — samme browserfane, ingen ekstra klik.
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Fandt ikke #root i index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
