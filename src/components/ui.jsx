import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { native } from '../lib/native.js';
import { fx } from '../fx.js';

/** Registers an Android back handler while `active`. */
export function useBack(active, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return native.onBack(() => { ref.current(); return true; });
  }, [active]);
}

export function Sheet({ open, onClose, title, children, footer }) {
  useBack(open, () => { fx('back'); onClose(); });
  useEffect(() => { if (open) fx('open'); }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="backdrop" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div className="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 330 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}>
            <div className="grab" />
            {title && <h3>{title}</h3>}
            <div className="scroll" style={{ flex: 'initial', margin: '0 -16px', padding: '0 16px' }}
              onPointerDownCapture={e => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div style={{ paddingTop: 14 }}>{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Dialog({ open, onClose, title, body, actions, icon }) {
  useBack(open, () => onClose?.());
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="backdrop" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="dialog" style={{ y: '-50%' }}
            initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 340 }}>
            {icon && <div style={{ marginBottom: 12 }}>{icon}</div>}
            <h3>{title}</h3>
            {body && <p>{body}</p>}
            <div style={{ display: 'flex', gap: 10 }}>{actions}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, action) => {
    clearTimeout(timer.current);
    setT({ msg, action, key: Date.now() });
    timer.current = setTimeout(() => setT(null), action ? 4500 : 2200);
  }, []);
  useEffect(() => { native.toast = msg => show(msg); }, [show]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <AnimatePresence>
        {t && (
          <motion.div key={t.key} className="toast"
            initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 380 }}>
            <span className="grow">{t.msg}</span>
            {t.action && <button onClick={() => { t.action.fn(); setT(null); fx('tap'); }}>{t.action.label}</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}

export function Toggle({ on, onChange }) {
  return <button className={'toggle' + (on ? ' on' : '')} aria-pressed={on}
    onClick={e => { e.stopPropagation(); fx('toggle'); onChange(!on); }} />;
}

export function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff6b85" /><stop offset="1" stopColor="#ff3d62" /></linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8f74ff" /><stop offset="1" stopColor="#22e3d6" /></linearGradient>
      </defs>
      <rect x="6" y="6" width="34" height="34" rx="11" fill="url(#lg1)" />
      <rect x="22" y="22" width="36" height="36" rx="12" fill="url(#lg2)" stroke="var(--bg)" strokeWidth="4" />
      <path d="M35 32.5v15l12-7.5z" fill="#fff" strokeLinejoin="round" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function PlatformIcon({ p, size = 18 }) {
  // Generic marks (not the platforms' logos): a play-screen for YouTube, a note for TikTok.
  if (p === 'youtube') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="4.5" fill="currentColor" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="var(--icon-fg, #fff)" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3v11.2a3.8 3.8 0 1 1-3.3-3.77" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14 3c.4 2.6 2.4 4.6 5 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export const PLATFORM = {
  youtube: { name: 'YouTube', cls: 'yt', color: 'var(--yt)' },
  tiktok: { name: 'TikTok', cls: 'tt', color: 'var(--tt)' }
};

export function Ring({ value, size = 64, stroke = 7, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff4d6d" /><stop offset=".6" stopColor="#7c5cff" /><stop offset="1" stopColor="#22e3d6" /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface2)" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ringg)" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={false} animate={{ strokeDashoffset: c * (1 - value) }} transition={{ type: 'spring', damping: 20, stiffness: 90 }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}

export function CountUp({ value, duration = 700 }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current;
    let raf;
    const step = t => {
      const k = Math.min(1, (t - start) / duration), e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{v}</>;
}

export function Confetti({ fire }) {
  const ref = useRef();
  useEffect(() => {
    if (!fire) return;
    const cv = ref.current, ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.offsetWidth * dpr; cv.height = cv.offsetHeight * dpr;
    const W = cv.width, H = cv.height;
    const cols = ['#ff4d6d', '#7c5cff', '#22e3d6', '#ffb547', '#ffffff'];
    const parts = Array.from({ length: 140 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.2, y: H * 0.42,
      vx: (Math.random() - 0.5) * 22 * dpr, vy: (-Math.random() * 20 - 8) * dpr,
      r: (Math.random() * 5 + 4) * dpr, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4,
      c: cols[i % cols.length], shape: i % 3
    }));
    let raf, t0 = performance.now();
    const tick = t => {
      const age = (t - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.55 * dpr; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0, 1 - age / 2.6);
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.6, 0, 7); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r, p.r); ctx.lineTo(-p.r, p.r); ctx.fill(); }
        ctx.restore();
      }
      if (age < 2.8) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire]);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 70 }} />;
}

export function Thumb({ video, w = 64, h = 86, r = 14, children }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, flex: 'none', overflow: 'hidden', position: 'relative',
      background: 'var(--grad-soft), var(--surface2)', display: 'grid', placeItems: 'center' }}>
      {video?.thumbnail
        ? <img src={video.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <svg width={w * 0.38} height={w * 0.38} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4-2.5z" fill="var(--muted)" /></svg>}
      {children}
    </div>
  );
}
