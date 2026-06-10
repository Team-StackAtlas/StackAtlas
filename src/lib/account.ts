import type { ProfileDTO, ProfileSettings } from '../services/types';

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) return 'Username is required.';
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username must be 3–24 characters using lowercase letters, numbers, or underscores.';
  }
  return null;
}

export function isProfileComplete(profile: Pick<ProfileDTO, 'username' | 'displayName'> | null | undefined) {
  return !!profile?.username?.trim() && !!profile?.displayName?.trim();
}

export const DEFAULT_PROFILE_SETTINGS: Required<ProfileSettings> = {
  savedPrivate: true,
  showActivity: false,
  showAvatar: false,
  showAge: false,
  showWeight: false,
  showHeight: false,
  showSex: false,
  showBodyFat: false,
  showFollowers: false,
  showFollowing: false,
  showBodyStats: false,
};

export function withDefaultProfileSettings(settings?: ProfileSettings): Required<ProfileSettings> {
  return { ...DEFAULT_PROFILE_SETTINGS, ...(settings ?? {}) };
}
