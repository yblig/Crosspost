import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Hash, FileText, Trash2, Copy } from 'lucide-react';
import { useStore, uid, cleanTag } from '../store.js';
import { fx } from '../fx.js';
import { crossShare } from '../native/crossshare.js';
import { Sheet, useToast } from '../components/ui.jsx';

export default function Library() {
  const library = useStore(s => s.library);
  const setLibrary = useStore(s => s.setLibrary);
  const toast = useToast();
  const [tab, setTab] = useState('sets');
  const [edit, setEdit] = useState(null); // { kind, item, isNew }

  const items = tab === 'sets' ? library.sets : library.templates;

  const openNew = () => setEdit(tab === 'sets'
    ? { kind: 'sets', isNew: true, item: { id: uid(), name: '', tags: [] } }
    : { kind: 'templates', isNew: true, item: { id: uid(), name: '', text: '' } });

  const saveItem = item => {
    setLibrary(l => {
      const list = l[edit.kind];
      const exists = list.some(x => x.id === item.id);
      return { ...l, [edit.kind]: exists ? list.map(x => (x.id === item.id ? item : x)) : [...list, item] };
    });
    fx('save'); toast('Saved'); setEdit(null);
  };
  const delItem = item => {
    const kind = edit.kind;
    const before = library[kind];
    setLibrary(l => ({ ...l, [kind]: l[kind].filter(x => x.id !== item.id) }));
    fx('delete'); setEdit(null);
    toast('Deleted', { label: 'Undo', fn: () => setLibrary(l => ({ ...l, [kind]: before })) });
  };

  return (
    <>
      <div className="topbar" style={{ paddingBottom: 6 }}>
        <h1 className="bigtitle grow">Library</h1>
        <button className="iconbtn" onClick={() => { fx('tap'); openNew(); }} aria-label="Add"><Plus size={22} /></button>
      </div>
      <div className="section">
        <div className="seg">
          <button className={tab === 'sets' ? 'on' : ''} onClick={() => { fx('tap'); setTab('sets'); }}><Hash size={16} /> Hashtag sets</button>
          <button className={tab === 'templates' ? 'on' : ''} onClick={() => { fx('tap'); setTab('templates'); }}><FileText size={16} /> Templates</button>
        </div>
      </div>

      <div className="scroll" style={{ padding: '14px 16px 40px' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((it, i) => (
            <motion.div key={it.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }} exit={{ opacity: 0, scale: 0.95 }}
              className="card press" style={{ marginBottom: 10 }}
              onClick={() => { fx('tap'); setEdit({ kind: tab, isNew: false, item: structuredClone(it) }); }}>
              <div className="row">
                <span style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: tab === 'sets' ? 'rgba(124,92,255,.15)' : 'var(--tt-soft)', color: tab === 'sets' ? 'var(--brand2)' : 'var(--tt)', flex: 'none' }}>
                  {tab === 'sets' ? <Hash size={19} /> : <FileText size={19} />}
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{it.name || 'Untitled'}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{tab === 'sets' ? `${it.tags.length} hashtags` : `${it.text.length} characters`}</div>
                </div>
                <button className="iconbtn ghost" style={{ width: 40, height: 40 }} aria-label="Copy"
                  onClick={async e => { e.stopPropagation(); await crossShare.copy(tab === 'sets' ? it.tags.map(t => '#' + t).join(' ') : it.text); fx('copy'); toast('Copied'); }}>
                  <Copy size={18} className="muted" />
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)', whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {tab === 'sets'
                  ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{it.tags.map(t => <span key={t} className="tag" style={{ height: 28, padding: '0 10px', fontSize: 12.5 }}>#{t}</span>)}</span>
                  : it.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px' }} className="muted">
            <p style={{ lineHeight: 1.5 }}>{tab === 'sets' ? 'Save groups of hashtags you use often and drop them into any post with one tap.' : 'Save captions you reuse — hooks, calls to action, sign-offs.'}</p>
          </div>
        )}
        <button className="btn soft block" style={{ marginTop: 6, border: '2px dashed var(--surface3)', background: 'transparent' }} onClick={() => { fx('tap'); openNew(); }}>
          <Plus size={18} /> {tab === 'sets' ? 'New hashtag set' : 'New template'}
        </button>
      </div>

      <EditSheet edit={edit} onClose={() => setEdit(null)} onSave={saveItem} onDelete={delItem} />
    </>
  );
}

function EditSheet({ edit, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(null);
  const [tagText, setTagText] = useState('');
  const key = edit?.item?.id;
  const [lastKey, setLastKey] = useState(null);
  if (edit && key !== lastKey) {
    setLastKey(key);
    setDraft(edit.item);
    setTagText(edit.kind === 'sets' ? edit.item.tags.map(t => '#' + t).join(' ') : '');
  }
  if (!edit && lastKey) setLastKey(null);

  const isSet = edit?.kind === 'sets';
  const tags = tagText.split(/[\s,]+/).map(cleanTag).filter(Boolean);
  const valid = draft && draft.name.trim() && (isSet ? tags.length : draft.text?.trim());

  return (
    <Sheet open={!!edit} onClose={onClose} title={edit ? (edit.isNew ? (isSet ? 'New hashtag set' : 'New template') : (isSet ? 'Edit set' : 'Edit template')) : ''}
      footer={draft && (
        <div className="row" style={{ gap: 10 }}>
          {!edit?.isNew && <button className="btn danger" style={{ width: 52, padding: 0 }} onClick={() => onDelete(draft)} aria-label="Delete"><Trash2 size={19} /></button>}
          <button className="btn primary grow" disabled={!valid}
            onClick={() => onSave(isSet ? { ...draft, name: draft.name.trim(), tags: [...new Set(tags)] } : { ...draft, name: draft.name.trim() })}>
            Save
          </button>
        </div>
      )}>
      {draft && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field">
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Name</div>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder={isSet ? 'e.g. Cooking' : 'e.g. Follow CTA'} />
          </div>
          <div className="field">
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>{isSet ? 'Hashtags' : 'Text'}</div>
            {isSet
              ? <textarea rows={4} value={tagText} onChange={e => setTagText(e.target.value)} placeholder="#food #recipe #easyrecipe" />
              : <textarea rows={6} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} placeholder="Follow for more 🔥" />}
            {isSet && <div className="meta"><span>Separate with spaces</span><span>{tags.length} tags</span></div>}
          </div>
        </div>
      )}
    </Sheet>
  );
}
