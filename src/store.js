import { create } from 'zustand';
import { storage } from './lib/storage.js';

export const LIMITS = { ytTitle: 100, ytDesc: 5000, ttCaption: 4000, ytShortsMs: 180_000, ttMs: 600_000 };
const VERSION = 2;

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const tagLine = tags => tags.map(t => '#' + t).join(' ');
export const cleanTag = s => s.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 60);

export function firstLine(s) {
  return (s || '').split('\n').map(l => l.trim()).find(Boolean) || '';
}

/** The text each platform will actually get. */
export function ytTitle(p) {
  if (!p.yt.linked) return p.yt.title;
  let t = firstLine(p.caption).replace(/#\S+/g, '').trim();
  if (t.length > LIMITS.ytTitle) t = t.slice(0, LIMITS.ytTitle - 1).trimEnd() + '…';
  if (t && p.yt.shorts && !/#shorts/i.test(t) && t.length + 8 <= LIMITS.ytTitle) t = (t + ' #Shorts').trim();
  return t;
}
export function ytDesc(p) {
  if (!p.yt.linkedDesc) return p.yt.description;
  const tags = tagLine(p.hashtags);
  return [p.caption.trim(), tags].filter(Boolean).join('\n\n');
}
export function ttCaption(p) {
  if (!p.tt.linked) return p.tt.caption;
  const tags = tagLine(p.hashtags);
  return [p.caption.trim(), tags].filter(Boolean).join('\n\n');
}

export function postState(p) {
  const targets = ['youtube', 'tiktok'].filter(k => p.targets[k]);
  const done = targets.filter(k => p.status[k]);
  if (targets.length && done.length === targets.length) return 'posted';
  if (done.length) return 'partial';
  if (p.scheduledAt) return 'scheduled';
  return 'draft';
}

export function postTitle(p) {
  return ytTitle(p).replace(/#shorts/ig, '').trim() || firstLine(p.caption) || p.video?.name || 'Untitled post';
}

export function newPost(settings) {
  const now = Date.now();
  return {
    id: uid(), createdAt: now, updatedAt: now, video: null, caption: '', hashtags: [],
    yt: { title: '', description: '', linked: true, linkedDesc: true, shorts: settings?.defaultShorts ?? true },
    tt: { caption: '', linked: true },
    targets: { youtube: true, tiktok: true },
    status: { youtube: null, tiktok: null },
    scheduledAt: null, notifId: null
  };
}

const DEFAULT_LIBRARY = {
  sets: [
    { id: 'set1', name: 'Shorts growth', tags: ['shorts', 'viral', 'fyp', 'trending'] },
    { id: 'set2', name: 'Daily vlog', tags: ['vlog', 'dayinmylife', 'dailyvlog', 'lifestyle'] },
    { id: 'set3', name: 'Tutorial', tags: ['tutorial', 'howto', 'tips', 'learnontiktok'] }
  ],
  templates: [
    { id: 'tpl1', name: 'Hook + CTA', text: 'Wait for the end 👀\n\nFollow for part 2!' },
    { id: 'tpl2', name: 'Question', text: 'Would you try this? Tell me in the comments 👇' }
  ]
};

export const DEFAULT_SETTINGS = {
  theme: 'system', sounds: true, haptics: true, defaultShorts: true, reminderLead: 0,
  tiktokApp: 'auto', askAfterShare: true
};

function load() {
  const v = storage.get('dataVersion', 0);
  let posts = storage.get('posts', []);
  if (v < 2) posts = posts.map(p => ({ ...p, yt: { linkedDesc: true, ...p.yt } }));
  return {
    posts,
    library: storage.get('library', DEFAULT_LIBRARY),
    settings: { ...DEFAULT_SETTINGS, ...storage.get('settings', {}) },
    onboarded: storage.get('onboarded', false)
  };
}

let saveT;
function persist(get) {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const s = get();
    storage.set('posts', s.posts);
    storage.set('library', s.library);
    storage.set('settings', s.settings);
    storage.set('dataVersion', VERSION);
  }, 250);
}

export const useStore = create((set, get) => ({
  posts: [], library: DEFAULT_LIBRARY, settings: DEFAULT_SETTINGS, onboarded: false,

  hydrate() { set(load()); },

  finishOnboarding() { storage.set('onboarded', true); set({ onboarded: true }); },

  upsertPost(post) {
    const posts = get().posts;
    const i = posts.findIndex(p => p.id === post.id);
    const next = { ...post, updatedAt: Date.now() };
    set({ posts: i >= 0 ? posts.map(p => (p.id === post.id ? next : p)) : [next, ...posts] });
    persist(get);
    return next;
  },
  patchPost(id, patch) {
    const p = get().posts.find(x => x.id === id);
    if (!p) return;
    return get().upsertPost(typeof patch === 'function' ? patch(p) : { ...p, ...patch });
  },
  removePost(id) {
    const posts = get().posts;
    const idx = posts.findIndex(p => p.id === id);
    const removed = posts[idx];
    set({ posts: posts.filter(p => p.id !== id) });
    persist(get);
    return () => { const cur = get().posts.slice(); cur.splice(Math.max(0, idx), 0, removed); set({ posts: cur }); persist(get); };
  },
  duplicatePost(id) {
    const p = get().posts.find(x => x.id === id);
    if (!p) return;
    const copy = { ...structuredClone(p), id: uid(), createdAt: Date.now(), status: { youtube: null, tiktok: null }, scheduledAt: null, notifId: null };
    set({ posts: [copy, ...get().posts] });
    persist(get);
    return copy;
  },

  setLibrary(fn) { set({ library: fn(get().library) }); persist(get); },
  setSetting(k, v) { set({ settings: { ...get().settings, [k]: v } }); persist(get); },

  importAll(data) {
    if (!data || !Array.isArray(data.posts)) throw new Error('Not a TwinPost backup');
    const ids = new Set(get().posts.map(p => p.id));
    const added = data.posts.filter(p => p && p.id && !ids.has(p.id));
    set({
      posts: [...added, ...get().posts].sort((a, b) => b.createdAt - a.createdAt),
      library: data.library ? mergeLib(get().library, data.library) : get().library
    });
    persist(get);
    return added.length;
  },
  exportAll() {
    const { posts, library } = get();
    return JSON.stringify({ app: 'TwinPost', version: VERSION, exportedAt: new Date().toISOString(),
      posts: posts.map(p => (p.video ? { ...p, video: { ...p.video, thumbnail: undefined } } : p)), library });
  },
  resetAll() {
    set({ posts: [], library: DEFAULT_LIBRARY });
    persist(get);
  }
}));

function mergeLib(a, b) {
  const ids = new Set([...a.sets, ...a.templates].map(x => x.id));
  return {
    sets: [...a.sets, ...(b.sets || []).filter(x => !ids.has(x.id))],
    templates: [...a.templates, ...(b.templates || []).filter(x => !ids.has(x.id))]
  };
}

export function fmtDuration(ms) {
  if (!ms) return '0:00';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function fmtSize(b) {
  if (!b) return '';
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
  return Math.round(b / 1e6) + ' MB';
}
