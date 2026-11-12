import { createRoot } from 'react-dom/client';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './theme.css';
import { storage } from './lib/storage.js';
import { native } from './lib/native.js';
import { useStore } from './store.js';
import { loadSounds } from './fx.js';
import { applyTheme } from './theme.js';
import { installDebug } from './debug.js';
import App from './App.jsx';

(async () => {
  await storage.init();
  await native.init();
  useStore.getState().hydrate();
  applyTheme(useStore.getState().settings.theme);
  loadSounds();
  installDebug();
  createRoot(document.getElementById('app')).render(<App />);
  requestAnimationFrame(() => native.hideSplash());
})();
