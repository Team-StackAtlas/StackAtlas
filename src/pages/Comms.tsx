import { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, MessageSquare, AtSign, Heart, Repeat, Info, Users, Search, Send, ChevronLeft, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useUserScope } from '../context/UserScopeContext';

// ... existing interfaces and INITIAL_QUARTERS ...
interface QuarterMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

interface Quarter {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  messages: QuarterMessage[];
}

const INITIAL_QUARTERS: Quarter[] = [
  {
    id: 'q1',
    name: 'Bodybuilding',
    description: 'Discuss hypertrophy, strength training, and related stacks.',
    memberCount: 1240,
    messages: [
      { id: 'm1', user: 'IronAddict', text: 'Anyone running a new cycle?', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
      { id: 'm2', user: 'GymBro', text: 'Just started Test E 300mg/week.', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() }
    ]
  },
  {
    id: 'q2',
    name: 'Fat Loss',
    description: 'Strategies, supplements, and protocols for cutting.',
    memberCount: 890,
    messages: [
      { id: 'm1', user: 'LeanMachine', text: 'Semaglutide is a game changer.', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() }
    ]
  },
  {
    id: 'q3',
    name: 'Sleep Optimization',
    description: 'Deep sleep, REM, and recovery protocols.',
    memberCount: 2100,
    messages: [
      { id: 'm1', user: 'SleepHacker', text: 'Magnesium Glycinate + L-Theanine before bed works wonders.', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() }
    ]
  },
  {
    id: 'q4',
    name: 'Longevity',
    description: 'Anti-aging, healthspan, and lifespan extension.',
    memberCount: 1500,
    messages: [
      { id: 'm1', user: 'LifeExtender', text: 'Thoughts on Rapamycin cycling?', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
    ]
  },
  {
    id: 'q5',
    name: 'Peptide Research',
    description: 'BPC-157, TB-500, and other experimental peptides.',
    memberCount: 3400,
    messages: [
      { id: 'm1', user: 'PepNerd', text: 'BPC-157 healed my shoulder in 2 weeks.', timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString() }
    ]
  }
];

export default function Inbox() {
  const [activeTab, setActiveTab] = useState<'All' | 'Messages' | 'Mentions' | 'Quarters' | 'Settings'>('All');
  const [quarters, setQuarters] = useState<Quarter[]>(() => {
    const saved = localStorage.getItem('stackatlas_quarters');
    return saved ? JSON.parse(saved) : INITIAL_QUARTERS;
  });
  const [joinedQuarters, setJoinedQuarters] = useState<string[]>(() => {
    const saved = localStorage.getItem('stackatlas_joined_quarters');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuarter, setActiveQuarter] = useState<Quarter | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { scope } = useUserScope();

  const [notificationSettings, setNotificationSettings] = useState({
    mentions: true,
    replies: true,
    likes: false,
    updates: true,
  });

  const currentUser = 'admin'; // Mock current user

  useEffect(() => {
    localStorage.setItem('stackatlas_quarters', JSON.stringify(quarters));
  }, [quarters]);

  useEffect(() => {
    localStorage.setItem('stackatlas_joined_quarters', JSON.stringify(joinedQuarters));
  }, [joinedQuarters]);

  useEffect(() => {
    if (activeQuarter) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeQuarter?.messages]);

  const handleJoinLeave = (quarterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJoinedQuarters(prev => 
      prev.includes(quarterId) ? prev.filter(id => id !== quarterId) : [...prev, quarterId]
    );
    setQuarters(prev => prev.map(q => {
      if (q.id === quarterId) {
        return { ...q, memberCount: joinedQuarters.includes(quarterId) ? q.memberCount - 1 : q.memberCount + 1 };
      }
      return q;
    }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeQuarter) return;

    const newMsg: QuarterMessage = {
      id: `m${Date.now()}`,
      user: currentUser,
      text: newMessage,
      timestamp: new Date().toISOString()
    };

    setQuarters(prev => prev.map(q => {
      if (q.id === activeQuarter.id) {
        const updated = { ...q, messages: [...q.messages, newMsg] };
        setActiveQuarter(updated);
        return updated;
      }
      return q;
    }));
    setNewMessage('');
  };

  const notifications = [
    {
      id: 'n1',
      type: 'mention',
      user: 'NootropicNerd',
      action: 'mentioned you in a post',
      target: 'My experience with L-Theanine and Coffee',
      time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      read: false,
    },
    {
      id: 'n2',
      type: 'reply',
      user: 'IronAddict',
      action: 'replied to your comment on',
      target: 'First Cycle: Test E 300mg/week',
      time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: true,
    },
    {
      id: 'n3',
      type: 'like',
      user: 'HealingJourney',
      action: 'liked your post',
      target: 'BPC-157 completely healed my rotator cuff tear',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      read: true,
    },
    {
      id: 'n4',
      type: 'update',
      user: 'System',
      action: 'New research added for',
      target: 'L-Theanine',
      time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      read: true,
    },
  ];

  const messages = [
    {
      id: 'm1',
      user: 'NootropicNerd',
      preview: 'Hey, I saw your post about BPC-157. Did you...',
      time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      unread: 2,
    },
    {
      id: 'm2',
      user: 'IronAddict',
      preview: 'Thanks for the advice on the cycle length.',
      time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      unread: 0,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'mention': return <AtSign size={16} className="text-blue-400" />;
      case 'reply': return <Repeat size={16} className="text-emerald-400" />;
      case 'like': return <Heart size={16} className="text-pink-400" />;
      case 'update': return <Info size={16} className="text-amber-400" />;
      default: return <Bell size={16} className="text-zinc-400" />;
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => {
        if (!notificationSettings[n.type as keyof typeof notificationSettings]) return false;
        if (activeTab === 'Mentions' && n.type !== 'mention') return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return n.user.toLowerCase().includes(q) || n.target.toLowerCase().includes(q) || n.action.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [notifications, activeTab, searchQuery, notificationSettings]);

  const filteredMessages = useMemo(() => {
    return messages
      .filter(m => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return m.user.toLowerCase().includes(q) || m.preview.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [messages, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8 max-w-3xl mx-auto w-full transition-colors duration-200">
      {/* Filter Tabs */}
      {!activeQuarter && (
        <div className="sticky top-14 md:top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
          <div className="flex w-full px-4 py-2 gap-2 overflow-x-auto no-scrollbar">
            {['All', 'Messages', 'Mentions', 'Quarters', 'Settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" 
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200"
                )}
              >
                {tab === 'Settings' ? <SettingsIcon size={16} /> : tab}
              </button>
            ))}
          </div>
          
          {/* Search Bar */}
          {activeTab !== 'Settings' && activeTab !== 'Quarters' && (
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search messages and notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-zinc-900 border-none rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 px-4 pt-4 space-y-2">
        {activeTab === 'Settings' && !activeQuarter && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider mb-4 px-2">Notification Settings</h3>
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 capitalize">{key}</span>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      value ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform",
                      value ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'All' || activeTab === 'Mentions') && !activeQuarter && (
          <div className="space-y-2">
            {activeTab === 'All' && <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2">Notifications</h3>}
            {filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "flex gap-3 p-4 rounded-2xl border transition-all",
                    notification.read 
                      ? "bg-white/50 dark:bg-zinc-900/30 border-slate-200/50 dark:border-zinc-800/50" 
                      : "bg-white dark:bg-zinc-900/80 border-slate-300 dark:border-zinc-700 shadow-sm dark:shadow-lg"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    notification.read ? "bg-slate-100 dark:bg-zinc-800/50" : "bg-slate-200 dark:bg-zinc-800"
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm leading-snug",
                      !notification.read ? "text-slate-900 dark:text-zinc-100 font-medium" : "text-slate-700 dark:text-zinc-300"
                    )}>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">{notification.user}</span>{' '}
                      {notification.action}{' '}
                      <span className="font-medium text-slate-800 dark:text-zinc-200">"{notification.target}"</span>
                    </p>
                    <p className={cn(
                      "text-xs mt-1",
                      !notification.read ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-500 dark:text-zinc-500"
                    )}>
                      {formatDistanceToNow(new Date(notification.time))} ago
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                  )}
                </div>
              ))}
          </div>
        )}

        {(activeTab === 'All' || activeTab === 'Messages') && !activeQuarter && (
          <div className="space-y-2 mt-6">
            {activeTab === 'All' && <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2">Direct Messages</h3>}
            {filteredMessages.map(message => (
              <div 
                key={message.id} 
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer shadow-sm",
                  message.unread > 0 
                    ? "bg-white dark:bg-zinc-900/80 border-slate-300 dark:border-zinc-700" 
                    : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                )}
              >
                <div className="h-12 w-12 shrink-0 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border border-slate-200 dark:border-zinc-700">
                  <span className="text-lg font-bold text-slate-500 dark:text-zinc-400">{message.user.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className={cn(
                      "text-sm truncate",
                      message.unread > 0 ? "font-bold text-slate-900 dark:text-zinc-100" : "font-semibold text-slate-900 dark:text-zinc-100"
                    )}>{message.user}</h4>
                    <span className={cn(
                      "text-xs shrink-0 ml-2",
                      message.unread > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-500 dark:text-zinc-500"
                    )}>
                      {formatDistanceToNow(new Date(message.time))}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm truncate",
                    message.unread > 0 ? "text-slate-900 dark:text-zinc-100 font-medium" : "text-slate-500 dark:text-zinc-500"
                  )}>
                    {message.preview}
                  </p>
                </div>
                {message.unread > 0 && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white dark:text-zinc-950">
                    {message.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Quarters' && !activeQuarter && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search Quarters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 text-slate-900 dark:text-zinc-100"
              />
            </div>
            
            <div className="space-y-2">
              {quarters
                .filter(q => q.name.toLowerCase().includes(searchQuery.toLowerCase()) || q.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(quarter => {
                  const isJoined = joinedQuarters.includes(quarter.id);
                  return (
                    <div 
                      key={quarter.id}
                      onClick={() => isJoined && setActiveQuarter(quarter)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all",
                        isJoined 
                          ? "bg-white dark:bg-zinc-900/80 border-slate-300 dark:border-zinc-700 shadow-sm cursor-pointer hover:border-emerald-500/50" 
                          : "bg-slate-50 dark:bg-zinc-900/30 border-slate-200 dark:border-zinc-800/50"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-100">{quarter.name}</h4>
                        <button
                          onClick={(e) => handleJoinLeave(quarter.id, e)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                            isJoined
                              ? "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700"
                              : "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
                          )}
                        >
                          {isJoined ? 'Leave' : 'Join'}
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-zinc-400 mb-3">{quarter.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500">
                        <Users size={14} />
                        {quarter.memberCount.toLocaleString()} members
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        )}

        {activeQuarter && (
          <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-zinc-950 flex flex-col md:relative md:inset-auto md:h-[calc(100vh-12rem)] md:border md:border-slate-200 md:dark:border-zinc-800 md:rounded-2xl md:overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
              <button 
                onClick={() => setActiveQuarter(null)}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100">{activeQuarter.name}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{activeQuarter.memberCount.toLocaleString()} members</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeQuarter.messages.map(msg => {
                const isMe = msg.user === currentUser;
                return (
                  <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "items-start")}>
                    {!isMe && <span className="text-xs text-slate-500 dark:text-zinc-500 ml-1 mb-1">{msg.user}</span>}
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm",
                      isMe 
                        ? "bg-emerald-500 text-white rounded-br-sm" 
                        : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 rounded-bl-sm"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1 mx-1">
                      {formatDistanceToNow(new Date(msg.timestamp))} ago
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message Quarter..."
                  className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-900 dark:text-zinc-100"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
