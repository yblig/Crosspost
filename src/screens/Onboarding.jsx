import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../store.js';
import { fx } from '../fx.js';
import { Logo } from '../components/ui.jsx';
import { IllusCompose, IllusTwo, IllusTrack } from '../components/art.jsx';

const SLIDES = [
  { art: IllusCompose, title: 'Write it once', body: 'Pick a clip, write one caption and your hashtags. TwinPost shapes it for each platform with live character limits.' },
  { art: IllusTwo, title: 'Post it twice', body: 'One tap sends the video to YouTube, one tap to TikTok — your title and caption are already copied, ready to paste.' },
  { art: IllusTrack, title: 'Never miss one', body: 'Drafts, scheduled reminders and a ✓ per platform, so you always know what went up where.' }
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const finish = useStore(s => s.finishOnboarding);
  const S = SLIDES[i];
  const next = () => { if (i < SLIDES.length - 1) { fx('tap'); setI(i + 1); } else { fx('save'); finish(); } };

  return (
    <div className="screen" style={{ paddingTop: 'calc(var(--st) + 12px)', paddingBottom: 'calc(var(--sb) + 20px)' }}>
      <div className="row" style={{ padding: '0 20px', height: 48 }}>
        <Logo size={34} />
        <b style={{ font: '700 20px var(--display)', letterSpacing: -0.4 }}>TwinPost</b>
        <span className="grow" />
        {i < SLIDES.length - 1 && <button className="muted" style={{ fontWeight: 700, padding: 10 }} onClick={() => { fx('tap'); finish(); }}>Skip</button>}
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div key={i} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}
            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) next();
              else if (info.offset.x > 60 && i > 0) { fx('tap'); setI(i - 1); }
            }}>
            <motion.div style={{ display: 'flex', justifyContent: 'center' }}
              animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              <S.art />
            </motion.div>
            <h1 className="bigtitle" style={{ marginTop: 26, fontSize: 34 }}>
              {S.title.split(' ').slice(0, -1).join(' ')} <span className="gradtext">{S.title.split(' ').slice(-1)}</span>
            </h1>
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.55, marginTop: 12 }}>{S.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="row" style={{ padding: '0 20px', gap: 16 }}>
        <div className="row" style={{ gap: 6 }}>
          {SLIDES.map((_, k) => (
            <motion.span key={k} animate={{ width: k === i ? 26 : 8, opacity: k === i ? 1 : 0.35 }}
              style={{ height: 8, borderRadius: 8, background: k === i ? 'var(--brand2)' : 'var(--muted)', display: 'block' }} />
          ))}
        </div>
        <span className="grow" />
        <button className="btn primary" onClick={next} style={{ minWidth: 150 }}>
          {i < SLIDES.length - 1 ? 'Next' : 'Get started'} <ArrowRight size={19} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
