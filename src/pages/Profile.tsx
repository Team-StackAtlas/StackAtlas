import { useState, useEffect } from 'react';
import { ShieldCheck, Settings, LogOut, Bookmark, Activity, Award, ChevronRight, Users, Calendar, Link as LinkIcon, Upload, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useParams } from 'react-router-dom';
import { getPosts, SUPPLEMENTS, STACKS, BRANDS, USERS, User } from '../data/mockData';
import PostCard from '../components/PostCard';
import { useUserScope } from '../context/UserScopeContext';
import { useSaved } from '../hooks/useSaved';
import { SaveButton } from '../components/SaveButton';

function VerificationModal({ isOpen, onClose, onVerify }: { isOpen: boolean, onClose: () => void, onVerify: () => void }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      onVerify();
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">Get Verified</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
            Verification helps build trust in the community and prevents fraudulent reviews.
          </p>

          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
                <h3 className="font-medium text-slate-900 dark:text-zinc-100 mb-2">Why verify?</h3>
                <ul className="text-sm text-slate-600 dark:text-zinc-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>Get a verified badge on your profile and posts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>Build reputation as a trusted researcher</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>Help maintain the quality of the StackAtlas database</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-emerald-500 text-white font-medium py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Start Verification
              </button>
              <button 
                onClick={onClose}
                className="w-full text-slate-500 dark:text-zinc-400 font-medium py-2 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2 block">
                  Upload Identification
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <Upload size={32} className="mx-auto text-slate-400 dark:text-zinc-500 mb-3" />
                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">
                    Driver's License, Passport, or Medical ID (JPG, PNG, PDF)
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2 block">
                  Verification Type
                </label>
                <select className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500/50">
                  <option>Independent Researcher</option>
                  <option>Medical Professional</option>
                  <option>Verified Athlete</option>
                  <option>Verified User</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-medium py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-500 text-white font-medium py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit ID'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { scope } = useUserScope();
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'dispatches' | 'signals' | 'pending_stacks' | 'saved'>('all');
  const [savedFilter, setSavedFilter] = useState<'all' | 'substance' | 'stack' | 'brand' | 'Dispatch' | 'Signal'>('all');
  const { savedItems } = useSaved();
  
  // Default user (admin)
  const defaultUser: User = USERS.find(u => u.username === 'admin') || USERS[0];

  const [user, setUser] = useState<User>(defaultUser);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (username) {
      const foundUser = USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (foundUser) {
        setUser(foundUser);
      } else {
        // Fallback if user not found
        setUser({
          id: 'temp',
          username: username,
          displayName: username,
          bio: 'User not found.',
          joinDate: 'Joined recently',
          followersCount: 0,
          followingCount: 0,
          goldCount: 0,
          platinumCount: 0,
        });
      }
    } else {
      setUser(defaultUser);
    }
  }, [username]);

  const isOwnProfile = !username || username.toLowerCase() === 'admin';
  const userPosts = getPosts().filter(p => p.author.username.toLowerCase() === user.username.toLowerCase());
  
  const filteredPosts = userPosts.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'dispatches') return p.type === 'Dispatch';
    if (activeTab === 'signals') return p.type === 'Signal';
    return true;
  });

  const pendingStacks = STACKS.filter(s => s.creatorId === user.id && s.status === 'pending');

  const handleVerifySuccess = () => {
    // Mock verify success
  };

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    setUser(prev => ({
      ...prev,
      followersCount: isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8 px-4 pt-6 max-w-3xl mx-auto w-full transition-colors duration-200">
      <VerificationModal 
        isOpen={isVerifyModalOpen} 
        onClose={() => setIsVerifyModalOpen(false)} 
        onVerify={handleVerifySuccess}
      />
      {/* Profile Header */}
      <div className="mb-6 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="relative">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-slate-200 dark:bg-zinc-800 border-4 border-white dark:border-zinc-950 flex items-center justify-center text-3xl md:text-4xl font-bold text-slate-500 dark:text-zinc-400 shadow-sm">
              {user.username.charAt(0).toUpperCase()}
            </div>
            {user.isVerified && (
              <div className="absolute bottom-0 right-0 rounded-full bg-emerald-500 p-1 border-2 border-white dark:border-zinc-950" title={user.verificationType}>
                <ShieldCheck size={16} className="text-white" />
              </div>
            )}
          </div>
          
          {isOwnProfile ? (
            <div className="flex gap-2">
              <Link to="/onboarding" className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 dark:border-zinc-700 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm bg-white dark:bg-zinc-900">
                <ShieldCheck 
                  size={16} 
                  className={cn(
                    scope.accessLevel === 'Patient' ? 'text-blue-500' :
                    scope.accessLevel === 'Explorer' ? 'text-purple-500' :
                    'text-emerald-500'
                  )} 
                />
                Edit Scope
              </Link>
              {!user.isVerified && (
                <button onClick={() => setIsVerifyModalOpen(true)} className="px-4 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors shadow-sm">
                  Get Verified
                </button>
              )}
              <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-1.5 rounded-full border border-slate-300 dark:border-zinc-700 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm bg-white dark:bg-zinc-900">
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          ) : (
            <button 
              onClick={handleFollowToggle}
              className={cn(
                "px-6 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm",
                isFollowing 
                  ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 hover:bg-slate-300 dark:hover:bg-zinc-700" 
                  : "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white"
              )}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        
        {isEditing && isOwnProfile ? (
          <div className="w-full space-y-3 mt-2 mb-6 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Username</label>
              <input 
                value={user.username} 
                onChange={e => setUser({...user, username: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500/50" 
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Bio</label>
              <textarea 
                value={user.bio} 
                onChange={e => setUser({...user, bio: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500/50" 
                rows={3} 
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Website</label>
              <input 
                value={user.website} 
                onChange={e => setUser({...user, website: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500/50" 
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm hover:bg-emerald-600 transition-colors shadow-sm">Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              {user.displayName ? `${user.displayName} ` : ''}
              <span className="text-slate-500 dark:text-zinc-400 font-normal text-lg">@{user.username}</span>
            </h2>
            <p className="text-sm text-slate-700 dark:text-zinc-300 mt-3 leading-relaxed max-w-2xl">{user.bio}</p>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-slate-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                {user.joinDate}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-zinc-100">{user.followingCount}</span>
                <span className="text-slate-500 dark:text-zinc-400">Following</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-zinc-100">{user.followersCount}</span>
                <span className="text-slate-500 dark:text-zinc-400">Followers</span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Award size={14} />
                {user.goldCount} Gold
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400">
                <Award size={14} className="text-slate-400" />
                {user.platinumCount} Platinum
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 mb-6">
        <button 
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'all' 
              ? "border-emerald-500 text-slate-900 dark:text-zinc-100" 
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
          )}
        >
          All
        </button>
        <button 
          onClick={() => setActiveTab('dispatches')}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'dispatches' 
              ? "border-emerald-500 text-slate-900 dark:text-zinc-100" 
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
          )}
        >
          Dispatches
        </button>
        <button 
          onClick={() => setActiveTab('signals')}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'signals' 
              ? "border-emerald-500 text-slate-900 dark:text-zinc-100" 
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
          )}
        >
          Signals
        </button>
        {(isOwnProfile || defaultUser.username === 'admin') && pendingStacks.length > 0 && (
          <button 
            onClick={() => setActiveTab('pending_stacks')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'pending_stacks' 
                ? "border-amber-500 text-amber-600 dark:text-amber-400" 
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
            )}
          >
            Pending Stacks
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {pendingStacks.length}
            </span>
          </button>
        )}
        {isOwnProfile && (
          <button 
            onClick={() => setActiveTab('saved')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'saved' 
                ? "border-emerald-500 text-slate-900 dark:text-zinc-100" 
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
            )}
          >
            Saved
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'saved' ? (
          <div>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              {['all', 'substance', 'stack', 'brand', 'Dispatch', 'Signal'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSavedFilter(filter as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    savedFilter === filter
                      ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  )}
                >
                  {filter === 'all' ? 'All' : filter === 'substance' ? 'Substances' : filter === 'stack' ? 'Stacks' : filter === 'brand' ? 'Brands' : filter === 'Dispatch' ? 'Dispatches' : 'Signals'}
                </button>
              ))}
            </div>
            
            {savedItems.filter(item => savedFilter === 'all' || item.type === savedFilter).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedItems
                  .filter(item => savedFilter === 'all' || item.type === savedFilter)
                  .map(item => {
                    let title = '';
                    if (item.type === 'substance') {
                      title = SUPPLEMENTS.find(s => s.id === item.id)?.name || `Substance ${item.id}`;
                    } else if (item.type === 'stack') {
                      title = STACKS.find(s => s.id === item.id)?.name || `Stack ${item.id}`;
                    } else if (item.type === 'brand') {
                      title = BRANDS.find(b => b.id === item.id)?.name || `Brand ${item.id}`;
                    } else {
                      const post = getPosts().find(p => p.id === item.id);
                      title = post?.title || `${item.type} ${item.id}`;
                    }

                    return (
                    <div key={`${item.type}-${item.id}`} className="p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 capitalize">
                          {item.type}
                        </span>
                        <SaveButton id={item.id} type={item.type} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-zinc-100 mb-1 truncate">
                        {title}
                      </h3>
                      <Link 
                        to={
                          item.type === 'substance' ? `/supplement/${item.id}` :
                          item.type === 'stack' ? `/stack/${item.id}` :
                          item.type === 'brand' ? `/brand/${item.id}` :
                          item.type === 'Dispatch' || item.type === 'Signal' ? `/post/${item.id}` : '#'
                        }
                        className="mt-auto pt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                      >
                        View Details &rarr;
                      </Link>
                    </div>
                  )})}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
                <p>No saved items found.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'pending_stacks' ? (
          pendingStacks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingStacks.map(stack => (
                <div key={stack.id} className="p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-amber-200 dark:border-amber-500/30 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{stack.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      Pending Review
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4 flex-1">{stack.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {stack.substances.map((sub: any) => (
                      <span key={sub.id || sub} className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded-md text-[10px] text-slate-600 dark:text-zinc-400">
                        {sub.name || sub}
                      </span>
                    ))}
                  </div>
                  {defaultUser.username === 'admin' && (
                    <button 
                      onClick={() => alert('Stack approved! (Mock)')}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Approve Stack
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
              <p>No pending stacks.</p>
            </div>
          )
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
            <p>No posts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
