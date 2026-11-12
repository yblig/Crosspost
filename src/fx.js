import { audio } from './lib/audio.js';
import { haptics } from './lib/haptics.js';
import { useStore } from './store.js';

const SOUNDS = ['tap', 'open', 'back', 'copy', 'save', 'send', 'posted', 'win', 'delete', 'error', 'toggle'];

export async function loadSounds() {
  await audio.load(Object.fromEntries(SOUNDS.map(k => [k, `audio/${k}.wav`])));
}

const HAPTIC = {
  tap: 'tap', toggle: 'tap', back: 'tap', copy: 'light', save: 'light', send: 'medium',
  posted: 'success', win: 'success', delete: 'medium', error: 'error'
};

/** Sound + haptic for a UI event, both honouring Settings. */
export function fx(name, opts) {
  const s = useStore.getState().settings;
  if (s.sounds) audio.play(name, opts);
  if (s.haptics && HAPTIC[name]) haptics[HAPTIC[name]]?.();
}
