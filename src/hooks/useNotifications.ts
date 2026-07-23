import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { NotificationDTO } from '../services/types';

const LOCAL_KEY = 'stackatlas_notifications';
const SETTINGS_KEY = 'stackatlas_notification_settings';

export type NotificationCategory = 'likes' | 'comments' | 'follows' | 'mentions' | 'albums';
export type NotificationSettings = Record<NotificationCategory, boolean>;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  likes: true,
  comments: true,
  follows: true,
  mentions: true,
  albums: true,
};

function readSettings(): NotificationSettings {
  try { return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return DEFAULT_NOTIFICATION_SETTINGS; }
}

function readLocal(userId?: string): NotificationDTO[] {
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(rows) ? rows.filter((row) => !userId || row.userId === userId || !row.userId) : [];
  } catch { return []; }
}

function writeLocal(rows: NotificationDTO[]) { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); }

const MOCK_NOTIFICATIONS: NotificationDTO[] = [
  { id: 'mock-notif-post-like', kind: 'post_like', category: 'likes', title: '@atlas_member liked your Dispatch', link: '/post/p_caf_dispatch', targetType: 'post', targetId: 'p_caf_dispatch', metadata: { actorUsername: 'atlas_member' }, readAt: null, createdAt: '2026-06-15T10:00:00.000Z' },
  { id: 'mock-notif-comment-reply', kind: 'comment_reply', category: 'comments', title: '@protocol_notes replied to your comment', link: '/post/p_mg_dispatch#comments', targetType: 'comment', targetId: 'p_mg_dispatch-c1', metadata: { actorUsername: 'protocol_notes' }, readAt: null, createdAt: '2026-06-15T09:30:00.000Z' },
  { id: 'mock-notif-signal-comment', kind: 'comment', category: 'comments', title: '@hkim commented on your Signal', link: '/post/p_caf_signal#comments', targetType: 'post', targetId: 'p_caf_signal', metadata: { actorUsername: 'hkim' }, readAt: '2026-06-15T09:15:00.000Z', createdAt: '2026-06-15T09:00:00.000Z' },
  { id: 'mock-notif-new-follower', kind: 'follow', category: 'follows', title: '@evan_cross followed you', link: '/profile/biohacker99', targetType: 'user', targetId: 'u2', metadata: { actorUsername: 'evan_cross' }, readAt: null, createdAt: '2026-06-14T18:00:00.000Z' },
  { id: 'mock-notif-follow-request', kind: 'follow_request', category: 'follows', title: '@domonic requested to follow you', link: '/profile?tab=following', targetType: 'follow_request', targetId: 'u3', metadata: { actorUsername: 'domonic' }, readAt: null, createdAt: '2026-06-14T16:00:00.000Z' },
  { id: 'mock-notif-approved-request', kind: 'follow_approved', category: 'follows', title: '@domonic approved your follow request', link: '/profile/longevity_seeker', targetType: 'user', targetId: 'u3', metadata: { actorUsername: 'domonic' }, readAt: '2026-06-14T15:30:00.000Z', createdAt: '2026-06-14T15:00:00.000Z' },
  { id: 'mock-notif-mention', kind: 'mention', category: 'mentions', title: '@hkim mentioned you', link: '/post/p_thea_signal#comments', targetType: 'post', targetId: 'p_thea_signal', metadata: { actorUsername: 'hkim' }, readAt: null, createdAt: '2026-06-14T12:00:00.000Z' },
  { id: 'mock-notif-public-album', kind: 'album_published', category: 'albums', title: '@atlas_member published a public album', link: '/library', targetType: 'album', targetId: 'mock-album-peptide-research', metadata: { actorUsername: 'atlas_member' }, readAt: '2026-06-14T11:00:00.000Z', createdAt: '2026-06-14T10:30:00.000Z' },
  { id: 'mock-notif-album-updated', kind: 'album_updated', category: 'albums', title: '@protocol_notes added 3 items to Peptide Research', link: '/library', targetType: 'album', targetId: 'mock-album-peptide-research', metadata: { actorUsername: 'protocol_notes' }, readAt: null, createdAt: '2026-06-13T20:00:00.000Z' },
];

function mergeMockNotifications(rows: NotificationDTO[]) {
  const seen = new Set(rows.map((row) => row.id));
  return [...rows, ...MOCK_NOTIFICATIONS.filter((row) => !seen.has(row.id))]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function useNotifications() {
  const { services, user, isBackendConfigured } = useAuth();
  const navigate = useNavigate();
  const backed = !!(isBackendConfigured && services && user);
  const [notifications, setNotifications] = useState<NotificationDTO[]>(() => readLocal(user?.id));
  const [settings, setSettingsState] = useState<NotificationSettings>(() => readSettings());

  const refresh = useCallback(async () => {
    if (backed && services && user) {
      const remoteNotifications = await services.notifications.list(user.id);
      await Promise.resolve().then(() => setNotifications(mergeMockNotifications(remoteNotifications)));
      const remoteSettings = await services.notifications.getSettings?.(user.id);
      if (remoteSettings) {
        await Promise.resolve().then(() => setSettingsState({ ...DEFAULT_NOTIFICATION_SETTINGS, ...remoteSettings }));
      }
    } else {
      await Promise.resolve().then(() => setNotifications(mergeMockNotifications(readLocal(user?.id))));
    }
  }, [backed, services, user]);

  useEffect(() => { refresh().catch(console.error); }, [refresh]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const setSettings = (next: NotificationSettings) => {
    setSettingsState(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    if (backed && services && user) services.notifications.updateSettings?.(user.id, next).catch(console.error);
  };

  const markRead = async (id: string) => {
    setNotifications((rows) => rows.map((n) => n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n));
    if (backed && services && user) await services.notifications.markRead(user.id, id);
    writeLocal(mergeMockNotifications(readLocal(user?.id)).map((n) => n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setNotifications((rows) => rows.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    if (backed && services && user) await services.notifications.markAllRead(user.id);
    writeLocal(mergeMockNotifications(readLocal(user?.id)).map((n) => ({ ...n, readAt: n.readAt ?? now }))); 
  };

  const openNotification = async (notification: NotificationDTO) => {
    await markRead(notification.id);
    navigate(notification.link || '/notifications', { state: notification.link ? undefined : { unavailable: true } });
  };

  return { notifications: notifications.filter((n) => settings[(n.category as NotificationCategory) || 'likes'] ?? true), unreadCount, settings, setSettings, refresh, markRead, markAllRead, openNotification };
}
