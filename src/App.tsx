import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { PageLoader } from './components/common/LoadingSpinner';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import UsersPage from './pages/UsersPage';
import ServicesPage from './pages/ServicesPage';
import MarketplacePage from './pages/MarketplacePage';
import MyBoothPage from './pages/MyBoothPage';
import ShowcasePage from './pages/ShowCasePage';
import OrdersPage from './pages/OrdersPage';
import PaymentsPage from './pages/PaymentsPage';
import WorkTrackingPage from './pages/WorkTrackingPage';
import MonitoringPage from './pages/MonitoringPage';
import ReportsPage from './pages/ReportsPage';
import type { Page, UserRole } from './lib/types';

const defaultPageByRole: Record<UserRole, Page> = {
  super_admin: 'dashboard',
  eo_admin: 'dashboard',
  exhibitor: 'dashboard',
  contractor: 'dashboard',
};

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'dashboard': return <DashboardPage />;
    case 'users': return <UsersPage />;
    case 'events': return <EventsPage />;
    case 'services': return <ServicesPage />;
    case 'marketplace': return <MarketplacePage />;
    case 'my_booth': return <MyBoothPage />;
    case 'showcase': return <ShowcasePage />;
    case 'orders': return <OrdersPage />;
    case 'payments': return <PaymentsPage />;
    case 'work_tracking': return <WorkTrackingPage />;
    case 'monitoring': return <MonitoringPage />;
    case 'reports': return <ReportsPage />;
    default: return <DashboardPage />;
  }
}

export default function App() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) return <PageLoader />;
  if (!user || !profile) return <LoginPage />;

  const role = profile.role as UserRole;
  const startPage = defaultPageByRole[role] ?? 'dashboard';

  return (
    <DashboardLayout currentPage={currentPage || startPage} onNavigate={setCurrentPage}>
      <PageContent page={currentPage || startPage} />
    </DashboardLayout>
  );
}
