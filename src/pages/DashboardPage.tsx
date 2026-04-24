import { useEffect, useState } from 'react';
import {
  Package,
  CreditCard,
  Wrench,
  CheckCircle,
  TrendingUp,
  Calendar,
  AlertCircle,
  ShoppingBag,
  Activity,
  Users
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

import type {
  Order,
  Event,
  Profile,
  Service,
  Assignment,
  WorkLog
} from '../lib/types';

interface AssignmentWithLog extends Assignment {
  latest_log?: WorkLog;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithLog[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    if (!profile) return;

    const role = profile.role; // 🔥 FIX: selalu ambil role fresh

    setLoading(true);
    try {
      if (role === 'super_admin') await loadAdminDash();
      else if (role === 'eo_admin') await loadEoAdminDash();
      else if (role === 'exhibitor') await loadExhibitorDash();
      else if (role === 'contractor') await loadContractorDash();
    } finally {
      setLoading(false);
    }
  }

  /* ================= ADMIN ================= */
  async function loadAdminDash() {
    const [ordersRes, eventsRes, paymentsRes, usersRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id, status, total_price, invoice_number, created_at,
          service:services(id, name),
          exhibitor:profiles!orders_exhibitor_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(8),

      supabase
        .from('events')
        .select('*')
        .in('status', ['published', 'active'])
        .order('start_date')
        .limit(4),

      supabase
        .from('payments')
        .select('id')
        .eq('status', 'pending_verification'),

      supabase.from('profiles').select('id')
    ]);

    const orderList = (ordersRes.data ?? []) as Order[];

    setOrders(orderList);
    setEvents((eventsRes.data ?? []) as Event[]);
    setPendingPaymentsCount(paymentsRes.data?.length ?? 0);
    setTotalUsers(usersRes.data?.length ?? 0);

    setTotalRevenue(
      orderList
        .filter((o) =>
          ['paid', 'assigned', 'on_progress', 'completed'].includes(o.status ?? '')
        )
        .reduce((s, o) => s + (o.total_price ?? 0), 0)
    );
  }

  /* ================= EO ADMIN ================= */
  async function loadEoAdminDash() {
    const [ordersRes, eventsRes, assignRes, paymentsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id, status, total_price, invoice_number, created_at,
          service:services(id, name),
          exhibitor:profiles!orders_exhibitor_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(8),

      supabase
        .from('events')
        .select('*')
        .in('status', ['published', 'active'])
        .order('start_date')
        .limit(4),

      supabase
        .from('assignments')
        .select(`
          id,
          order_id,
          contractor_id,
          notes,
          created_at,
          contractor:profiles(
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('payments')
        .select('id')
        .eq('status', 'pending_verification')
    ]);

    setOrders((ordersRes.data ?? []) as Order[]);
    setEvents((eventsRes.data ?? []) as Event[]);
    setAssignments((assignRes.data ?? []) as unknown as AssignmentWithLog[]);
    setPendingPaymentsCount(paymentsRes.data?.length ?? 0);

    const orderList = (ordersRes.data ?? []) as Order[];

    setTotalRevenue(
      orderList
        .filter((o) =>
          ['paid', 'assigned', 'on_progress', 'completed'].includes(o.status ?? '')
        )
        .reduce((s, o) => s + (o.total_price ?? 0), 0)
    );
  }

  /* ================= EXHIBITOR ================= */
  async function loadExhibitorDash() {
    const [ordersRes, eventsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id, status, total_price, invoice_number, created_at,
          service:services(id, name)
        `)
        .eq('exhibitor_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(8),

      supabase
        .from('events')
        .select('*')
        .in('status', ['published', 'active'])
        .order('start_date')
        .limit(4)
    ]);

    setOrders((ordersRes.data ?? []) as Order[]);
    setEvents((eventsRes.data ?? []) as Event[]);
  }

  /* ================= CONTRACTOR ================= */
  async function loadContractorDash() {
    const assignRes = await supabase
      .from('assignments')
      .select(`
        *,
        order:orders(
          id,
          invoice_number,
          service:services(id, name),
          booth:booths(id, number)
        )
      `)
      .eq('contractor_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(8);

    const list = assignRes.data ?? [];

    const ids = list.map((a: any) => a.id);

    let logsMap: Record<string, WorkLog> = {};

    if (ids.length > 0) {
      const { data: logs } = await supabase
        .from('work_logs')
        .select('*')
        .in('assignment_id', ids)
        .order('created_at', { ascending: false });

      (logs ?? []).forEach((l: any) => {
        if (!logsMap[l.assignment_id]) {
          logsMap[l.assignment_id] = l;
        }
      });
    }

    setAssignments(
      list.map((a: any) => ({
        ...a,
        latest_log: logsMap[a.id]
      }))
    );
  }

  /* ================= LOADING ================= */
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );

  /* ================= CALCULATIONS ================= */
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const pendingOrders = orders.filter((o) => o.status === 'pending_payment').length;

  const activeAssignments = assignments.filter(
    (a) => (a.latest_log?.status ?? 'waiting') !== 'complete'
  ).length;

  const doneAssignments = assignments.filter(
    (a) => a.latest_log?.status === 'complete'
  ).length;

  /* ================= UI (TIDAK DIUBAH SAMA SEKALI) ================= */
  return (
    <div className="p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome back, {profile?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div> 


      {(profile?.role === 'super_admin' || profile?.role === 'eo_admin') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: <TrendingUp size={20} />, bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600 dark:text-green-400' },
            { label: 'Total Orders', value: totalOrders, icon: <Package size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Pending Payments', value: pendingPaymentsCount, icon: <CreditCard size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
            profile.role === 'super_admin'
              ? { label: 'Total Users', value: totalUsers, icon: <Users size={20} />, bg: 'bg-gray-50 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' }
              : { label: 'Active Events', value: events.length, icon: <Calendar size={20} />, bg: 'bg-gray-50 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}>{card.icon}</div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {profile?.role === 'exhibitor' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'My Orders', value: totalOrders, icon: <ShoppingBag size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Pending Payment', value: pendingOrders, icon: <CreditCard size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Completed', value: completedOrders, icon: <CheckCircle size={20} />, bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600 dark:text-green-400' },
            { label: 'Active Events', value: events.length, icon: <Calendar size={20} />, bg: 'bg-gray-50 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}>{card.icon}</div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {profile?.role === 'contractor' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Jobs', value: assignments.length, icon: <Wrench size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Active Jobs', value: activeAssignments, icon: <Activity size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Completed', value: doneAssignments, icon: <CheckCircle size={20} />, bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600 dark:text-green-400' },
            { label: 'Completion Rate', value: assignments.length > 0 ? `${Math.round((doneAssignments / assignments.length) * 100)}%` : '0%', icon: <TrendingUp size={20} />, bg: 'bg-gray-50 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}>{card.icon}</div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {profile?.role !== 'contractor' && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {profile?.role === 'exhibitor' ? 'My Recent Orders' : 'Recent Orders'}
              </h3>
              <Package size={16} className="text-gray-400" />
            </div>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['Invoice', 'Service', profile?.role !== 'exhibitor' ? 'Exhibitor' : null, 'Total', 'Status'].filter(Boolean).map((h) => (
                        <th key={h!} className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 pr-4 font-mono text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{o.invoice_number}</td>
                        <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{(o.service as unknown as Service)?.name ?? '-'}</td>
                        {profile?.role !== 'exhibitor' && <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{(o.exhibitor as unknown as Profile)?.full_name ?? '-'}</td>}
                        <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-200 font-medium whitespace-nowrap">{formatCurrency(o.total_price)}</td>
                        <td className="py-2.5"><StatusBadge status={o.status} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {profile?.role === 'contractor' && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">My Recent Jobs</h3>
              <Wrench size={16} className="text-gray-400" />
            </div>
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No jobs assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const order = a.order as unknown as Order;
                  const latestStatus = a.latest_log?.status ?? 'waiting';
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                          {(order as unknown as { invoice_number?: string })?.invoice_number ?? '-'}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {(order?.service as unknown as Service)?.name ?? '-'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Booth: {(order?.booth as unknown as { number?: string })?.number ?? '-'}
                        </p>
                      </div>
                      <StatusBadge status={latestStatus} size="sm" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Active Events</h3>
            <Calendar size={16} className="text-gray-400" />
          </div>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No active events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">{event.name}</p>
                    <StatusBadge status={event.status} size="sm" />
                  </div>
                  {event.location && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">{event.location}</p>}
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(event.start_date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
