import { useEffect, useState } from 'react';
import { Search, AlertCircle, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../lib/utils';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Order, Service, Booth, Event, Profile } from '../lib/types';

const STATUS_FILTERS = ['all', 'pending_payment', 'paid', 'assigned', 'on_progress', 'completed', 'cancelled'];

export default function OrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const isExhibitor = profile?.role === 'exhibitor';
  const isAdmin = profile?.role === 'eo_admin' || profile?.role === 'super_admin';

  useEffect(() => { loadOrders(); }, [profile]);

  async function loadOrders() {
    setLoading(true);
    let q = supabase
      .from('orders')
      .select('*, service:services(id, name, category, unit), booth:booths(id, number), event:events(id, name), exhibitor:profiles!orders_exhibitor_id_fkey(id, name, company)')
      .order('created_at', { ascending: false });
    if (isExhibitor) q = q.eq('exhibitor_id', profile!.id);
    const { data } = await q;
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  async function cancelOrder(id: string) {
    await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
    loadOrders();
    if (viewOrder?.id === id) setViewOrder(null);
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.service as unknown as Service)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (o.exhibitor as unknown as Profile)?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = filtered.filter((o) => ['paid', 'assigned', 'on_progress', 'completed'].includes(o.status)).reduce((s, o) => s + o.total_price, 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
          </select>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm">
            <span className="text-gray-500 dark:text-gray-400">Revenue:</span>
            <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalRevenue)}</span>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Invoice', 'Service', isAdmin ? 'Exhibitor' : null, 'Booth', 'Qty', 'Total', 'Date', 'Status', ''].filter(Boolean).map((h) => (
                    <th key={h!} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{order.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{(order.service as unknown as Service)?.name ?? '-'}</td>
                    {isAdmin && <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{(order.exhibitor as unknown as Profile)?.name ?? '-'}</td>}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{(order.booth as unknown as Booth)?.number ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-center">{order.quantity}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{formatCurrency(order.total_price)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatDateTime(order.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} size="sm" /></td>
                    <td className="px-4 py-3 flex items-center gap-1">
                      <button onClick={() => setViewOrder(order)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <FileText size={14} />
                      </button>
                      {isExhibitor && order.status === 'pending_payment' && (
                        <button onClick={() => cancelOrder(order.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Order Details">
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Invoice Number', value: viewOrder.invoice_number },
                { label: 'Service', value: (viewOrder.service as unknown as Service)?.name ?? '-' },
                { label: 'Event', value: (viewOrder.event as unknown as Event)?.name ?? '-' },
                { label: 'Booth', value: (viewOrder.booth as unknown as Booth)?.number ?? '-' },
                { label: 'Quantity', value: `${viewOrder.quantity} ${(viewOrder.service as unknown as Service)?.unit ?? 'unit'}` },
                { label: 'Unit Price', value: formatCurrency(viewOrder.unit_price) },
                { label: 'Total Price', value: formatCurrency(viewOrder.total_price) },
                { label: 'Ordered', value: formatDateTime(viewOrder.created_at) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{item.value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</p>
                <div className="mt-1"><StatusBadge status={viewOrder.status} /></div>
              </div>
              {isAdmin && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exhibitor</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{(viewOrder.exhibitor as unknown as Profile)?.name ?? '-'}</p>
                </div>
              )}
            </div>
            {viewOrder.notes && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{viewOrder.notes}</p>
              </div>
            )}
            {isExhibitor && viewOrder.status === 'pending_payment' && (
              <button onClick={() => cancelOrder(viewOrder.id)} className="w-full py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-xl transition-colors">
                Cancel Order
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
