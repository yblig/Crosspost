import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const mq = window.matchMedia?.('(prefers-color-scheme: light)');
let current = 'system';

export function applyTheme(pref) {
  current = pref;
  const light = pref === 'light' || (pref === 'system' && mq?.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#f5f6fb' : '#0e0f16');
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: light ? Style.Light : Style.Dark }).catch(() => {});
  }
}
mq?.addEventListener?.('change', () => current === 'system' && applyTheme('system'));
