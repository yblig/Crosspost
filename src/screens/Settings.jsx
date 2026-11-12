import { useEffect, useState } from 'react';
import { Sun, Moon, Smartphone, Volume2, Vibrate, Hash, BellRing, Music2, Download, Upload, Trash2, Info, MessageSquareText, Check } from 'lucide-react';
import { useStore } from '../store.js';
import { fx } from '../fx.js';
import { crossShare, PKG } from '../native/crossshare.js';
import { Toggle, Sheet, Dialog, Logo, useToast } from '../components/ui.jsx';
import { haptics } from '../lib/haptics.js';
import { reminders } from '../native/reminders.js';

const Row = ({ icon: Ic, color, title, sub, right, onClick }) => (
  <div className="list-item" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <span className="ic" style={{ color: color || 'var(--text)' }}><Ic size={19} /></span>
    <div className="grow"><div className="t">{title}</div>{sub && <div className="s">{sub}</div>}</div>
    {right}
  </div>
);

export default function Settings() {
  const s = useStore(st => st.settings);
  const setSetting = useStore(st => st.setSetting);
  const exportAll = useStore(st => st.exportAll);
  const importAll = useStore(st => st.importAll);
  const resetAll = useStore(st => st.resetAll);
  const postsCount = useStore(st => st.posts.length);
  const toast = useToast();
  const [sheet, setSheet] = useState(null);
  const [importText, setImportText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [installed, setInstalled] = useState({});
  useEffect(() => { crossShare.installed().then(setInstalled); }, []);

  const appsFound = [
    { name: 'YouTube', ok: PKG.youtube.some(p => installed[p]) },
    { name: 'TikTok', ok: PKG.tiktok.global.some(p => installed[p]) },
    { name: 'TikTok Lite', ok: PKG.tiktok.lite.some(p => installed[p]) }
  ];

  return (
    <>
      <div className="topbar"><h1 className="bigtitle">Settings</h1></div>
      <div className="scroll" style={{ padding: '6px 16px 40px' }}>
        <div className="label" style={{ margin: '6px 4px 8px' }}>Appearance</div>
        <div className="seg">
          {[{ v: 'system', l: 'Auto', ic: Smartphone }, { v: 'light', l: 'Light', ic: Sun }, { v: 'dark', l: 'Dark', ic: Moon }].map(o => (
            <button key={o.v} className={s.theme === o.v ? 'on' : ''} onClick={() => { fx('tap'); setSetting('theme', o.v); }}><o.ic size={16} /> {o.l}</button>
          ))}
        </div>

        <div className="label" style={{ margin: '22px 4px 8px' }}>Feedback</div>
        <div className="group">
          <Row icon={Volume2} color="var(--brand2)" title="Sounds" sub="Soft clicks and chimes" right={<Toggle on={s.sounds} onChange={v => { setSetting('sounds', v); if (v) setTimeout(() => fx('posted'), 50); }} />} />
          <Row icon={Vibrate} color="var(--brand2)" title="Vibration" sub="Haptic feedback on taps" right={<Toggle on={s.haptics} onChange={v => { setSetting('haptics', v); haptics.setEnabled(v); }} />} />
        </div>

        <div className="label" style={{ margin: '22px 4px 8px' }}>Posting</div>
        <div className="group">
          <Row icon={Hash} color="var(--yt)" title="#Shorts in new titles" sub="Default for new posts" right={<Toggle on={s.defaultShorts} onChange={v => setSetting('defaultShorts', v)} />} />
          <Row icon={MessageSquareText} color="var(--brand2)" title='Ask "Did it go up?"' sub="After you come back from YouTube or TikTok" right={<Toggle on={s.askAfterShare} onChange={v => setSetting('askAfterShare', v)} />} />
          <Row icon={Music2} color="var(--tt)" title="TikTok app" sub={{ auto: 'Automatic — whichever is installed', global: 'TikTok', lite: 'TikTok Lite' }[s.tiktokApp]} onClick={() => setSheet('tiktok')} />
          <Row icon={BellRing} color="var(--warn)" title="Reminder" sub={s.reminderLead ? `${s.reminderLead} min before the planned time` : 'At the planned time'} onClick={() => setSheet('lead')} />
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '10px 4px 0' }}>
          {appsFound.map(a => <span key={a.name} className={'pill ' + (a.ok ? 'ok' : 'dim')}>{a.ok ? <Check size={12} strokeWidth={3} /> : null}{a.name} {a.ok ? 'found' : 'not installed'}</span>)}
        </div>

        <div className="label" style={{ margin: '22px 4px 8px' }}>Your data</div>
        <div className="group">
          <Row icon={Upload} title="Back up" sub={`Copy all ${postsCount} posts + library to the clipboard`}
            onClick={async () => { const ok = await crossShare.copy(exportAll()); fx(ok ? 'copy' : 'error'); toast(ok ? 'Backup copied — paste it somewhere safe' : 'Could not copy'); }} />
          <Row icon={Download} title="Restore" sub="Paste a TwinPost backup" onClick={() => { setImportText(''); setSheet('import'); }} />
          <Row icon={Trash2} color="var(--danger)" title="Delete all posts" sub="Library and settings are kept" onClick={() => { fx('tap'); setConfirmReset(true); }} />
        </div>

        <div className="card" style={{ marginTop: 22, display: 'flex', gap: 14, alignItems: 'center' }}>
          <Logo size={46} />
          <div className="grow">
            <div style={{ fontWeight: 800, fontFamily: 'var(--display)', fontSize: 17 }}>TwinPost <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>v{__APP_VERSION__}</span></div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>Write it once, post it twice. Works offline; your posts never leave your phone.</div>
          </div>
        </div>
        <div className="row muted" style={{ gap: 8, fontSize: 12, lineHeight: 1.5, margin: '12px 6px 0', alignItems: 'flex-start' }}>
          <Info size={15} style={{ flex: 'none', marginTop: 2 }} />
          <span>TwinPost isn't affiliated with YouTube or TikTok. It hands your video to their official apps, so you post with your own accounts as usual.</span>
        </div>
      </div>

      <Sheet open={sheet === 'tiktok'} onClose={() => setSheet(null)} title="Which TikTok app?">
        <div className="group" style={{ background: 'var(--surface2)' }}>
          {[{ v: 'auto', t: 'Automatic', s: 'Use whichever TikTok app is installed' }, { v: 'global', t: 'TikTok', s: 'The regular TikTok app' }, { v: 'lite', t: 'TikTok Lite', s: 'The lightweight app' }].map(o => (
            <div key={o.v} className="list-item" onClick={() => { fx('tap'); setSetting('tiktokApp', o.v); setSheet(null); }}>
              <div className="grow"><div className="t">{o.t}</div><div className="s">{o.s}</div></div>
              {s.tiktokApp === o.v && <Check size={20} color="var(--brand2)" strokeWidth={3} />}
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'lead'} onClose={() => setSheet(null)} title="Remind me">
        <div className="group" style={{ background: 'var(--surface2)' }}>
          {[0, 5, 15, 30, 60].map(m => (
            <div key={m} className="list-item" onClick={() => { fx('tap'); setSetting('reminderLead', m); setSheet(null); }}>
              <div className="grow t">{m === 0 ? 'At the planned time' : m === 60 ? '1 hour before' : `${m} minutes before`}</div>
              {s.reminderLead === m && <Check size={20} color="var(--brand2)" strokeWidth={3} />}
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5 }}>Applies to posts you schedule from now on.</p>
      </Sheet>

      <Sheet open={sheet === 'import'} onClose={() => setSheet(null)} title="Restore backup"
        footer={<div className="row" style={{ gap: 10 }}>
          <button className="btn soft" style={{ flex: 1 }} onClick={async () => { setImportText(await crossShare.paste()); fx('tap'); }}>Paste</button>
          <button className="btn primary" style={{ flex: 1.5 }} disabled={!importText.trim()} onClick={() => {
            try { const n = importAll(JSON.parse(importText)); fx('save'); toast(`Restored ${n} post${n === 1 ? '' : 's'}`); setSheet(null); }
            catch { fx('error'); toast("That doesn't look like a TwinPost backup"); }
          }}>Restore</button>
        </div>}>
        <div className="field">
          <textarea rows={6} value={importText} onChange={e => setImportText(e.target.value)} placeholder='{"app":"TwinPost", …}' style={{ fontSize: 13, fontFamily: 'monospace' }} />
        </div>
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>Posts you already have are kept; only new ones are added. Videos must still be on this phone — if one is missing, pick it again in Edit.</p>
      </Sheet>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Delete all posts?"
        body={`All ${postsCount} posts will be removed. This can't be undone — make a backup first if you're unsure.`}
        actions={<>
          <button className="btn soft" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>Cancel</button>
          <button className="btn danger" style={{ flex: 1 }} onClick={() => { useStore.getState().posts.forEach(p => reminders.cancel(p.notifId)); resetAll(); fx('delete'); setConfirmReset(false); toast('All posts deleted'); }}>Delete all</button>
        </>} />
    </>
  );
}
