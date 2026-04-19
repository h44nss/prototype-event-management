import { useEffect, useState } from 'react';
import { MapPin, Layers, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Booth, Hall, Event, Order, Service } from '../lib/types';

export default function MyBoothPage() {
  const { profile } = useAuth();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) loadData(); }, [profile]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadBooths(), loadRecentOrders()]);
    setLoading(false);
  }

  async function loadBooths() {
    const { data } = await supabase
      .from('booths')
      .select('*, hall:halls(id, name, event:events(id, name, start_date, end_date, status, location))')
      .eq('exhibitor_id', profile!.id)
      .order('created_at', { ascending: false });
    setBooths((data as Booth[]) ?? []);
  }

  async function loadRecentOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, service:services(id, name, category), booth:booths(id, number)')
      .eq('exhibitor_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentOrders((data as Order[]) ?? []);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {booths.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Layers size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Booth Assigned</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
            You have not been assigned a booth yet. Please contact your event organizer.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {booths.map((booth) => {
              const hall = booth.hall as unknown as Hall;
              const event = (hall as unknown as { event: Event })?.event;
              return (
                <div key={booth.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Layers size={22} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Booth {booth.number}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{hall?.name}</p>
                      </div>
                    </div>
                    <StatusBadge status={booth.status} />
                  </div>

                  <div className="space-y-2 text-sm">
                    {booth.size && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Layers size={14} className="text-gray-400 flex-shrink-0" />
                        <span>Size: <span className="font-medium">{booth.size}</span></span>
                      </div>
                    )}
                    {event && (
                      <>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{event.name}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Calendar size={14} className="text-gray-300 flex-shrink-0" />
                          <span>{formatDate(event.start_date)} – {formatDate(event.end_date)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {event && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <StatusBadge status={event.status} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <AlertCircle size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No orders yet. Visit the Marketplace to order services.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice</th>
                      <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Service</th>
                      <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Booth</th>
                      <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2.5 font-mono text-xs text-gray-900 dark:text-white">{order.invoice_number}</td>
                        <td className="py-2.5 text-gray-600 dark:text-gray-300 hidden sm:table-cell">{(order.service as unknown as Service)?.name ?? '-'}</td>
                        <td className="py-2.5 text-gray-600 dark:text-gray-300 hidden md:table-cell">{(order.booth as unknown as Booth)?.number ?? '-'}</td>
                        <td className="py-2.5"><StatusBadge status={order.status} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
