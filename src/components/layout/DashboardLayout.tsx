import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, LayoutDashboard, Calendar, BedDouble, Stethoscope, Video,
  FileText, Users, Settings, Bell, Search, Menu, X, Moon, Sun,
  LogOut, ChevronDown, Bot, Building2, BarChart3, MessageCircle, FlaskConical,
  Receipt, ClipboardList, HeartPulse, CalendarRange
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { notificationsApi } from '../../lib/api';
import { cn, getInitials } from '../../lib/utils';
import { Avatar } from '../ui';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<any>;
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/appointments', label: 'Appointments', icon: Calendar },
    { to: '/admin/beds', label: 'Bed Management', icon: BedDouble },
    { to: '/admin/operation-theatres', label: 'Operation Theatres', icon: Stethoscope },
    { to: '/admin/staff-scheduling', label: 'Staff Scheduling', icon: CalendarRange },
    { to: '/admin/doctors', label: 'Doctors', icon: Users },
    { to: '/admin/patients', label: 'Patients', icon: HeartPulse },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/claims', label: 'Claims', icon: Receipt },
    { to: '/admin/video-sessions', label: 'Video Sessions', icon: Video },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  doctor: [
    { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctor/appointments', label: 'Appointments', icon: Calendar },
    { to: '/doctor/patients', label: 'My Patients', icon: Users },
    { to: '/doctor/video-sessions', label: 'Video Calls', icon: Video },
    { to: '/doctor/reports', label: 'Reports', icon: FileText },
    { to: '/doctor/coding', label: 'Medical Coding', icon: ClipboardList },
    { to: '/doctor/schedule', label: 'Schedule', icon: Calendar },
  ],
  patient: [
    { to: '/patient', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/appointments', label: 'Appointments', icon: Calendar },
    { to: '/patient/book', label: 'Book Appointment', icon: Calendar },
    { to: '/patient/video', label: 'Video Consultation', icon: Video },
    { to: '/patient/reports', label: 'Medical Reports', icon: FileText },
    { to: '/patient/prescriptions', label: 'Prescriptions', icon: FlaskConical },
    { to: '/patient/ai-assistant', label: 'AI Health Assistant', icon: Bot },
  ],
};

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { darkMode, toggleDarkMode, sidebarCollapsed, toggleSidebar, setCommandPalette, setAIAssistant } = useUIStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationsApi.getByUser(user!.id),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPalette]);

  if (!user) return null;

  const navItems = navByRole[user.role] || [];
  const basePath = `/${user.role}`;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:sticky top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-40 flex flex-col',
        sidebarCollapsed ? 'w-20' : 'w-64'
      )}>
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center w-full')}>
            <div className="p-2 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl text-white flex-shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white">MediCore</h1>
                <p className="text-xs text-slate-500 capitalize">{user.role} Portal</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === basePath}
              className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active', sidebarCollapsed && 'justify-center')}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {user.role !== 'doctor' && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setAIAssistant(true)}
              className={cn('nav-link text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20', sidebarCollapsed && 'justify-center')}
            >
              <Bot className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>AI Assistant</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
                {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
              <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hidden lg:block">
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCommandPalette(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[200px]"
              >
                <Search className="w-4 h-4" />
                <span>Search...</span>
                <kbd className="ml-auto text-xs bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 max-h-96 overflow-y-auto animate-slide-down">
                      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => notificationsApi.markAllAsRead(user.id)}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => { notificationsApi.markAsRead(n.id); setShowNotifications(false); }}
                            className={cn('p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer', !n.is_read && 'bg-primary-50/50 dark:bg-primary-900/10')}
                          >
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Avatar name={user.full_name || user.email} src={user.avatar_url} size="sm" />
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-slide-down">
                      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <div className="p-2">
                        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
