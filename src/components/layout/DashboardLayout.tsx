import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import type { Page } from '../../lib/types';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export default function DashboardLayout({ currentPage, onNavigate, children }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentPage={currentPage}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
