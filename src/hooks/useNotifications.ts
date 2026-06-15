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

export function useNotifications() {
  const { services, user, isBackendConfigured } = useAuth();
  const navigate = useNavigate();
  const backed = !!(isBackendConfigured && services && user);
  const [notifications, setNotifications] = useState<NotificationDTO[]>(() => readLocal(user?.id));
  const [settings, setSettingsState] = useState<NotificationSettings>(() => readSettings());

  const refresh = useCallback(async () => {
    if (backed && services && user) {
      setNotifications(await services.notifications.list(user.id));
      const remoteSettings = await services.notifications.getSettings?.(user.id);
      if (remoteSettings) setSettingsState({ ...DEFAULT_NOTIFICATION_SETTINGS, ...remoteSettings });
    } else setNotifications(readLocal(user?.id));
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
    else writeLocal(readLocal(user?.id).map((n) => n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setNotifications((rows) => rows.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    if (backed && services && user) await services.notifications.markAllRead(user.id);
    else writeLocal(readLocal(user?.id).map((n) => ({ ...n, readAt: n.readAt ?? now })));
  };

  const openNotification = async (notification: NotificationDTO) => {
    await markRead(notification.id);
    navigate(notification.link || '/notifications');
  };

  return { notifications: notifications.filter((n) => settings[(n.category as NotificationCategory) || 'likes'] ?? true), unreadCount, settings, setSettings, refresh, markRead, markAllRead, openNotification };
}
