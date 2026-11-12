import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MoreHorizontal, Clock, Pencil, Send, Copy, Trash2, Check, Flame, CalendarClock, Film } from 'lucide-react';
import { format, isToday, isTomorrow, startOfDay, subDays, startOfWeek } from 'date-fns';
import { useStore, postState, postTitle, fmtDuration } from '../store.js';
import { useNav } from '../App.jsx';
import { fx } from '../fx.js';
import { Logo, Sheet, Thumb, PlatformIcon, CountUp, useToast, useBack } from '../components/ui.jsx';
import { IllusEmpty } from '../components/art.jsx';
import { reminders } from '../native/reminders.js';

const FILTERS = [
  { id: 'all', label: 'All' }, { id: 'draft', label: 'Drafts' },
  { id: 'scheduled', label: 'Scheduled' }, { id: 'posted', label: 'Posted' }
];

function whenLabel(ts) {
  const d = new Date(ts);
  if (isToday(d)) return 'Today ' + format(d, 'HH:mm');
  if (isTomorrow(d)) return 'Tomorrow ' + format(d, 'HH:mm');
  return format(d, 'EEE d MMM, HH:mm');
}

function stats(posts) {
  const times = posts.flatMap(p => [p.status.youtube, p.status.tiktok].filter(Boolean));
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
  const week = times.filter(t => t >= weekStart).length;
  const days = new Set(times.map(t => startOfDay(t).getTime()));
  let streak = 0, d = startOfDay(new Date());
  if (!days.has(d.getTime())) d = subDays(d, 1);
  while (days.has(d.getTime())) { streak++; d = subDays(d, 1); }
  const upcoming = posts.filter(p => postState(p) === 'scheduled' && p.scheduledAt > Date.now()).length;
  return { week, streak, upcoming };
}

