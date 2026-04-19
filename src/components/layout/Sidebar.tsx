import {
  LayoutDashboard, CalendarDays, Users, Layers, ShoppingBag,
  Package, ClipboardList, CreditCard, Wrench, BarChart3,
  Activity, X, Zap, Store,
} from 'lucide-react';
import type { Page, UserRole } from '../../lib/types';
import { getRoleLabel } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
  section?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'eo_admin', 'exhibitor', 'contractor'] },
  { id: 'users', label: 'User Management', icon: Users, roles: ['super_admin'], section: 'Administration' },
  { id: 'events', label: 'Events', icon: CalendarDays, roles: ['super_admin', 'eo_admin'], section: 'Administration' },
  { id: 'services', label: 'Service Catalog', icon: Package, roles: ['super_admin'], section: 'Administration' },
  { id: 'orders', label: 'All Orders', icon: ClipboardList, roles: ['eo_admin', 'super_admin'], section: 'Operations' },
  { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['eo_admin', 'super_admin'], section: 'Operations' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, roles: ['eo_admin', 'super_admin'], section: 'Operations' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['super_admin'], section: 'Insights' },
  { id: 'my_booth', label: 'My Booth', icon: Layers, roles: ['exhibitor'], section: 'My Space' },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, roles: ['exhibitor'], section: 'My Space' },
  { id: 'showcase', label: 'My Showcase', icon: Store, roles: ['exhibitor'], section: 'My Space' },
  { id: 'orders', label: 'My Orders', icon: ClipboardList, roles: ['exhibitor'], section: 'My Space' },
  { id: 'payments', label: 'My Payments', icon: CreditCard, roles: ['exhibitor'], section: 'My Space' },
  { id: 'work_tracking', label: 'My Jobs', icon: Wrench, roles: ['contractor'], section: 'My Work' },
];

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ currentPage, onNavigate, mobileOpen, onMobileClose }: Props) {
  const { profile } = useAuth();
  const role = profile?.role as UserRole | undefined;

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));
  const sections = Array.from(new Set(visibleItems.map((i) => i.section ?? ''))).filter(Boolean);
  const noSectionItems = visibleItems.filter((i) => !i.section);

  function renderItem(item: NavItem, key: string) {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={key}
        onClick={() => { onNavigate(item.id); onMobileClose(); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
        }`}
      >
        <Icon size={17} className="flex-shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">EventServ</p>
          <p className="text-xs text-slate-400 leading-tight">Management System</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {noSectionItems.map((item) => renderItem(item, item.id))}
        {sections.map((section) => (
          <div key={section} className="pt-3">
            <p className="px-3 pb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{section}</p>
            {visibleItems
              .filter((i) => i.section === section)
              .map((item, idx) => renderItem(item, `${item.id}-${section}-${idx}`))}
          </div>
        ))}
      </nav>

      {profile && (
        <div className="px-3 py-3 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-700/30">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{profile.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{profile.name}</p>
              <p className="text-xs text-slate-400 truncate">{getRoleLabel(profile.role)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onMobileClose} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-900">
            <button onClick={onMobileClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 min-h-screen flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
