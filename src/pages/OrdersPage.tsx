import { useEffect, useState } from 'react';
import { Search, AlertCircle, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../lib/utils';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

type OrderWithRelations = {
  id: string;
  status: string | null;
  total_price: number | null;
  invoice_number: string;
  created_at: string | null;
  quantity: number | null;
  unit_price: number | null;

  service: {
    id: string;
    name: string;
    unit: string;
  } | null;

  booth: {
    id: string;
    number: string;
  } | null;

  event: {
    id: string;
    name: string;
  } | null;

  exhibitor: {
    id: string;
    full_name: string | null;
    company: string | null;
  } | null;

  notes?: string | null;
};

const STATUS_FILTERS = [
  'all',
  'pending_payment',
  'paid',
  'assigned',
  'on_progress',
  'completed',
  'cancelled',
];

export default function OrdersPage() {
  const { profile } = useAuth();

  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewOrder, setViewOrder] = useState<OrderWithRelations | null>(null);

  const isExhibitor = profile?.role === 'exhibitor';
  const isAdmin =
    profile?.role === 'eo_admin' || profile?.role === 'super_admin';

  useEffect(() => {
    loadOrders();
  }, [profile]);

  async function loadOrders() {
    setLoading(true);

    let q = supabase
      .from('orders')
      .select(`
        id,
        status,
        total_price,
        invoice_number,
        created_at,
        quantity,
        unit_price,
        notes,

        service:services(id, name, unit),
        booth:booths(id, number),
        event:events(id, name),

        exhibitor:profiles!orders_exhibitor_id_fkey(
          id,
          full_name,
          company
        )
      `)
      .order('created_at', { ascending: false })
      .limit(8);

    if (isExhibitor && profile?.id) {
      q = q.eq('exhibitor_id', profile.id);
    }

    const { data, error } = await q;

    console.log('SUPABASE ERROR:', error);

    if (!error && data) {
      setOrders(data as OrderWithRelations[]);
    }

    setLoading(false);
  }

  async function cancelOrder(id: string) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id);

    loadOrders();

    if (viewOrder?.id === id) {
      setViewOrder(null);
    }
  }

  const filtered = orders.filter((o) => {
    const searchLower = search.toLowerCase();

    const matchSearch =
      o.invoice_number?.toLowerCase().includes(searchLower) ||
      o.service?.name?.toLowerCase().includes(searchLower) ||
      o.exhibitor?.full_name?.toLowerCase().includes(searchLower);

    const matchStatus =
      statusFilter === 'all' || o.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalRevenue = filtered
    .filter((o) =>
      ['paid', 'assigned', 'on_progress', 'completed'].includes(
        o.status ?? ''
      )
    )
    .reduce((s, o) => s + (o.total_price ?? 0), 0);

  return (
    <div className="p-6 space-y-5">
      {/* FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === 'all'
                  ? 'All Status'
                  : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="px-4 py-2 border rounded-xl text-sm">
            Revenue:{' '}
            <b className="text-green-600">
              {formatCurrency(totalRevenue)}
            </b>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden shadow-sm">
  {loading ? (
    <div className="flex justify-center py-16">
      <LoadingSpinner />
    </div>
  ) : filtered.length === 0 ? (
    <div className="py-20 text-center text-gray-400">
      <AlertCircle className="mx-auto mb-2" />
      No orders found
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        
        {/* HEADER */}
        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Invoice</th>
            <th className="px-4 py-3 text-left">Service</th>
            {isAdmin && <th className="px-4 py-3 text-left">Exhibitor</th>}
            <th className="px-4 py-3 text-left">Booth</th>
            <th className="px-4 py-3 text-left">Total</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map((o) => (
            <tr
              key={o.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {o.invoice_number}
              </td>

              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                {o.service?.name}
              </td>

              {isAdmin && (
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {o.exhibitor?.full_name ?? '-'}
                </td>
              )}

              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                {o.booth?.number ?? '-'}
              </td>

              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {formatCurrency(o.total_price ?? 0)}
              </td>

              <td className="px-4 py-3">
                <StatusBadge status={o.status ?? ''} />
              </td>

              <td className="px-4 py-3">
                <div className="flex justify-end items-center gap-2">
                  <button
                    onClick={() => setViewOrder(o)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    <FileText size={14} />
                  </button>

                  {o.status === 'pending_payment' && (
                    <button
                      onClick={() => cancelOrder(o.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* MODAL */}
      <Modal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title="Order Detail"
      >
        {viewOrder && (
          <div className="space-y-2">
            <p>Invoice: {viewOrder.invoice_number}</p>
            <p>Service: {viewOrder.service?.name}</p>
            <p>Booth: {viewOrder.booth?.number}</p>
            <p>Total: {formatCurrency(viewOrder.total_price ?? 0)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}