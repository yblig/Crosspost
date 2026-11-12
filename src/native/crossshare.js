// Bridge to the in-app Java plugin (android/.../CrossSharePlugin.java),
// with a browser mock so the UI can be previewed on the web.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

const isNative = Capacitor.isNativePlatform();
const Native = registerPlugin('CrossShare');

export const PKG = {
  youtube: ['com.google.android.youtube'],
  tiktok: {
    auto: ['com.ss.android.ugc.trill', 'com.zhiliaoapp.musically', 'com.zhiliaoapp.musically.go', 'com.ss.android.ugc.aweme.lite'],
    global: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'],
    lite: ['com.zhiliaoapp.musically.go', 'com.ss.android.ugc.aweme.lite']
  }
};

function mockThumb(seed = Math.random()) {
  const hues = [[350, 265], [265, 175], [20, 330], [190, 280]];
  const [a, b] = hues[Math.floor(seed * hues.length) % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a},80%,62%)"/><stop offset="1" stop-color="hsl(${b},70%,40%)"/></linearGradient></defs><rect width="180" height="320" fill="url(#g)"/><circle cx="120" cy="90" r="46" fill="#fff" opacity=".18"/><path d="M0 250 Q60 200 110 240 T180 220 V320 H0Z" fill="#000" opacity=".22"/><circle cx="70" cy="170" r="22" fill="#fff" opacity=".85"/><path d="M40 230 q30 -40 60 0" fill="#fff" opacity=".85"/></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

export const crossShare = {
  isNative,

  async pickVideo() {
    if (isNative) {
      const r = await Native.pickVideo();
      return r.cancelled ? null : r;
    }
    // Web preview: pretend we picked a vertical clip.
    const n = Math.floor(Math.random() * 90);
    return {
      uri: 'mock://video/' + Date.now(), name: `VID_2026111${n % 10}_${1000 + n}.mp4`, size: 18_400_000 + n * 91_000,
      durationMs: 23_000 + n * 470, width: 1080, height: 1920, mime: 'video/mp4', thumbnail: mockThumb(Math.random())
    };
  },

  async describe(uri) {
    if (!isNative) return null;
    try { return await Native.describe({ uri }); } catch { return null; }
  },

  async uriOk(uri) {
    if (!isNative) return true;
    try { return (await Native.uriOk({ uri })).ok; } catch { return false; }
  },

  async installed() {
    const all = [...PKG.youtube, ...PKG.tiktok.auto];
    if (!isNative) return Object.fromEntries(all.map(p => [p, p === 'com.google.android.youtube' || p === 'com.ss.android.ugc.trill']));
    try { return await Native.installed({ packages: all }); } catch { return {}; }
  },

  /** Hands the video to `pkg` (or a chooser when pkg is null). */
  async share({ uri, pkg, text, subject }) {
    if (!isNative) { await new Promise(r => setTimeout(r, 200)); return { via: 'mock' }; }
    return Native.shareVideo({ uri, package: pkg || undefined, text, subject, chooserTitle: 'Post with…' });
  },

  async copy(text) {
    try {
      if (isNative) await Clipboard.write({ string: text });
      else await navigator.clipboard.writeText(text);
      return true;
    } catch { return false; }
  },

  async paste() {
    try {
      if (isNative) return (await Clipboard.read()).value || '';
      return await navigator.clipboard.readText();
    } catch { return ''; }
  },

  mockThumb
};

export function pickPackage(installed, platform, tiktokPref = 'auto') {
  const list = platform === 'youtube' ? PKG.youtube : PKG.tiktok[tiktokPref] || PKG.tiktok.auto;
  return list.find(p => installed[p]) || null;
}
