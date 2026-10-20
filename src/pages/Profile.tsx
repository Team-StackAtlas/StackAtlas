import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Activity, Bookmark, Calendar, EyeOff, LogOut, Settings, ShieldCheck, Target } from 'lucide-react';
import { BRANDS, getPosts, STACKS, SUPPLEMENTS, USERS } from '../data/mockData';
import { useGoals } from '../hooks/useGoals';
import { GoalsPicker } from '../components/GoalsPicker';
import { usePosts } from '../context/PostsContext';
import PostCard from '../components/PostCard';
import { HiddenGroup, HiddenItem, useHiddenItems } from '../hooks/useHiddenItems';
import { useSaved } from '../hooks/useSaved';
import { useFollowing, type FollowTarget } from '../hooks/useFollowing';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/ToastProvider';
import { ReportAction } from '../components/ReportAction';
import { EmptyState } from '../components/EmptyState';
import type { FollowRequest, ProfileDTO, ProfileSettings, Sex, UnitSystem } from '../services/types';
import { isProfileComplete, normalizeUsername, validateUsername, withDefaultProfileSettings } from '../lib/account';
import { useUnitSystem } from '../hooks/useUnitSystem';
import {
  AGE_RANGES, BODY_FAT, HEIGHT_CM, SEX_OPTIONS, WEIGHT_KG,
  birthYearBounds, cmToFtIn, formatAge, formatHeight, formatWeight, inToCm, kgToLb, lbToKg,
} from '../lib/units';
import AccountSettingsPanel from '../components/AccountSettingsPanel';
import { downscaleImage } from '../lib/imageUtils';
import { usePageMeta } from '../hooks/usePageMeta';
import { ACCENTS } from '../components/ui/accents';

type ProfileTab = 'all' | 'dispatches' | 'signals' | 'stacks' | 'saved' | 'likes' | 'hidden' | 'following' | 'reports' | 'settings';

const hiddenGroups: { key: HiddenGroup; label: string }[] = [
  { key: 'substances', label: 'Substances' },
  { key: 'stacks', label: 'Stacks' },
  { key: 'brands', label: 'Brands' },
  { key: 'tags', label: 'Tags' },
];

function numberOrNull(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === '') return null;
  return Number(value);
}

const INPUT = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950';

type BodyFields = { birthYear: number | null; weightKg: number | null; heightCm: number | null; sex: Sex | null; bodyFatPercentage: number | null };

/** Parse + bound-check the body-stat inputs, converting to metric for storage. */
function readBodyFields(form: FormData, units: UnitSystem): BodyFields | { error: string } {
  const years = birthYearBounds();
  const birthYear = numberOrNull(form.get('birthYear'));
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < years.min || birthYear > years.max)) {
    return { error: `Birth year must be between ${years.min} and ${years.max}.` };
  }

  let weightKg = numberOrNull(form.get('weight'));
  if (weightKg !== null && units === 'imperial') weightKg = lbToKg(weightKg);
  if (weightKg !== null && (weightKg < WEIGHT_KG.min || weightKg > WEIGHT_KG.max)) {
    return { error: `Weight must be between ${formatWeight(WEIGHT_KG.min, units)} and ${formatWeight(WEIGHT_KG.max, units)}.` };
  }
  if (weightKg !== null) weightKg = Math.round(weightKg * 100) / 100;

  let heightCm: number | null;
  if (units === 'imperial') {
    const ft = numberOrNull(form.get('heightFt'));
    const inch = numberOrNull(form.get('heightIn'));
    heightCm = ft === null && inch === null ? null : inToCm((ft ?? 0) * 12 + (inch ?? 0));
  } else {
    heightCm = numberOrNull(form.get('heightCm'));
  }
  if (heightCm !== null && (heightCm < HEIGHT_CM.min || heightCm > HEIGHT_CM.max)) {
    return { error: `Height must be between ${formatHeight(HEIGHT_CM.min, units)} and ${formatHeight(HEIGHT_CM.max, units)}.` };
  }
  if (heightCm !== null) heightCm = Math.round(heightCm * 10) / 10;

  const bodyFatPercentage = numberOrNull(form.get('bodyFatPercentage'));
  if (bodyFatPercentage !== null && (bodyFatPercentage < BODY_FAT.min || bodyFatPercentage > BODY_FAT.max)) {
    return { error: `Body fat must be between ${BODY_FAT.min}% and ${BODY_FAT.max}%.` };
  }

  const sexRaw = String(form.get('sex') ?? '');
  const sex = SEX_OPTIONS.some((o) => o.value === sexRaw) ? (sexRaw as Sex) : null;

  return { birthYear, weightKg, heightCm, sex, bodyFatPercentage };
}

