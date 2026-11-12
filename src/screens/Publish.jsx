import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Pencil, Copy, Check, ExternalLink, AlertTriangle, ChevronDown, PartyPopper, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { App as CapApp } from '@capacitor/app';
import { useStore, ytTitle, ytDesc, ttCaption, postTitle, fmtDuration } from '../store.js';
import { useNav } from '../App.jsx';
import { fx } from '../fx.js';
import { crossShare, pickPackage } from '../native/crossshare.js';
import { reminders } from '../native/reminders.js';
import { Thumb, Ring, PlatformIcon, Confetti, Dialog, useToast, useBack, PLATFORM } from '../components/ui.jsx';

export default function Publish({ id, active }) {
  const nav = useNav();
  const toast = useToast();
  const post = useStore(s => s.posts.find(p => p.id === id));
  const patchPost = useStore(s => s.patchPost);
  const settings = useStore(s => s.settings);
  const [installed, setInstalled] = useState({});
  const [videoOk, setVideoOk] = useState(true);
  const [ask, setAsk] = useState(null);
  const [celebrate, setCelebrate] = useState(0);
  const pending = useRef(null);
  useBack(active, () => nav.pop());

  useEffect(() => { crossShare.installed().then(setInstalled); }, []);
  useEffect(() => { if (post?.video) crossShare.uriOk(post.video.uri).then(setVideoOk); }, [post?.video?.uri]);

  // When the person comes back from YouTube/TikTok, ask whether it went up.
  useEffect(() => {
    const onBackIn = () => {
      const p = pending.current;
      if (!p) return;
      pending.current = null;
      if (useStore.getState().settings.askAfterShare) setTimeout(() => setAsk(p), 350);
    };
    let h;
    if (crossShare.isNative) CapApp.addListener('resume', onBackIn).then(x => (h = x));
    const vis = () => !document.hidden && !crossShare.isNative && onBackIn();
    document.addEventListener('visibilitychange', vis);
    return () => { h?.remove(); document.removeEventListener('visibilitychange', vis); };
  }, []);

  if (!post) return (
    <div className="screen" style={{ display: 'grid', placeItems: 'center' }}>
      <button className="btn soft" onClick={() => nav.pop()}>Post not found — go back</button>
    </div>
  );

  const targets = ['youtube', 'tiktok'].filter(k => post.targets[k]);
  const done = targets.filter(k => post.status[k]).length;
  const allDone = targets.length > 0 && done === targets.length;

  const mark = (platform, on) => {
    const updated = patchPost(post.id, p => ({ ...p, status: { ...p.status, [platform]: on ? Date.now() : null } }));
    if (!on) { fx('back'); return; }
    const nowDone = targets.filter(k => updated.status[k]).length;
    if (nowDone === targets.length) {
      fx('win'); setCelebrate(c => c + 1);
      if (updated.notifId) { reminders.cancel(updated.notifId); patchPost(post.id, { notifId: null }); }
    } else fx('posted');
  };

  const copy = async (text, what) => {
    const ok = await crossShare.copy(text);
    if (ok) { fx('copy'); toast(`${what} copied`); } else { fx('error'); toast('Could not copy'); }
  };

  const send = async platform => {
    if (!videoOk) { fx('error'); toast('Video not found — pick it again in Edit'); return; }
    const text = platform === 'youtube' ? ytTitle(post) : ttCaption(post);
    await crossShare.copy(text);
    const pkg = pickPackage(installed, platform, settings.tiktokApp);
    fx('send');
    try {
      pending.current = platform;
      const r = await crossShare.share({
        uri: post.video.uri, pkg,
        text: platform === 'youtube' ? ytDesc(post) : ttCaption(post),
        subject: platform === 'youtube' ? ytTitle(post) : ''
      });
      if (r?.via === 'chooser') toast(`${PLATFORM[platform].name} app not found — pick an app`);
      else if (r?.via === 'mock') { toast(`${platform === 'youtube' ? 'Title' : 'Caption'} copied · opening ${PLATFORM[platform].name}…`); setTimeout(() => { pending.current = null; setAsk(platform); }, 900); }
      else toast(`${platform === 'youtube' ? 'Title' : 'Caption'} copied — paste it in ${PLATFORM[platform].name}`);
    } catch (e) {
      pending.current = null; fx('error'); toast(e?.message || 'Could not open the app');
    }
  };

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav.pop()} aria-label="Back"><ArrowLeft size={21} /></button>
        <h2>Publish</h2>
        <button className="iconbtn" onClick={() => nav.push('composer', { id: post.id })} aria-label="Edit"><Pencil size={19} /></button>
      </div>

      <div className="scroll" style={{ padding: '4px 16px calc(var(--sb) + 30px)' }}>
        <div className="card row" style={{ gap: 14, padding: 12, background: 'var(--grad-soft), var(--surface)' }}>
          <Thumb video={post.video} w={66} h={92} r={14} />
          <div className="grow">
            <div style={{ fontWeight: 750, fontSize: 15.5, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{postTitle(post)}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              {post.video ? fmtDuration(post.video.durationMs) : 'No video'}
              {post.scheduledAt ? ' · planned ' + format(post.scheduledAt, 'd MMM HH:mm') : ''}
            </div>
          </div>
          <Ring value={targets.length ? done / targets.length : 0} size={62}>
            <span style={{ font: '700 16px var(--display)' }}>{done}/{targets.length}</span>
          </Ring>
        </div>

        {!videoOk && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 14, borderRadius: 16, background: 'var(--warn-soft)', color: 'var(--warn)', fontWeight: 600, fontSize: 13.5, lineHeight: 1.45 }}>
            <AlertTriangle size={18} style={{ flex: 'none' }} />
            <span className="grow">TwinPost can't open this video anymore (it may have been moved or deleted). Tap Edit and pick it again.</span>
          </div>
        )}

        <AnimatePresence>
          {allDone && (
            <motion.div initial={{ opacity: 0, scale: 0.9, height: 0 }} animate={{ opacity: 1, scale: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 260 }}>
              <div className="card row" style={{ marginTop: 12, gap: 12, background: 'var(--ok-soft)', boxShadow: 'none' }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--ok)', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }}><PartyPopper size={22} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 800, fontFamily: 'var(--display)', fontSize: 17 }}>Crossposted!</div>
                  <div className="muted" style={{ fontSize: 13 }}>Live on {targets.map(t => PLATFORM[t].name).join(' and ')}.</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {targets.length === 0 && <p className="muted" style={{ textAlign: 'center', marginTop: 30 }}>Both platforms are off for this post. Tap ✎ to turn one on.</p>}

        {targets.map((k, i) => (
          <PlatformCard key={k} platform={k} post={post} step={i + 1}
            appFound={!!pickPackage(installed, k, settings.tiktokApp)}
            onSend={() => send(k)} onCopy={copy} onMark={on => mark(k, on)} />
        ))}

        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, textAlign: 'center', margin: '18px 10px 0' }}>
          TwinPost opens the official app with your video and copies your text. Long-press the title or caption box there and tap <b>Paste</b>.
        </p>
      </div>

      <Confetti fire={celebrate} />

      <Dialog open={!!ask} onClose={() => setAsk(null)}
        icon={ask && <span className={'pill ' + PLATFORM[ask].cls} style={{ height: 34, padding: '0 12px', fontSize: 13, '--icon-fg': 'var(--surface)' }}><PlatformIcon p={ask} size={17} /> {PLATFORM[ask].name}</span>}
        title={ask ? `Did it go up on ${PLATFORM[ask].name}?` : ''}
        body="Mark it so you can see at a glance what's been posted where."
        actions={<>
          <button className="btn soft" style={{ flex: 1 }} onClick={() => { fx('tap'); setAsk(null); }}>Not yet</button>
          <button className="btn primary" style={{ flex: 1.4 }} onClick={() => { const a = ask; setAsk(null); mark(a, true); }}><Check size={18} strokeWidth={3} /> Posted</button>
        </>} />
    </>
  );
}

