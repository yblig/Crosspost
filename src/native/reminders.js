import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = Capacitor.isNativePlatform();

const numId = id => {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000_000 || 1;
};

export const reminders = {
  async ensurePermission() {
    if (!isNative) return true;
    try {
      let p = await LocalNotifications.checkPermissions();
      if (p.display !== 'granted') p = await LocalNotifications.requestPermissions();
      return p.display === 'granted';
    } catch { return false; }
  },

  async schedule(post, title, leadMin = 0) {
    if (!isNative || !post.scheduledAt) return null;
    const at = new Date(post.scheduledAt - leadMin * 60_000);
    if (at.getTime() < Date.now() + 5000) return null;
    const id = numId(post.id);
    await this.cancel(id);
    await LocalNotifications.schedule({
      notifications: [{
        id, title: 'Time to post 🎬', body: `${title} — tap to send it to YouTube & TikTok`,
        schedule: { at, allowWhileIdle: true }, extra: { postId: post.id }, smallIcon: 'ic_stat_notify'
      }]
    });
    return id;
  },

  async cancel(id) {
    if (!isNative || !id) return;
    try { await LocalNotifications.cancel({ notifications: [{ id }] }); } catch { /* ignore */ }
  },

  onOpen(fn) {
    if (!isNative) return;
    LocalNotifications.addListener('localNotificationActionPerformed', e => {
      const postId = e?.notification?.extra?.postId;
      if (postId) fn(postId);
    });
  }
};
