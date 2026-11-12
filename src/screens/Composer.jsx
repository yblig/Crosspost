import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Film, RefreshCw, Hash, Plus, X, AlertTriangle, CalendarClock, Sparkles, RotateCcw, FileText, Send, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useStore, newPost, ytTitle, ytDesc, ttCaption, cleanTag, LIMITS, fmtDuration, fmtSize, postTitle } from '../store.js';
import { useNav } from '../App.jsx';
import { fx } from '../fx.js';
import { crossShare } from '../native/crossshare.js';
import { reminders } from '../native/reminders.js';
import { Sheet, Toggle, Thumb, PlatformIcon, useToast, useBack, Dialog } from '../components/ui.jsx';

function videoWarnings(v) {
  if (!v) return [];
  const w = [];
  const landscape = v.width && v.height && v.width > v.height * 1.05;
  if (landscape) w.push('Landscape video: YouTube will post it as a regular video (not a Short), and TikTok will show it with bars.');
  if (v.durationMs > LIMITS.ytShortsMs) w.push(`Longer than 3:00 — YouTube will treat it as a regular video, not a Short.`);
  if (v.durationMs > LIMITS.ttMs) w.push('Longer than 10:00 — the TikTok app may refuse it (use TikTok on the web for long uploads).');
  return w;
}

