// Preview helpers (used by screenshot scripts in the browser; harmless in the APK).
import { useStore, newPost } from './store.js';
import { crossShare } from './native/crossshare.js';

export function installDebug() {
  window.__store = useStore;
  window.__seed = () => {
    const st = useStore.getState();
    const now = Date.now(), H = 3600_000, D = 24 * H;
    const mk = (o, seed) => {
      const p = newPost(st.settings);
      return { ...p, ...o, id: 'demo' + seed, video: { uri: 'mock://' + seed, name: `VID_${seed}.mp4`, durationMs: 18000 + seed * 9100, width: 1080, height: 1920, size: 21e6 + seed * 3e6, thumbnail: crossShare.mockThumb(seed / 6) } };
    };
    const posts = [
      mk({ caption: '3 coffee hacks baristas never tell you ☕\nNumber 2 changed my mornings.', hashtags: ['coffee', 'lifehacks', 'barista'], scheduledAt: now + 5 * H, createdAt: now - H, updatedAt: now - H }, 1),
      mk({ caption: 'Sunset ride along the coast 🌅', hashtags: ['travel', 'bali', 'sunset'], scheduledAt: now + 1.6 * D, createdAt: now - 2 * H, updatedAt: now - 2 * H }, 2),
      mk({ caption: 'Building a desk setup for under $200', hashtags: ['desksetup', 'budget'], status: { youtube: now - 3 * H, tiktok: null }, updatedAt: now - 3 * H }, 3),
      mk({ caption: 'Day in my life as a student in Makassar', hashtags: ['vlog', 'dayinmylife', 'student'], status: { youtube: now - D, tiktok: now - D + 600000 }, updatedAt: now - D }, 4),
      mk({ caption: 'Easy 10-minute fried rice 🍳', hashtags: ['recipe', 'friedrice', 'cooking'], status: { youtube: now - 2 * D, tiktok: now - 2 * D }, updatedAt: now - 2 * D }, 5),
      { ...newPost(st.settings), id: 'demo6', caption: 'Idea: timelapse of the night market', hashtags: ['nightmarket'], updatedAt: now - 4 * D }
    ];
    useStore.setState({ posts, onboarded: true });
  };
}