export default function Posts() {
  const posts = useStore(s => s.posts);
  const removePost = useStore(s => s.removePost);
  const duplicatePost = useStore(s => s.duplicatePost);
  const nav = useNav();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState(null);
  useBack(searching, () => { setSearching(false); setQ(''); });

  const st = useMemo(() => stats(posts), [posts]);
  const counts = useMemo(() => {
    const c = { all: posts.length, draft: 0, scheduled: 0, posted: 0 };
    posts.forEach(p => { const s = postState(p); if (s === 'partial' || s === 'draft') c.draft++; else c[s]++; });
    return c;
  }, [posts]);

  const list = useMemo(() => {
    let l = posts;
    if (filter !== 'all') l = l.filter(p => { const s = postState(p); return filter === 'draft' ? s === 'draft' || s === 'partial' : s === filter; });
    if (q.trim()) {
      const n = q.toLowerCase();
      l = l.filter(p => (p.caption + ' ' + p.hashtags.join(' ') + ' ' + p.yt.title + ' ' + p.tt.caption).toLowerCase().includes(n));
    }
    const sched = l.filter(p => postState(p) === 'scheduled').sort((a, b) => a.scheduledAt - b.scheduledAt);
    const rest = l.filter(p => postState(p) !== 'scheduled').sort((a, b) => b.updatedAt - a.updatedAt);
    return { sched, rest };
  }, [posts, filter, q]);

  const open = p => {
    if (!p.video || (postState(p) === 'draft' && !p.caption)) nav.push('composer', { id: p.id });
    else nav.push('publish', { id: p.id });
  };

  const del = p => {
    setMenu(null);
    fx('delete');
    reminders.cancel(p.notifId);
    const undo = removePost(p.id);
    toast('Post deleted', { label: 'Undo', fn: undo });
  };

  const hello = (() => { const h = new Date().getHours(); return h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 19 ? 'Good evening' : 'Good night'; })();

  return (
    <>
      <div className="topbar" style={{ paddingBottom: 4 }}>
        <AnimatePresence mode="wait" initial={false}>
          {searching ? (
            <motion.div key="s" className="field row grow" style={{ padding: '8px 12px' }}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Search size={18} className="muted" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search captions & hashtags" />
              <button onClick={() => { fx('back'); setSearching(false); setQ(''); }}><X size={20} className="muted" /></button>
            </motion.div>
          ) : (
            <motion.div key="t" className="row grow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Logo size={36} />
              <div className="grow">
                <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{hello}</div>
                <div style={{ font: '700 20px var(--display)', letterSpacing: -0.4 }}>TwinPost</div>
              </div>
              <button className="iconbtn" onClick={() => { fx('tap'); setSearching(true); }} aria-label="Search"><Search size={20} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="scroll" style={{ paddingBottom: 150 }}>
        <div className="section" style={{ marginTop: 8 }}>
          <div className="card" style={{ background: 'var(--grad-soft), var(--surface)', display: 'flex', padding: '16px 6px' }}>
            {[
              { v: st.week, l: 'this week', ic: <Check size={15} strokeWidth={3} />, c: 'var(--ok)' },
              { v: st.streak, l: 'day streak', ic: <Flame size={15} strokeWidth={2.6} />, c: 'var(--warn)' },
              { v: st.upcoming, l: 'scheduled', ic: <CalendarClock size={15} strokeWidth={2.6} />, c: 'var(--brand2)' }
            ].map((s, k) => (
              <div key={k} style={{ flex: 1, textAlign: 'center', borderLeft: k ? '1px solid var(--line)' : 0 }}>
                <div style={{ font: '700 28px var(--display)', letterSpacing: -1 }}><CountUp value={s.v} /></div>
                <div className="row" style={{ gap: 4, justifyContent: 'center', fontSize: 11.5, fontWeight: 650, color: 'var(--muted)' }}>
                  <span style={{ color: s.c, display: 'flex' }}>{s.ic}</span>{s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chips" style={{ marginTop: 16 }}>
          {FILTERS.map(f => (
            <button key={f.id} className={'chip' + (filter === f.id ? ' on' : '')} onClick={() => { fx('tap'); setFilter(f.id); }}>
              {f.label} <span className="count">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {!list.sched.length && !list.rest.length ? (
          <Empty searching={!!q || filter !== 'all'} onCreate={() => nav.push('composer', {})} />
        ) : (
          <div className="section" style={{ marginTop: 10 }}>
            {list.sched.length > 0 && <div className="label" style={{ margin: '10px 4px 10px' }}>Up next</div>}
            <AnimatePresence initial={false}>
              {list.sched.map(p => <PostCard key={p.id} p={p} onOpen={open} onMenu={setMenu} />)}
            </AnimatePresence>
            {list.sched.length > 0 && list.rest.length > 0 && <div className="label" style={{ margin: '18px 4px 10px' }}>Recent</div>}
            <AnimatePresence initial={false}>
              {list.rest.map(p => <PostCard key={p.id} p={p} onOpen={open} onMenu={setMenu} />)}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu ? postTitle(menu) : ''}>
        {menu && (
          <div className="group" style={{ background: 'var(--surface2)' }}>
            {[
              { ic: Send, t: 'Publish', s: 'Send to YouTube & TikTok', fn: () => { setMenu(null); nav.push('publish', { id: menu.id }); } },
              { ic: Pencil, t: 'Edit', s: 'Caption, hashtags, schedule', fn: () => { setMenu(null); nav.push('composer', { id: menu.id }); } },
              { ic: Copy, t: 'Duplicate', s: 'Start a new post from this one', fn: () => { const c = duplicatePost(menu.id); setMenu(null); fx('save'); toast('Duplicated'); if (c) nav.push('composer', { id: c.id }); } },
              { ic: Trash2, t: 'Delete', s: 'You can undo for a few seconds', fn: () => del(menu), danger: true }
            ].map(a => (
              <button key={a.t} className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={a.fn}>
                <span className="ic" style={a.danger ? { color: 'var(--danger)', background: 'rgba(255,107,107,.12)' } : { background: 'var(--surface3)' }}><a.ic size={19} /></span>
                <span className="grow"><div className="t" style={a.danger ? { color: 'var(--danger)' } : null}>{a.t}</div><div className="s">{a.s}</div></span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

function StatusPill({ p, platform }) {
  if (!p.targets[platform]) return null;
  const done = p.status[platform];
  const cls = platform === 'youtube' ? 'yt' : 'tt';
  return (
    <span className={'pill ' + (done ? cls : 'dim')} style={{ '--icon-fg': done ? 'var(--surface)' : 'var(--surface2)' }}>
      <PlatformIcon p={platform} size={13} />
      {done ? <Check size={12} strokeWidth={3.4} /> : 'Not yet'}
    </span>
  );
}

function PostCard({ p, onOpen, onMenu }) {
  const s = postState(p);
  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      style={{ marginBottom: 10 }}>
      <div className="card press row" style={{ padding: 10, gap: 12, alignItems: 'stretch' }} onClick={() => onOpen(p)}>
        <Thumb video={p.video} w={62} h={84}>
          {p.video?.durationMs ? <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 10.5, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,.55)', borderRadius: 6, padding: '1px 5px' }}>{fmtDuration(p.video.durationMs)}</span> : null}
        </Thumb>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3px 0' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {postTitle(p)}
            </div>
            <div className="muted row" style={{ fontSize: 12.5, gap: 5, marginTop: 4 }}>
              {s === 'scheduled' ? <><Clock size={13} /> <span style={{ color: p.scheduledAt < Date.now() ? 'var(--warn)' : undefined, fontWeight: 650 }}>{whenLabel(p.scheduledAt)}</span></>
                : s === 'posted' ? <><Check size={13} /> Posted {format(Math.max(p.status.youtube || 0, p.status.tiktok || 0), 'd MMM')}</>
                  : !p.video ? <><Film size={13} /> No video yet</>
                    : <>Edited {format(p.updatedAt, 'd MMM, HH:mm')}</>}
            </div>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <StatusPill p={p} platform="youtube" />
            <StatusPill p={p} platform="tiktok" />
            {s === 'draft' && <span className="pill warn">Draft</span>}
          </div>
        </div>
        <button className="iconbtn ghost" style={{ alignSelf: 'flex-start', width: 38, height: 38 }} aria-label="More"
          onClick={e => { e.stopPropagation(); onMenu(p); }}>
          <MoreHorizontal size={20} className="muted" />
        </button>
      </div>
    </motion.div>
  );
}

function Empty({ searching, onCreate }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '34px 30px' }}>
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
        <IllusEmpty size={190} />
      </motion.div>
      <h3 style={{ font: '700 21px var(--display)', margin: '14px 0 6px' }}>{searching ? 'Nothing here' : 'Your first crosspost'}</h3>
      <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
        {searching ? 'No posts match this filter yet.' : 'Pick a video, write one caption, and send it to YouTube and TikTok in two taps.'}
      </p>
      {!searching && <button className="btn primary" style={{ marginTop: 20 }} onClick={onCreate}>Create a post</button>}
    </motion.div>
  );
}
