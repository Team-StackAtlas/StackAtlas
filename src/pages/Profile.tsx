import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Activity, Bookmark, Calendar, EyeOff, LogOut, Settings, ShieldCheck, Target } from 'lucide-react';
import { BRANDS, getPosts, STACKS, SUPPLEMENTS, USERS } from '../data/mockData';
import { useUserScope } from '../context/UserScopeContext';
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
import type { FollowRequest, ProfileDTO, ProfileSettings } from '../services/types';
import { isProfileComplete, normalizeUsername, validateUsername, withDefaultProfileSettings } from '../lib/account';

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

function fieldVisible(profile: ProfileDTO, key: keyof Required<ProfileSettings>, isOwnProfile: boolean) {
  if (isOwnProfile) return true;
  return withDefaultProfileSettings(profile.settings)[key];
}

export default function Profile() {
  const { username } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status, user, profile: authProfile, services, isBackendConfigured, refresh, signOut } = useAuth();
  const { toast } = useToast();
  const { scope, updateScope } = useUserScope();
  const { savedItems } = useSaved();
  const { hiddenItems, unhideItem } = useHiddenItems();
  const { following: followedItems, requests: followRequests, isFollowing, requestStatus, toggleFollow } = useFollowing();
  const { posts: allPosts } = usePosts();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(isBackendConfigured);
  const [profileError, setProfileError] = useState('');
  const [isEditing, setIsEditing] = useState(searchParams.get('complete') === '1');
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => (searchParams.get('tab') as ProfileTab) || 'all');
  const [saving, setSaving] = useState(false);
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
        setProfile(
          mock
            ? {
                id: mock.id,
                username: mock.username,
                displayName: mock.displayName,
                bio: mock.bio,
                role: 'User',
                researchScope: 'Citizen',
                isVerified: !!mock.isVerified,
                joinDate: new Date().toISOString(),
                settings: {},
                siteRole: 'user',
                accountStatus: 'active',
                stats: {
                  followersCount: mock.followersCount,
                  followingCount: mock.followingCount,
                  dispatchCount: getPosts().filter((post) => post.author.username === mock.username && post.type === 'Dispatch').length,
                  signalCount: getPosts().filter((post) => post.author.username === mock.username && post.type === 'Signal').length,
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
      (['showActivity', 'showAvatar', 'showAge', 'showWeight', 'showHeight', 'showSex', 'showBodyFat', 'showFollowers', 'showFollowing', 'showBodyStats'] as const).forEach((key) => {
        nextSettings[key] = form.get(key) === 'on';
      });
      nextSettings.savedPrivate = true;

      await services.profiles.update(user.id, {
        username: nextUsername,
        displayName,
        bio: String(form.get('bio') ?? '').trim() || undefined,
        avatarUrl: String(form.get('avatarUrl') ?? '').trim() || undefined,
        age: numberOrNull(form.get('age')),
        weight: numberOrNull(form.get('weight')),
        height: numberOrNull(form.get('height')),
        sex: String(form.get('sex') ?? '').trim() || null,
        bodyFatPercentage: numberOrNull(form.get('bodyFatPercentage')),
        settings: nextSettings,
      });
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
  const showBodyStats = fieldVisible(shownProfile, 'showBodyStats', isOwnProfile);
  const bodyStats = [
    fieldVisible(shownProfile, 'showAge', isOwnProfile) && shownProfile.age ? ['Age', String(shownProfile.age)] : null,
    fieldVisible(shownProfile, 'showWeight', isOwnProfile) && shownProfile.weight ? ['Weight', `${shownProfile.weight} lb`] : null,
    fieldVisible(shownProfile, 'showHeight', isOwnProfile) && shownProfile.height ? ['Height', `${shownProfile.height} in`] : null,
    fieldVisible(shownProfile, 'showSex', isOwnProfile) && shownProfile.sex ? ['Sex', shownProfile.sex] : null,
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
            <div className="-mt-11 flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 text-3xl font-bold text-slate-500 shadow-md dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-400">
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
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-500 dark:text-zinc-500">
              <span className="flex items-center gap-1"><Calendar size={13} /> Joined {new Date(shownProfile.joinDate).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Activity size={13} /> <strong className="font-semibold text-slate-700 dark:text-zinc-300">{shownProfile.stats?.dispatchCount ?? 0}</strong> Dispatches</span>
              <span><strong className="font-semibold text-slate-700 dark:text-zinc-300">{shownProfile.stats?.signalCount ?? 0}</strong> Signals</span>
              <span><strong className="font-semibold text-slate-700 dark:text-zinc-300">{shownProfile.stats?.followersCount ?? 0}</strong> followers</span>
            </div>
          </div>
        </div>

        {showBodyStats && bodyStats.length > 0 && (
          <div className="mx-5 mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-950/50 sm:grid-cols-5">
            {bodyStats.map(([label, value]) => (
              <div key={label}><div className="text-xs text-slate-500 dark:text-zinc-500">{label}</div><div className="font-semibold">{value}</div></div>
            ))}
          </div>
        )}
      </div>

      {isEditing && isOwnProfile && isBackendConfigured && (
        <form onSubmit={saveProfile} className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Settings size={18} /> Profile details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Username<input name="username" defaultValue={shownProfile.username} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
            <label className="text-sm font-medium">Display name<input name="displayName" defaultValue={shownProfile.displayName ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
          </div>
          <label className="block text-sm font-medium">Bio<textarea name="bio" defaultValue={shownProfile.bio ?? ''} className="mt-1 h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
          <label className="block text-sm font-medium">Avatar URL<input name="avatarUrl" defaultValue={shownProfile.avatarUrl ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
          <div className="grid gap-3 sm:grid-cols-5">
            <label className="text-sm font-medium">Age<input name="age" type="number" defaultValue={shownProfile.age ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
            <label className="text-sm font-medium">Weight<input name="weight" type="number" step="0.1" defaultValue={shownProfile.weight ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
            <label className="text-sm font-medium">Height<input name="height" type="number" step="0.1" defaultValue={shownProfile.height ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
            <label className="text-sm font-medium">Sex<input name="sex" defaultValue={shownProfile.sex ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
            <label className="text-sm font-medium">Body fat %<input name="bodyFatPercentage" type="number" step="0.1" defaultValue={shownProfile.bodyFatPercentage ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" /></label>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-bold">Account privacy</h3><div className="mb-4 flex gap-3 text-sm"><label><input type="radio" name="accountPrivacy" value="public" defaultChecked={settings.accountPrivacy !== 'private'} className="mr-1 accent-emerald-500" /> Public</label><label><input type="radio" name="accountPrivacy" value="private" defaultChecked={settings.accountPrivacy === 'private'} className="mr-1 accent-emerald-500" /> Private</label></div><h3 className="mb-3 text-sm font-bold">Public visibility toggles</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['showAvatar', 'Avatar/profile image'], ['showAge', 'Age'], ['showWeight', 'Weight'], ['showHeight', 'Height'], ['showSex', 'Sex'], ['showBodyFat', 'Body fat percentage'], ['showFollowers', 'Followers list/count'], ['showFollowing', 'Following list/count'], ['showBodyStats', 'Public body-stats section'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-zinc-950/50">
                  <span>{label}</span><input name={key} type="checkbox" defaultChecked={!!settings[key as keyof Pick<Required<ProfileSettings>, 'showAvatar' | 'showAge' | 'showWeight' | 'showHeight' | 'showSex' | 'showBodyFat' | 'showFollowers' | 'showFollowing' | 'showBodyStats'>]} className="accent-emerald-500" />
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-zinc-500">Saved items, hidden items, drafts, private notes, email, internal IDs, and body fields with toggles off stay private.</p>
          </div>
          <button disabled={saving} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
      )}

      {isOwnProfile && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-1 flex items-center gap-2">
            <Target size={18} className="text-emerald-500" />
            <h2 className="text-lg font-bold">Your goals</h2>
            {scope.goals.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {scope.goals.length}
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">
            We use these to rank substances and discussion for you across the Map and Square. Changes save instantly.
          </p>
          <GoalsPicker
            selected={scope.goals}
            onToggle={(name) =>
              updateScope({
                goals: scope.goals.includes(name)
                  ? scope.goals.filter((g) => g !== name)
                  : [...scope.goals, name],
              })
            }
          />
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><EyeOff size={18} /> Hidden Items</h2>
            {hiddenItemsCount === 0 ? <EmptyState description="No hidden items yet. Hidden items are private." /> : hiddenGroups.map((group) => {
              const groupItems: HiddenItem[] = hiddenItems[group.key];
              return <section key={group.key} className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</h3>{groupItems.length ? groupItems.map((item) => <div key={`${item.type}-${item.id}`} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">{item.name}</span><button onClick={() => unhideItem(item.type, item.id)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white">Unhide</button></div>) : <p className="text-sm text-slate-500">None hidden.</p>}</section>;
            })}
          </div>
        ) : activeTab === 'following' && isOwnProfile ? (
          <FollowingManagement followedItems={followedItems} followRequests={followRequests} incomingRequests={incomingRequests} onUnfollow={toggleFollow} onResolveRequest={resolveFollowRequest} />
        ) : activeTab === 'reports' && isOwnProfile ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"><h2 className="mb-1 text-lg font-bold">My reports</h2><p className="mb-4 text-sm text-slate-500">Private admin notes and punishment details are not shown.</p>{ownReports.length ? ownReports.map((report) => <div key={report.id} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-950/50"><strong>{report.targetType}</strong> {report.targetLabel}<span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs capitalize dark:bg-zinc-800">{report.status.replace('_', ' ')}</span><p className="text-xs text-slate-500">Submitted {new Date(report.createdAt).toLocaleString()}</p></div>) : <EmptyState description="No submitted reports." />}</div>
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
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"><h2 className="mb-1 text-lg font-bold">Following</h2><p className="mb-4 text-sm text-slate-500">Only you can see and manage these lists.</p>{incomingRequests.length > 0 && <section className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Follow requests</h3>{incomingRequests.map((request) => <div key={request.requesterId} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">@{request.username ?? request.requesterId}</span><span className="flex gap-2"><button onClick={() => onResolveRequest(request.requesterId, true)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white">Approve</button><button onClick={() => onResolveRequest(request.requesterId, false)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">Reject</button></span></div>)}</section>}{followRequests.length > 0 && <section className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Pending requests</h3>{followRequests.map((request) => <div key={request.targetId} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">@{USERS.find((item) => item.id === request.targetId)?.username ?? request.targetId}</span><button onClick={() => onUnfollow('user', request.targetId)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">Cancel request</button></div>)}</section>}{sections.map(([label, type, nameFor]) => { const items = followedItems.filter((item) => item.targetType === type); return <section key={type} className="mb-5"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h3>{items.length ? items.map((item) => <div key={`${item.targetType}-${item.targetId}`} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/50"><span className="font-semibold">{nameFor(item.targetId)}</span><button onClick={() => onUnfollow(item.targetType, item.targetId)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white">Unfollow</button></div>) : <p className="text-sm text-slate-500">None followed.</p>}</section>; })}</div>;
}
