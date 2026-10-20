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
  accountPrivacy: 'public',
  showFollowersCount: false,
  showFollowersList: false,
  showFollowingCount: false,
  showFollowingList: false,
  ageDisplay: 'exact',
  unitSystem: 'imperial',
  emailUpdates: false,
};

export function withDefaultProfileSettings(settings?: ProfileSettings): Required<ProfileSettings> {
  // Rows saved before the count/list split carry a single showFollowers /
  // showFollowing flag; honour it for both halves until the row is re-saved.
  const legacy = (settings ?? {}) as ProfileSettings & { showFollowers?: boolean; showFollowing?: boolean };
  const merged: Required<ProfileSettings> = { ...DEFAULT_PROFILE_SETTINGS, ...(settings ?? {}) };
  if (legacy.showFollowers !== undefined) {
    merged.showFollowersCount = settings?.showFollowersCount ?? legacy.showFollowers;
    merged.showFollowersList = settings?.showFollowersList ?? legacy.showFollowers;
  }
  if (legacy.showFollowing !== undefined) {
    merged.showFollowingCount = settings?.showFollowingCount ?? legacy.showFollowing;
    merged.showFollowingList = settings?.showFollowingList ?? legacy.showFollowing;
  }
  return merged;
}