function PlatformCard({ platform, post, step, appFound, onSend, onCopy, onMark }) {
  const [open, setOpen] = useState(false);
  const P = PLATFORM[platform];
  const doneAt = post.status[platform];
  const texts = platform === 'youtube'
    ? [{ k: 'Title', v: ytTitle(post) }, { k: 'Description', v: ytDesc(post) }]
    : [{ k: 'Caption', v: ttCaption(post) }];

  return (
    <motion.div layout className="card" style={{ marginTop: 12, padding: 0, overflow: 'hidden', '--icon-fg': 'var(--surface)' }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: step * 0.06 }}>
      <div className="row" style={{ padding: '14px 14px 0' }}>
        <span style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: platform === 'youtube' ? 'var(--yt-soft)' : 'var(--tt-soft)', color: P.color, flex: 'none' }}>
          <PlatformIcon p={platform} size={24} />
        </span>
        <div className="grow">
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6 }}>STEP {step}</div>
          <div style={{ fontWeight: 800, fontSize: 17, fontFamily: 'var(--display)' }}>{P.name}</div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {doneAt
            ? <motion.span key="d" className="pill ok" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, stiffness: 400 }}><Check size={13} strokeWidth={3.2} /> Posted {format(doneAt, 'HH:mm')}</motion.span>
            : <motion.span key="n" className="pill dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{appFound ? 'Ready' : 'App not found'}</motion.span>}
        </AnimatePresence>
      </div>

      <button className="row" style={{ width: '100%', padding: '12px 14px 6px', textAlign: 'left', gap: 8 }} onClick={() => { fx('tap'); setOpen(!open); }}>
        <span className="grow" style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: open ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: open ? 'pre-wrap' : 'normal' }}>
          {open ? null : texts[0].v || <i>No text</i>}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex', alignSelf: 'flex-start' }}><ChevronDown size={18} className="muted" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {texts.map(t => (
                <div key={t.k} style={{ background: 'var(--surface2)', borderRadius: 14, padding: '10px 12px' }}>
                  <div className="row" style={{ marginBottom: 4 }}>
                    <span className="label grow" style={{ fontSize: 11 }}>{t.k}</span>
                    <span className="muted" style={{ fontSize: 11.5 }}>{t.v.length}</span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', maxHeight: 180, overflowY: 'auto' }}>{t.v || <i className="muted">Empty</i>}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row" style={{ padding: '8px 14px 0', gap: 8, flexWrap: 'wrap' }}>
        {texts.map(t => (
          <button key={t.k} className="btn sm soft" onClick={() => onCopy(t.v, t.k)} disabled={!t.v}><Copy size={15} /> Copy {t.k.toLowerCase()}</button>
        ))}
      </div>

      <div className="row" style={{ padding: 14, gap: 8 }}>
        {doneAt ? (
          <>
            <button className="btn soft" style={{ flex: 1 }} onClick={onSend}><ExternalLink size={17} /> Post again</button>
            <button className="btn soft" style={{ width: 52, padding: 0 }} onClick={() => onMark(false)} aria-label="Mark not posted"><Undo2 size={18} /></button>
          </>
        ) : (
          <>
            <button className={'btn ' + P.cls} style={{ flex: 1, '--icon-fg': platform === 'youtube' ? 'var(--yt)' : 'var(--tt)' }} onClick={onSend} disabled={!post.video}>
              <PlatformIcon p={platform} size={20} /> Post to {P.name}
            </button>
            <button className="btn soft" style={{ width: 52, padding: 0 }} onClick={() => onMark(true)} aria-label="Mark as posted"><Check size={20} strokeWidth={2.8} /></button>
          </>
        )}
      </div>
    </motion.div>
  );
}