export default function Composer({ id, active }) {
  const nav = useNav();
  const toast = useToast();
  const settings = useStore(s => s.settings);
  const library = useStore(s => s.library);
  const upsertPost = useStore(s => s.upsertPost);
  const removePost = useStore(s => s.removePost);
  const existing = useStore(s => (id ? s.posts.find(p => p.id === id) : null));
  const [post, setPost] = useState(() => existing ? structuredClone(existing) : newPost(settings));
  const [dirty, setDirty] = useState(false);
  const [platform, setPlatform] = useState('youtube');
  const [tagInput, setTagInput] = useState('');
  const [sheet, setSheet] = useState(null); // 'sets' | 'templates'
  const [picking, setPicking] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const isNew = !existing;

  const set = fn => { setPost(p => (typeof fn === 'function' ? fn(p) : { ...p, ...fn })); setDirty(true); };

  // Re-describe a video whose thumbnail was lost (e.g. after importing a backup).
  useEffect(() => {
    if (post.video && !post.video.thumbnail) {
      crossShare.describe(post.video.uri).then(d => d && setPost(p => ({ ...p, video: { ...p.video, ...d } })));
    }
  }, []); // eslint-disable-line

  const hasContent = post.video || post.caption.trim() || post.hashtags.length;

  const save = async ({ quiet } = {}) => {
    let p = post;
    if (existing?.notifId && (existing.scheduledAt !== p.scheduledAt || !p.scheduledAt)) {
      await reminders.cancel(existing.notifId);
      p = { ...p, notifId: null };
    }
    if (p.scheduledAt && p.scheduledAt > Date.now() && (!existing || existing.scheduledAt !== p.scheduledAt || !existing.notifId)) {
      const ok = await reminders.ensurePermission();
      if (ok) p = { ...p, notifId: await reminders.schedule(p, postTitle(p), settings.reminderLead) };
      else toast('Notifications are off — no reminder will ring');
    }
    const saved = upsertPost(p);
    setPost(saved);
    setDirty(false);
    if (!quiet) { fx('save'); toast(isNew ? 'Draft saved' : 'Saved'); }
    return saved;
  };

  const leave = async () => {
    if (dirty && hasContent) { await save({ quiet: true }); toast(isNew ? 'Saved to drafts' : 'Changes saved'); }
    nav.pop();
  };
  useBack(active, leave);

  const pick = async () => {
    fx('tap');
    setPicking(true);
    try {
      const v = await crossShare.pickVideo();
      if (v) { set({ video: v }); fx('save'); }
    } catch (e) {
      fx('error'); toast(e?.message || 'Could not open that video');
    } finally { setPicking(false); }
  };

  const addTags = raw => {
    const tags = raw.split(/[\s,]+/).map(cleanTag).filter(Boolean);
    if (!tags.length) return;
    set(p => ({ ...p, hashtags: [...p.hashtags, ...tags.filter(t => !p.hashtags.some(h => h.toLowerCase() === t.toLowerCase()))] }));
    fx('tap');
  };
  const onTagKey = e => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') { e.preventDefault(); addTags(tagInput); setTagInput(''); }
    else if (e.key === 'Backspace' && !tagInput && post.hashtags.length) set(p => ({ ...p, hashtags: p.hashtags.slice(0, -1) }));
  };
  const onTagChange = v => {
    if (/[\s,]$/.test(v)) { addTags(v); setTagInput(''); } else setTagInput(v);
  };

  const warnings = useMemo(() => videoWarnings(post.video), [post.video]);
  const yTitle = ytTitle(post), yDesc = ytDesc(post), tCap = ttCaption(post);
  const targetsOn = post.targets.youtube || post.targets.tiktok;
  const over = (post.targets.youtube && (yTitle.length > LIMITS.ytTitle || yDesc.length > LIMITS.ytDesc)) || (post.targets.tiktok && tCap.length > LIMITS.ttCaption);

  const toLocalInput = ts => ts ? format(ts, "yyyy-MM-dd'T'HH:mm") : '';
  const defaultSchedule = () => { const d = new Date(); d.setHours(d.getHours() + (d.getMinutes() > 30 ? 2 : 1), 0, 0, 0); return d.getTime(); };

  const publish = async () => {
    if (!post.video) { fx('error'); toast('Pick a video first'); return; }
    if (!targetsOn) { fx('error'); toast('Turn on at least one platform'); return; }
    const saved = await save({ quiet: true });
    nav.replace('publish', { id: saved.id });
  };

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={leave} aria-label="Back"><ArrowLeft size={21} /></button>
        <h2>{isNew ? 'New post' : 'Edit post'}</h2>
        {!isNew && <button className="iconbtn ghost" onClick={() => { fx('tap'); setConfirmDel(true); }} aria-label="Delete"><X size={21} className="muted" /></button>}
      </div>

      <div className="scroll" style={{ padding: '4px 16px 130px' }}>
        {/* Video */}
        {!post.video ? (
          <motion.button className="press" onClick={pick} disabled={picking} whileTap={{ scale: 0.98 }}
            style={{ width: '100%', borderRadius: 22, padding: '26px 16px', border: '2px dashed var(--surface3)', background: 'var(--grad-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 62, height: 62, borderRadius: 20, background: 'var(--grad)', display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px rgba(124,92,255,.35)' }}>
              <Film size={28} color="#fff" />
            </span>
            <b style={{ fontSize: 17, fontFamily: 'var(--display)' }}>{picking ? 'Opening…' : 'Choose a video'}</b>
            <span className="muted" style={{ fontSize: 13.5 }}>Vertical clips up to 3:00 work best on both</span>
          </motion.button>
        ) : (
          <motion.div className="card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: 12 }}>
            <div className="row" style={{ alignItems: 'stretch', gap: 14 }}>
              <Thumb video={post.video} w={84} h={124} r={16} />
              <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2 }}>
                <div style={{ fontWeight: 700, wordBreak: 'break-all', fontSize: 14, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.video.name || 'Video'}</div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className="pill dim">{fmtDuration(post.video.durationMs)}</span>
                  {post.video.width ? <span className="pill dim">{post.video.width}×{post.video.height}</span> : null}
                  {post.video.size ? <span className="pill dim">{fmtSize(post.video.size)}</span> : null}
                  {!warnings.length && <span className="pill ok"><Check size={12} strokeWidth={3} /> Shorts-ready</span>}
                </div>
                <span className="grow" />
                <button className="btn sm soft" style={{ alignSelf: 'flex-start' }} onClick={pick}><RefreshCw size={15} /> Replace</button>
              </div>
            </div>
            {warnings.map(w => (
              <div key={w} className="row" style={{ alignItems: 'flex-start', gap: 8, marginTop: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 1 }} /> {w}
              </div>
            ))}
          </motion.div>
        )}

        {/* Caption */}
        <div className="row" style={{ margin: '22px 4px 8px' }}>
          <span className="label grow">Caption</span>
          <button className="row muted" style={{ gap: 5, fontSize: 13, fontWeight: 700 }} onClick={() => setSheet('templates')}><FileText size={15} /> Templates</button>
        </div>
        <div className="field">
          <AutoText value={post.caption} onChange={v => set({ caption: v })} placeholder="What's this video about? The first line becomes your YouTube title." minRows={4} />
        </div>

        {/* Hashtags */}
        <div className="row" style={{ margin: '22px 4px 8px' }}>
          <span className="label grow">Hashtags</span>
          <button className="row muted" style={{ gap: 5, fontSize: 13, fontWeight: 700 }} onClick={() => setSheet('sets')}><Sparkles size={15} /> Add a set</button>
        </div>
        <div className="field" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', padding: 10 }}>
          <AnimatePresence initial={false}>
            {post.hashtags.map(t => (
              <motion.span key={t} className="tag" layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                #{t}
                <button onClick={() => { fx('tap'); set(p => ({ ...p, hashtags: p.hashtags.filter(h => h !== t) })); }}><X size={14} /></button>
              </motion.span>
            ))}
          </AnimatePresence>
          <div className="row" style={{ flex: 1, minWidth: 120, gap: 4, paddingLeft: 4 }}>
            <Hash size={16} className="muted" />
            <input value={tagInput} onChange={e => onTagChange(e.target.value)} onKeyDown={onTagKey}
              onBlur={() => { if (tagInput) { addTags(tagInput); setTagInput(''); } }}
              placeholder={post.hashtags.length ? 'add more' : 'type a tag, press space'} style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: 32, fontSize: 15 }} />
          </div>
        </div>

        {/* Per platform */}
        <div className="label" style={{ margin: '24px 4px 8px' }}>Per platform</div>
        <div className="seg">
          {['youtube', 'tiktok'].map(k => (
            <button key={k} className={platform === k ? 'on' : ''} onClick={() => { fx('tap'); setPlatform(k); }}
              style={{ color: platform === k ? (k === 'youtube' ? 'var(--yt)' : 'var(--tt)') : undefined, '--icon-fg': 'var(--surface)' }}>
              <PlatformIcon p={k} size={17} /> {k === 'youtube' ? 'YouTube' : 'TikTok'}
              {!post.targets[k] && <span style={{ fontSize: 11, opacity: 0.7 }}>(off)</span>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={platform} initial={{ opacity: 0, x: platform === 'youtube' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="card row" style={{ marginTop: 10, padding: '12px 14px' }}>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>Post to {platform === 'youtube' ? 'YouTube' : 'TikTok'}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>Include this platform when publishing</div>
              </div>
              <Toggle on={post.targets[platform]} onChange={v => set(p => ({ ...p, targets: { ...p.targets, [platform]: v } }))} />
            </div>

            {post.targets[platform] && (platform === 'youtube' ? (
              <>
                <LinkedField label="Title" value={yTitle} linked={post.yt.linked} limit={LIMITS.ytTitle} rows={2}
                  onEdit={v => set(p => ({ ...p, yt: { ...p.yt, title: v, linked: false } }))}
                  onReset={() => set(p => ({ ...p, yt: { ...p.yt, linked: true } }))} />
                <LinkedField label="Description" value={yDesc} linked={post.yt.linkedDesc} limit={LIMITS.ytDesc} rows={4}
                  onEdit={v => set(p => ({ ...p, yt: { ...p.yt, description: v, linkedDesc: false } }))}
                  onReset={() => set(p => ({ ...p, yt: { ...p.yt, linkedDesc: true } }))} />
                <div className="card row" style={{ marginTop: 10, padding: '12px 14px' }}>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>Add #Shorts to title</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>Helps vertical clips land in the Shorts feed</div>
                  </div>
                  <Toggle on={post.yt.shorts} onChange={v => set(p => ({ ...p, yt: { ...p.yt, shorts: v } }))} />
                </div>
              </>
            ) : (
              <LinkedField label="Caption" value={tCap} linked={post.tt.linked} limit={LIMITS.ttCaption} rows={5}
                onEdit={v => set(p => ({ ...p, tt: { ...p.tt, caption: v, linked: false } }))}
                onReset={() => set(p => ({ ...p, tt: { ...p.tt, linked: true } }))} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Schedule */}
        <div className="label" style={{ margin: '24px 4px 8px' }}>Schedule</div>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="row">
            <span className="ic" style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--surface2)', color: 'var(--brand2)' }}><CalendarClock size={19} /></span>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>Remind me to post</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{post.scheduledAt ? format(post.scheduledAt, "EEEE d MMM 'at' HH:mm") : 'Get a notification at the right time'}</div>
            </div>
            <Toggle on={!!post.scheduledAt} onChange={v => set({ scheduledAt: v ? defaultSchedule() : null })} />
          </div>
          <AnimatePresence>
            {post.scheduledAt && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <input type="datetime-local" value={toLocalInput(post.scheduledAt)}
                  onChange={e => e.target.value && set({ scheduledAt: new Date(e.target.value).getTime() })}
                  style={{ width: '100%', marginTop: 12, height: 48, borderRadius: 12, border: 0, background: 'var(--surface2)', padding: '0 12px', fontSize: 15, fontWeight: 600, outline: 0 }} />
                {post.scheduledAt < Date.now() && <div style={{ color: 'var(--warn)', fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>That time has passed — pick a future time for a reminder.</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 16px calc(var(--sb) + 14px)', background: 'linear-gradient(transparent, var(--bg) 30%)', display: 'flex', gap: 10 }}>
        <button className="btn soft" style={{ flex: 1 }} onClick={() => save()} disabled={!hasContent}>Save</button>
        <button className="btn primary" style={{ flex: 1.6 }} onClick={publish} disabled={over}>
          <Send size={18} /> {over ? 'Text too long' : 'Publish'}
        </button>
      </div>

      <Sheet open={sheet === 'sets'} onClose={() => setSheet(null)} title="Hashtag sets">
        {library.sets.length === 0 && <p className="muted">No sets yet — make some in the Library tab.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {library.sets.map(s => (
            <button key={s.id} className="card press" style={{ background: 'var(--surface2)', textAlign: 'left', boxShadow: 'none' }}
              onClick={() => { addTags(s.tags.join(' ')); setSheet(null); toast(`Added ${s.name}`); }}>
              <div className="row"><b className="grow">{s.name}</b><Plus size={18} className="muted" /></div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{s.tags.map(t => '#' + t).join(' ')}</div>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'templates'} onClose={() => setSheet(null)} title="Caption templates">
        {library.templates.length === 0 && <p className="muted">No templates yet — make some in the Library tab.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {library.templates.map(t => (
            <button key={t.id} className="card press" style={{ background: 'var(--surface2)', textAlign: 'left', boxShadow: 'none' }}
              onClick={() => { set(p => ({ ...p, caption: p.caption.trim() ? p.caption.trimEnd() + '\n\n' + t.text : t.text })); setSheet(null); fx('save'); }}>
              <div className="row"><b className="grow">{t.name}</b><Plus size={18} className="muted" /></div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.45 }}>{t.text}</div>
            </button>
          ))}
        </div>
      </Sheet>

      <Dialog open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete this post?"
        body="It will be removed from TwinPost. Your video file stays on your phone."
        actions={<>
          <button className="btn soft" style={{ flex: 1 }} onClick={() => setConfirmDel(false)}>Cancel</button>
          <button className="btn danger" style={{ flex: 1 }} onClick={() => {
            reminders.cancel(existing?.notifId); fx('delete');
            const undo = removePost(post.id); setConfirmDel(false); nav.pop();
            toast('Post deleted', { label: 'Undo', fn: undo });
          }}>Delete</button>
        </>} />
    </>
  );
}

function AutoText({ value, onChange, placeholder, minRows = 3 }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, minRows * 22) + 'px';
  }, [value, minRows]);
  return <textarea ref={ref} value={value} rows={minRows} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
}

function LinkedField({ label, value, linked, limit, rows, onEdit, onReset }) {
  const n = value.length;
  return (
    <div style={{ marginTop: 10 }}>
      <div className="field">
        <div className="row" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }} className="grow muted">{label}</span>
          {linked
            ? <span className="pill dim" style={{ height: 22 }}>Auto from caption</span>
            : <button className="row" style={{ gap: 4, fontSize: 12.5, fontWeight: 700, color: 'var(--brand2)' }} onClick={() => { fx('tap'); onReset(); }}><RotateCcw size={13} /> Back to auto</button>}
        </div>
        <AutoText value={value} onChange={onEdit} minRows={rows} placeholder={`${label}…`} />
        <div className="meta">
          <span>{linked ? 'Edit to customise' : 'Customised'}</span>
          <span className={n > limit ? 'over' : ''}>{n}/{limit}</span>
        </div>
      </div>
    </div>
  );
}
