import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutList, Hash, Settings as Gear, Plus } from 'lucide-react';
import { useStore } from './store.js';
import { native } from './lib/native.js';
import { fx } from './fx.js';
import { ToastHost } from './components/ui.jsx';
import { reminders } from './native/reminders.js';
import Onboarding from './screens/Onboarding.jsx';
import Posts from './screens/Posts.jsx';
import Library from './screens/Library.jsx';
import Settings from './screens/Settings.jsx';
import Composer from './screens/Composer.jsx';
import Publish from './screens/Publish.jsx';
import { applyTheme } from './theme.js';

const NavCtx = createContext(null);
export const useNav = () => useContext(NavCtx);

const SCREENS = { composer: Composer, publish: Publish };
const TABS = [
  { id: 'posts', label: 'Posts', icon: LayoutList },
  { id: 'library', label: 'Library', icon: Hash },
  { id: 'settings', label: 'Settings', icon: Gear }
];

export default function App() {
  const onboarded = useStore(s => s.onboarded);
  const theme = useStore(s => s.settings.theme);
  const [tab, setTabRaw] = useState('posts');
  const [stack, setStack] = useState([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => applyTheme(theme), [theme]);

  const push = useCallback((screen, props = {}) => { fx('tap'); setStack(s => [...s, { screen, props, key: Date.now() + Math.random() }]); }, []);
  const replace = useCallback((screen, props = {}) => setStack(s => [...s.slice(0, -1), { screen, props, key: Date.now() + Math.random() }]), []);
  const pop = useCallback(() => { fx('back'); setStack(s => s.slice(0, -1)); }, []);
  const setTab = useCallback(t => { fx('tap'); setTabRaw(t); }, []);
  const nav = { push, pop, replace, setTab, tab, depth: stack.length };

  // Back: stack first (sheets register their own handlers above this), then tabs.
  useEffect(() => native.onBack(() => {
    if (stackRef.current.length) { pop(); return true; }
    return false;
  }), [pop]);
  useEffect(() => native.onBack(() => {
    if (!stackRef.current.length && tabRef.current !== 'posts') { setTab('posts'); return true; }
    return false;
  }), [setTab]);
  // Tapping a reminder opens that post's publish screen.
  useEffect(() => {
    reminders.onOpen(postId => {
      if (useStore.getState().posts.some(p => p.id === postId)) setStack([{ screen: 'publish', props: { id: postId }, key: Date.now() }]);
    });
  }, []);

  useEffect(() => { window.__nav = nav; });

  if (!onboarded) return <ToastHost><Onboarding /></ToastHost>;

  const TabScreen = { posts: Posts, library: Library, settings: Settings }[tab];

  return (
    <NavCtx.Provider value={nav}>
      <ToastHost>
        <div className="shell">
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div key={tab} className="screen"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <TabScreen />
              </motion.div>
            </AnimatePresence>
          </div>
          <nav className="tabbar">
            {TABS.map(t => {
              const Ic = t.icon;
              return (
                <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => tab !== t.id && setTab(t.id)}>
                  <span className="ind"><Ic size={21} strokeWidth={tab === t.id ? 2.5 : 2} /></span>
                  {t.label}
                </button>
              );
            })}
          </nav>
          <AnimatePresence>
            {tab === 'posts' && !stack.length && (
              <motion.button className="fab" onClick={() => push('composer', {})}
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', damping: 16, stiffness: 300 }} whileTap={{ scale: 0.93 }}>
                <Plus size={22} strokeWidth={2.8} /> New post
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {stack.map((s, i) => {
              const C = SCREENS[s.screen];
              return (
                <motion.div key={s.key} className="screen" style={{ zIndex: 10 + i, boxShadow: '-20px 0 40px rgba(0,0,0,.25)' }}
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 32, stiffness: 320 }}>
                  <C {...s.props} active={i === stack.length - 1} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ToastHost>
    </NavCtx.Provider>
  );
}