function fieldVisible(profile: ProfileDTO, key: keyof Required<ProfileSettings>, isOwnProfile: boolean) {
  if (isOwnProfile) return true;
  return withDefaultProfileSettings(profile.settings)[key];
}

export default function Profile() {
  const { username } = useParams();
  usePageMeta(username ? `@${username}` : 'Profile');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status, user, profile: authProfile, services, isBackendConfigured, refresh, signOut } = useAuth();
  const { toast } = useToast();
  const { goals, setGoals } = useGoals();
  const { savedItems } = useSaved();
  const { hiddenItems, unhideItem } = useHiddenItems();
  const { following: followedItems, requests: followRequests, isFollowing, requestStatus, toggleFollow } = useFollowing();
  const { posts: allPosts } = usePosts();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(isBackendConfigured);
  const [profileError, setProfileError] = useState('');
  const [isEditing, setIsEditing] = useState(searchParams.get('complete') === '1');
  const [viewerUnits, setViewerUnits] = useUnitSystem();
  // Unit system chosen in the edit form; the body-field inputs remount with
  // converted defaults whenever it changes.
  const [unitDraft, setUnitDraft] = useState<UnitSystem>(viewerUnits);
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => (searchParams.get('tab') as ProfileTab) || 'all');
  const [saving, setSaving] = useState(false);
  // undefined = untouched (keep stored avatar), '' = removed, string = new upload.
  const [avatarDraft, setAvatarDraft] = useState<string | undefined>(undefined);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setAvatarDraft(undefined); setUnitDraft(viewerUnits); }, [isEditing, viewerUnits]);
  const [incomingRequests, setIncomingRequests] = useState<FollowRequest[]>([]);
  const [ownReports, setOwnReports] = useState<{ id: string; targetType: string; targetLabel?: string; status: string; createdAt: string }[]>([]);

  const isOwnProfile = !username || (!!authProfile && username.toLowerCase() === authProfile.username.toLowerCase());

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!isBackendConfigured || !services) {
        const mock = username
          ? USERS.find((candidate) => candidate.username.toLowerCase() === username.toLowerCase())
          : USERS[0];
        // Seed-post authors aren't in USERS; derive a profile from their posts
        // so tapping an author name never dead-ends on "Profile not found."
        const authored = !mock && username
          ? getPosts().filter((post) => post.author.username.toLowerCase() === username.toLowerCase())
          : [];
        const author = authored[0]?.author;
        const base = mock ?? (author
          ? {
              id: author.id,
              username: author.username,
              displayName: author.displayName,
              bio: '',
              isVerified: !!author.isVerified,
              followersCount: authored.reduce((sum, post) => sum + post.helpfulCount, 0),
              followingCount: 0,
            }
          : undefined);
        setProfile(
          base
            ? {
                id: base.id,
                username: base.username,
                displayName: base.displayName,
                bio: base.bio,
                role: 'User',
                researchScope: 'Citizen',
                goals: [],
                isVerified: !!base.isVerified,
                joinDate: new Date().toISOString(),
                settings: {},
                siteRole: 'user',
                accountStatus: 'active',
                stats: {
                  followersCount: base.followersCount,
                  followingCount: base.followingCount,
                  dispatchCount: getPosts().filter((post) => post.author.username === base.username && post.type === 'Dispatch').length,
                  signalCount: getPosts().filter((post) => post.author.username === base.username && post.type === 'Signal').length,
                },
              }
            : null,
        );
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setProfileError('');
      const loaded = username ? await services.profiles.getByUsername(normalizeUsername(username)) : authProfile;
      if (active) {
        setProfile(loaded ?? null);
        setLoadingProfile(false);
      }
    }
    loadProfile().catch((err) => {
      if (active) {
        const message = err instanceof Error ? err.message : 'Failed to load profile.';
        setProfileError(message);
        toast(message, 'error');
        setLoadingProfile(false);
      }
    });
    return () => {
      active = false;
    };
  }, [authProfile, isBackendConfigured, services, toast, username]);


  useEffect(() => {
    if (!isOwnProfile || !services || !user) return;
    services.follows.listRequests(user.id).then(setIncomingRequests).catch(() => setIncomingRequests([]));
    services.reports.listOwn(user.id).then(setOwnReports).catch(() => setOwnReports([]));
  }, [isOwnProfile, services, user]);

  if (isBackendConfigured && !username && status === 'unauthenticated') {
    return <Navigate to={`/login?returnTo=${encodeURIComponent('/profile')}`} replace />;
  }

  const shownProfile = isOwnProfile ? authProfile ?? profile : profile;
  // Checked against shownProfile (what's actually rendered below), not the
  // raw auth-context profile — in mock mode authProfile is always null, so
  // gating on it made this banner show unconditionally on a complete profile.
  const needsCompletion = isOwnProfile && !isProfileComplete(shownProfile);
  const settings = withDefaultProfileSettings(shownProfile?.settings);
  const userPosts = allPosts.filter((post) => post.author.username.toLowerCase() === shownProfile?.username.toLowerCase());
  const filteredPosts = userPosts.filter((post) => {
    if (activeTab === 'dispatches') return post.type === 'Dispatch';
    if (activeTab === 'signals') return post.type === 'Signal';
    return true;
  });
  const publishedStacks = STACKS.filter((stack) => stack.creatorId === shownProfile?.id && stack.status === 'approved');
  const hiddenItemsCount = hiddenGroups.reduce((total, group) => total + hiddenItems[group.key].length, 0);
  const following = shownProfile ? isFollowing('user', shownProfile.id) : false;
  const followRequested = shownProfile ? requestStatus('user', shownProfile.id) === 'pending' : false;
  const isPrivateProfile = settings.accountPrivacy === 'private';
  const canViewProtectedProfile = isOwnProfile || !isPrivateProfile || following;

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shownProfile || !services || !user) return;
    const form = new FormData(event.currentTarget);
    const nextUsername = normalizeUsername(String(form.get('username') ?? ''));
    const usernameError = validateUsername(nextUsername);
    if (usernameError) {
      toast(usernameError, 'error');
      return;
    }
    const displayName = String(form.get('displayName') ?? '').trim();
    if (!displayName) {
      toast('Display name is required to complete your profile.', 'error');
      return;
    }

    setSaving(true);
    try {
      const nextSettings = withDefaultProfileSettings(shownProfile.settings);
      nextSettings.accountPrivacy = form.get('accountPrivacy') === 'private' ? 'private' : 'public';
      (['showAvatar', 'showAge', 'showWeight', 'showHeight', 'showSex', 'showBodyFat', 'showFollowersCount', 'showFollowersList', 'showFollowingCount', 'showFollowingList'] as const).forEach((key) => {
        nextSettings[key] = form.get(key) === 'on';
      });
      nextSettings.ageDisplay = form.get('ageDisplay') === 'range' ? 'range' : 'exact';
      nextSettings.unitSystem = unitDraft;
      nextSettings.savedPrivate = true;

      const body = readBodyFields(form, unitDraft);
      if ('error' in body) {
        toast(body.error, 'error');
        setSaving(false);
        return;
      }

      await services.profiles.update(user.id, {
        username: nextUsername,
        displayName,
        bio: String(form.get('bio') ?? '').trim() || undefined,
        avatarUrl: avatarDraft,
        ...body,
        settings: nextSettings,
      });
      setViewerUnits(unitDraft);
      await refresh();
      setIsEditing(false);
      const returnTo = searchParams.get('returnTo');
      toast('Profile saved.', 'success');
      if (returnTo) navigate(returnTo);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resolveFollowRequest = async (requesterId: string, approved: boolean) => {
    if (!services || !user) return;
    try {
      if (approved) await services.follows.approveRequest(user.id, requesterId);
      else await services.follows.rejectRequest(user.id, requesterId);
      setIncomingRequests((current) => current.filter((request) => request.requesterId !== requesterId));
      toast(approved ? 'Follow request approved.' : 'Follow request rejected.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update follow request.', 'error');
    }
  };

  if (loadingProfile || status === 'loading') {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500 dark:text-zinc-400">Loading profile…</div>;
  }

  if (profileError) {
    return <div className="mx-auto max-w-3xl p-6"><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{profileError}</div></div>;
  }

  if (!shownProfile) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500 dark:text-zinc-400">Profile not found.</div>;
  }

  const showAvatar = fieldVisible(shownProfile, 'showAvatar', isOwnProfile);
  // Stats are stored metric and shown in the *viewer's* units, so an American
  // reading a European profile sees lb and ft/in, and vice versa.
  const bodyStats = [
    fieldVisible(shownProfile, 'showAge', isOwnProfile) && shownProfile.birthYear ? ['Age', formatAge(shownProfile.birthYear, settings.ageDisplay)] : null,
    fieldVisible(shownProfile, 'showWeight', isOwnProfile) && shownProfile.weightKg ? ['Weight', formatWeight(shownProfile.weightKg, viewerUnits)] : null,
    fieldVisible(shownProfile, 'showHeight', isOwnProfile) && shownProfile.heightCm ? ['Height', formatHeight(shownProfile.heightCm, viewerUnits)] : null,
    fieldVisible(shownProfile, 'showSex', isOwnProfile) && shownProfile.sex ? ['Sex', SEX_OPTIONS.find((o) => o.value === shownProfile.sex)?.label ?? shownProfile.sex] : null,
    fieldVisible(shownProfile, 'showBodyFat', isOwnProfile) && shownProfile.bodyFatPercentage ? ['Body fat', `${shownProfile.bodyFatPercentage}%`] : null,
  ].filter(Boolean) as string[][];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-slate-50 px-4 pb-24 pt-6 text-slate-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-50 md:pb-8">
      {needsCompletion && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Complete your profile with a valid username and display name before creating, saving, following, reporting, or editing content.
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        {/* Banner + overlapping avatar, x.com-style */}
        <div className="h-28 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 sm:h-32" />
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between">
            <div className="-mt-11 flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 text-3xl font-bold text-slate-600 shadow-md dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-400">
              {showAvatar && shownProfile.avatarUrl ? <img src={shownProfile.avatarUrl} alt="" className="h-full w-full object-cover" /> : shownProfile.username.charAt(0).toUpperCase()}
            </div>
            {isOwnProfile ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 pt-3">
                {user && (
                  <button onClick={() => signOut()} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="Sign out">
                    <LogOut size={14} className="inline" />
                  </button>
                )}
                <button onClick={() => setIsEditing((value) => !value)} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            ) : (
              <button onClick={() => shownProfile && toggleFollow('user', shownProfile.id)} className="mt-3 shrink-0 rounded-full bg-slate-900 px-6 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
                {followRequested ? 'Requested' : following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div className="mt-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">{shownProfile.displayName || shownProfile.username}</h1>
              {shownProfile.isVerified && <ShieldCheck size={18} className="text-emerald-500" />}
              {(shownProfile.role === 'Admin' || shownProfile.role === 'Developer') && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{shownProfile.role}</span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-slate-500 dark:text-zinc-400">@{shownProfile.username}</p>{!isOwnProfile && <ReportAction targetType="profile" targetId={shownProfile.id} entityName={`@${shownProfile.username}`} />}</div>
            {shownProfile.bio && <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-zinc-300">{shownProfile.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1"><Calendar size={13} /> Joined {new Date(shownProfile.joinDate).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Activity size={13} /> <strong className="font-semibold text-slate-700 dark:text-zinc-300">{shownProfile.stats?.dispatchCount ?? 0}</strong> Dispatches</span>
              <span><strong className="font-semibold text-slate-700 dark:text-zinc-300">{shownProfile.stats?.signalCount ?? 0}</strong> Signals</span>
              {fieldVisible(shownProfile, 'showFollowersCount', isOwnProfile) && (
                <span><strong className="font-semibold text-slate-700 dark:text-zinc-300">{shownProfile.stats?.followersCount ?? 0}</strong> followers</span>
              )}
            </div>
          </div>
        </div>

        {bodyStats.length > 0 && (
          <div className="mx-5 mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-950/50 sm:grid-cols-5">
            {bodyStats.map(([label, value]) => (
              <div key={label}><div className="text-xs text-slate-500 dark:text-zinc-400">{label}</div><div className="font-semibold">{value}</div></div>
            ))}
          </div>
        )}
      </div>

      {isEditing && isOwnProfile && isBackendConfigured && (
        <form onSubmit={saveProfile} className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className={ACCENTS.purple.topBar} />
          <div className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Settings size={18} /> Profile details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Username<input name="username" defaultValue={shownProfile.username} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
            <label className="text-sm font-medium">Display name<input name="displayName" defaultValue={shownProfile.displayName ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
          </div>
          <label className="block text-sm font-medium">Bio<textarea name="bio" defaultValue={shownProfile.bio ?? ''} className="mt-1 h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
          <div>
            <span className="block text-sm font-medium">Profile photo</span>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xl font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                {(avatarDraft === undefined ? shownProfile.avatarUrl : avatarDraft) ? (
                  <img src={avatarDraft === undefined ? shownProfile.avatarUrl : avatarDraft} alt="" className="h-full w-full object-cover" />
                ) : (
                  shownProfile.username.charAt(0).toUpperCase()
                )}
              </span>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    setAvatarDraft(await downscaleImage(file, 256));
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Could not read the image.', 'error');
                  }
                }}
              />
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Upload photo
              </button>
              {(avatarDraft === undefined ? shownProfile.avatarUrl : avatarDraft) && (
                <button type="button" onClick={() => setAvatarDraft('')} className="text-sm font-medium text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400">
                  Remove
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Body stats <span className="font-normal text-slate-500 dark:text-zinc-400">(all optional)</span></span>
              <span className="flex items-center gap-3 text-sm">
                <span className="text-slate-500 dark:text-zinc-400">Units</span>
                {(['imperial', 'metric'] as const).map((u) => (
                  <label key={u} className="capitalize">
                    <input type="radio" name="unitSystem" value={u} checked={unitDraft === u} onChange={() => setUnitDraft(u)} className="mr-1 accent-emerald-500" />
                    {u === 'imperial' ? 'Imperial (lb, ft)' : 'Metric (kg, cm)'}
                  </label>
                ))}
              </span>
            </div>
            <div key={unitDraft} className="grid gap-3 sm:grid-cols-6">
              <label className="text-sm font-medium">Birth year<input name="birthYear" type="number" inputMode="numeric" min={birthYearBounds().min} max={birthYearBounds().max} placeholder="e.g. 1994" defaultValue={shownProfile.birthYear ?? ''} className={INPUT} /></label>
              <label className="text-sm font-medium">Weight ({unitDraft === 'imperial' ? 'lb' : 'kg'})<input name="weight" type="number" step="0.1" min={unitDraft === 'imperial' ? Math.round(kgToLb(WEIGHT_KG.min)) : WEIGHT_KG.min} max={unitDraft === 'imperial' ? Math.round(kgToLb(WEIGHT_KG.max)) : WEIGHT_KG.max} defaultValue={shownProfile.weightKg ? (unitDraft === 'imperial' ? Math.round(kgToLb(shownProfile.weightKg)) : shownProfile.weightKg) : ''} className={INPUT} /></label>
              {unitDraft === 'imperial' ? (
                <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                  <label className="text-sm font-medium">Height (ft)<input name="heightFt" type="number" min={2} max={8} defaultValue={shownProfile.heightCm ? cmToFtIn(shownProfile.heightCm).feet : ''} className={INPUT} /></label>
                  <label className="text-sm font-medium">(in)<input name="heightIn" type="number" min={0} max={11} defaultValue={shownProfile.heightCm ? cmToFtIn(shownProfile.heightCm).inches : ''} className={INPUT} /></label>
                </div>
              ) : (
                <label className="text-sm font-medium sm:col-span-2">Height (cm)<input name="heightCm" type="number" min={HEIGHT_CM.min} max={HEIGHT_CM.max} defaultValue={shownProfile.heightCm ?? ''} className={INPUT} /></label>
              )}
              <label className="text-sm font-medium">Sex
                <select name="sex" defaultValue={shownProfile.sex ?? ''} className={INPUT}>
                  <option value="">Prefer not to say</option>
                  {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Body fat %<input name="bodyFatPercentage" type="number" step="0.1" min={BODY_FAT.min} max={BODY_FAT.max} defaultValue={shownProfile.bodyFatPercentage ?? ''} className={INPUT} /></label>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
              Birth year is shown as your age or an age range, never the year itself. Sharing it helps people find others at a similar stage and helps the community see who its experiences come from.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-500 dark:text-zinc-400">If age is visible, show</span>
              <label><input type="radio" name="ageDisplay" value="exact" defaultChecked={settings.ageDisplay !== 'range'} className="mr-1 accent-emerald-500" /> exact age</label>
              <label><input type="radio" name="ageDisplay" value="range" defaultChecked={settings.ageDisplay === 'range'} className="mr-1 accent-emerald-500" /> age range <span className="text-slate-500 dark:text-zinc-400">({AGE_RANGES.map((r) => r.label).join(', ')})</span></label>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-bold">Account privacy</h3><div className="mb-4 flex gap-3 text-sm"><label><input type="radio" name="accountPrivacy" value="public" defaultChecked={settings.accountPrivacy !== 'private'} className="mr-1 accent-emerald-500" /> Public</label><label><input type="radio" name="accountPrivacy" value="private" defaultChecked={settings.accountPrivacy === 'private'} className="mr-1 accent-emerald-500" /> Private</label></div><h3 className="mb-3 text-sm font-bold">Public visibility toggles</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['showAvatar', 'Avatar/profile image'], ['showAge', 'Age'], ['showWeight', 'Weight'], ['showHeight', 'Height'], ['showSex', 'Sex'], ['showBodyFat', 'Body fat percentage'], ['showFollowersCount', 'Follower count'], ['showFollowersList', 'Who follows me'], ['showFollowingCount', 'Following count'], ['showFollowingList', 'Who I follow'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-zinc-950/50">
                  <span>{label}</span><input name={key} type="checkbox" defaultChecked={!!settings[key]} className="accent-emerald-500" />
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">Everything above is off by default. Saved items, hidden items, drafts, private notes, email, and internal IDs are never public.</p>
          </div>
          <button disabled={saving} className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
          </div>
        </form>
      )}

      {isEditing && isOwnProfile && isBackendConfigured && <AccountSettingsPanel />}

      {isEditing && isOwnProfile && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className={ACCENTS.emerald.topBar} />
          <div className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <Target size={18} className="text-emerald-500" />
            <h2 className="text-lg font-bold">Your goals</h2>
            {goals.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {goals.length}
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">
            We use these to rank substances and discussion for you across the Map and Square. Changes save instantly{isBackendConfigured ? ' and sync to your account' : ''}.
          </p>
          <GoalsPicker
            selected={goals}
            onToggle={(name) =>
              setGoals(goals.includes(name) ? goals.filter((g) => g !== name) : [...goals, name])
            }
          />
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(canViewProtectedProfile ? (['all', 'dispatches', 'signals', 'stacks'] as ProfileTab[]) : ([] as ProfileTab[])).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-white text-slate-600 dark:bg-zinc-900 dark:text-zinc-400'}`}>{tab}</button>
        ))}
        {isOwnProfile && ['saved', 'likes', 'hidden', 'following', 'reports'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as ProfileTab)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-white text-slate-600 dark:bg-zinc-900 dark:text-zinc-400'}`}>{tab}</button>
        ))}
      </div>

      <div className="space-y-4">
        {!canViewProtectedProfile ? (
          <EmptyState description="This account is private. Follow this user and wait for approval to view their posts and stacks." />
        ) : activeTab === 'stacks' ? (
          publishedStacks.length ? publishedStacks.map((stack) => <Link key={stack.id} to={`/stack/${stack.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"><h3 className="font-bold">{stack.name}</h3><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{stack.description}</p></Link>) : <EmptyState description="No published stacks." />
        ) : activeTab === 'saved' && isOwnProfile ? (
          savedItems.length ? <div className="grid gap-3 sm:grid-cols-2">{savedItems.map((item) => <div key={`${item.type}-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"><Bookmark size={16} className="text-emerald-500" /><h3 className="mt-2 font-semibold">{item.id}</h3><p className="text-xs text-slate-500">{item.type}</p></div>)}</div> : <EmptyState description="No saved items found. Saved items are private." />
        ) : activeTab === 'likes' && isOwnProfile ? (
          <EmptyState description="Liked posts are private. No liked posts found." />
        ) : activeTab === 'hidden' && isOwnProfile ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className={ACCENTS.rose.topBar} />
            <div className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><EyeOff size={18} /> Hidden Items</h2>
            {hiddenItemsCount === 0 ? <EmptyState description="No hidden items yet. Hidden items are private." /> : hiddenGroups.map((group) => {
              const groupItems: HiddenItem[] = hiddenItems[group.key];
              return <section key={group.key} className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</h3>{groupItems.length ? groupItems.map((item) => <div key={`${item.type}-${item.id}`} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">{item.name}</span><button onClick={() => unhideItem(item.type, item.id)} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white">Unhide</button></div>) : <p className="text-sm text-slate-500">None hidden.</p>}</section>;
            })}
            </div>
          </div>
        ) : activeTab === 'following' && isOwnProfile ? (
          <FollowingManagement followedItems={followedItems} followRequests={followRequests} incomingRequests={incomingRequests} onUnfollow={toggleFollow} onResolveRequest={resolveFollowRequest} />
        ) : activeTab === 'reports' && isOwnProfile ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"><div className={ACCENTS.amber.topBar} /><div className="p-5"><h2 className="mb-1 text-lg font-bold">My reports</h2><p className="mb-4 text-sm text-slate-500">Private admin notes and punishment details are not shown.</p>{ownReports.length ? ownReports.map((report) => <div key={report.id} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-950/50"><strong>{report.targetType}</strong> {report.targetLabel}<span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs capitalize dark:bg-zinc-800">{report.status.replace('_', ' ')}</span><p className="text-xs text-slate-500">Submitted {new Date(report.createdAt).toLocaleString()}</p></div>) : <EmptyState description="No submitted reports." />}</div></div>
        ) : filteredPosts.length ? (
          filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <EmptyState description="No published Dispatches or Signals found." />
        )}
      </div>
    </div>
  );
}


function FollowingManagement({ followedItems, followRequests, incomingRequests, onUnfollow, onResolveRequest }: { followedItems: { targetType: FollowTarget; targetId: string }[]; followRequests: { targetId: string }[]; incomingRequests: FollowRequest[]; onUnfollow: (type: FollowTarget, id: string) => void; onResolveRequest: (requesterId: string, approved: boolean) => void }) {
  const sections = [
    ['Users', 'user', (id: string) => USERS.find((item) => item.id === id)?.username ?? id],
    ['Substances', 'substance', (id: string) => SUPPLEMENTS.find((item) => item.id === id)?.name ?? id],
    ['Brands', 'brand', (id: string) => BRANDS.find((item) => item.id === id)?.name ?? id],
    ['Stacks', 'stack', (id: string) => STACKS.find((item) => item.id === id)?.name ?? id],
    ['Public Albums', 'album', (id: string) => id],
  ] as const;
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"><div className={ACCENTS.blue.topBar} /><div className="p-5"><h2 className="mb-1 text-lg font-bold">Following</h2><p className="mb-4 text-sm text-slate-500">Only you can see and manage these lists.</p>{incomingRequests.length > 0 && <section className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Follow requests</h3>{incomingRequests.map((request) => <div key={request.requesterId} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">@{request.username ?? request.requesterId}</span><span className="flex gap-2"><button onClick={() => onResolveRequest(request.requesterId, true)} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white">Approve</button><button onClick={() => onResolveRequest(request.requesterId, false)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">Reject</button></span></div>)}</section>}{followRequests.length > 0 && <section className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Pending requests</h3>{followRequests.map((request) => <div key={request.targetId} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">@{USERS.find((item) => item.id === request.targetId)?.username ?? request.targetId}</span><button onClick={() => onUnfollow('user', request.targetId)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">Cancel request</button></div>)}</section>}{sections.map(([label, type, nameFor]) => { const items = followedItems.filter((item) => item.targetType === type); return <section key={type} className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h3>{items.length ? items.map((item) => <div key={`${item.targetType}-${item.targetId}`} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">{nameFor(item.targetId)}</span><button onClick={() => onUnfollow(item.targetType, item.targetId)} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white">Unfollow</button></div>) : <p className="text-sm text-slate-500">None followed.</p>}</section>; })}</div></div>;
}
