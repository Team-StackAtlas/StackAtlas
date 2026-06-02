import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Compass, Users, PlusSquare, Wrench, Inbox, User, Moon, Sun, Layers, Shield, PenSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { useUserScope } from '../context/UserScopeContext';
import { useState } from 'react';
import PrivacyModal from './PrivacyModal';
import { MockRolePanels } from './MockRolePanels';

export default function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { scope, isInitialized } = useUserScope();
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  if (isInitialized && !scope.accessLevel) {
    return <Navigate to="/onboarding" replace />;
  }

  const navItems = [
    { name: 'Map', path: '/map', icon: Compass },
    { name: 'Square', path: '/square', icon: Users },
    { name: 'Create', path: '/create', icon: PenSquare },
    { name: 'Ledger', path: '/ledger', icon: PlusSquare },
    { name: 'Lab', path: '/lab', icon: Wrench },
    { name: 'Comms', path: '/comms', icon: Inbox },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/map')) return 'Map';
    if (path.startsWith('/square')) return 'Square';
    if (path.startsWith('/create')) return 'Create';
    if (path.startsWith('/ledger')) return 'Ledger';
    if (path.startsWith('/lab')) return 'Lab';
    if (path.startsWith('/comms')) return 'Comms';
    if (path.startsWith('/profile')) return 'Profile';
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 font-sans selection:bg-emerald-500/30 md:flex transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 sticky top-0 h-screen shrink-0">
        <div className="p-6 mb-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-emerald-500 dark:to-emerald-700 text-white shadow-lg overflow-hidden border border-slate-700 dark:border-emerald-400/30">
              <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[size:4px_4px]"></div>
              <Layers size={20} className="relative z-10 text-emerald-400 dark:text-white drop-shadow-md" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-black tracking-tighter text-slate-900 dark:text-zinc-100 uppercase">
              Stack<span className="text-emerald-600 dark:text-emerald-500">Atlas</span>
            </h2>
          </Link>
          <div className="mt-6 px-2">
            <Link to="/onboarding" className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-xs font-medium text-slate-600 dark:text-zinc-400">
              <span className="flex items-center gap-2">
                <Shield 
                  size={14} 
                  className={cn(
                    scope.accessLevel === 'Patient' ? 'text-blue-500' :
                    scope.accessLevel === 'Explorer' ? 'text-purple-500' :
                    'text-emerald-500'
                  )} 
                /> 
                Current Scope
              </span>
              <span className="text-slate-900 dark:text-zinc-200">{scope.accessLevel || 'None'}</span>
            </Link>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                  isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
                )}
              >
                <item.icon size={20} className={cn(isActive && "fill-emerald-500/20")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-4">
          <MockRolePanels />
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </div>
            <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button 
            onClick={() => setIsPrivacyModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
              <Shield size={16} />
            </div>
            <span className="font-medium">Privacy</span>
          </button>
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
              <User size={16} />
            </div>
            <span className="font-medium">Profile</span>
          </Link>
        </div>
      </aside>

      <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Mobile Global Header */}
        <header className="md:hidden sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
              <User size={16} className="text-slate-600 dark:text-zinc-300" />
            </Link>
            
            <h1 className="text-lg font-semibold tracking-tight">
              {getPageTitle()}
            </h1>

            <button onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
              {theme === 'dark' ? <Sun size={16} className="text-zinc-300" /> : <Moon size={16} className="text-slate-600" />}
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-8 py-4 items-center justify-between">
           <h1 className="text-2xl font-bold tracking-tight">
              {getPageTitle()}
            </h1>
        </header>

        <div className="md:hidden p-4 pb-0">
          <MockRolePanels />
        </div>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-md md:max-w-5xl p-0 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md pb-safe">
        <div className="mx-auto flex max-w-md items-center justify-between px-2 h-16">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  isActive ? "text-emerald-600 dark:text-emerald-500" : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
                )}
              >
                <item.icon size={20} className={cn(isActive && "fill-emerald-500/20")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
