import { Menu, Sun, Moon, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getRoleLabel } from '../../lib/utils';
import type { Page } from '../../lib/types';

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  events: 'Events',
  event_detail: 'Event Detail',
  services: 'Service Catalog',
  marketplace: 'Service Marketplace',
  my_booth: 'My Booth',
  showcase: 'My Showcase',
  orders: 'Orders',
  payments: 'Payments',
  work_tracking: 'Work Tracking',
  monitoring: 'Monitoring',
  reports: 'Reports & Analytics',
};

interface Props {
  currentPage: Page;
  onMobileMenuToggle: () => void;
}

export default function Header({ currentPage, onMobileMenuToggle }: Props) {
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {pageTitles[currentPage]}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {profile && (
          <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {(profile?.full_name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{profile.full_name || '—'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{getRoleLabel(profile.role)}</p>
            </div>
          </div>
        )}

        <button
          onClick={signOut}
          className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
