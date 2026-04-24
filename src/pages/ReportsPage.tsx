import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Package, CheckCircle, CreditCard, Users, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Order, Profile, Service, Event } from '../lib/types';

type Period = 'week' | 'month' | 'quarter' | 'year';


interface OrderWithRels extends Order {
  service?: Service;
  exhibitor?: Profile;
  event?: Event;
}

type MonthBar = {
  label: string;
  revenue: number;
  orders: number;
  [key: string]: string | number;
}

interface ServiceStat {
  name: string;
  count: number;
  revenue: number;
}

function BarChartSimple({ bars, valueKey, color, formatValue }: {
  bars: { label: string; [key: string]: number | string }[];
  valueKey: string;
  color: string;
  formatValue: (v: number) => string;
}) {
  const max = Math.max(...bars.map((b) => b[valueKey] as number), 1);
  return (
    <div className="flex items-end gap-1 h-36">
      {bars.map((bar, i) => {
        const val = bar[valueKey] as number;
        const pct = max > 0 ? (val / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex flex-col justify-end" style={{ height: '112px' }}>
              <div
                className={`w-full rounded-t-md ${color} transition-all duration-500`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {formatValue(val)}
              </div>
            </div>
            <span className="text-xs text-gray-400 truncate w-full text-center">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<OrderWithRels[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'orders'>('overview');

  useEffect(() => { loadData(); }, [period]);

  async function loadData() {
    setLoading(true);
    const from = getPeriodStart(period);
    const { data } = await supabase
      .from('orders')
      .select('*, service:services(id, name, category), exhibitor:profiles!orders_exhibitor_id_fkey(id, full_name, company), event:events(id, name)')
      .gte('created_at', from.toISOString())
      .order('created_at', { ascending: false });
    setOrders((data as OrderWithRels[]) ?? []);
    setLoading(false);
  }

  function getPeriodStart(p: Period): Date {
    const now = new Date();
    if (p === 'week') { now.setDate(now.getDate() - 7); return now; }
    if (p === 'month') { now.setMonth(now.getMonth() - 1); return now; }
    if (p === 'quarter') { now.setMonth(now.getMonth() - 3); return now; }
    now.setFullYear(now.getFullYear() - 1);
    return now;
  }

  const paidOrders = orders.filter((o) => ['paid', 'assigned', 'on_progress', 'completed'].includes(o.status));
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total_price, 0);
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const pendingPayments = orders.filter((o) => o.status === 'pending_payment').length;
  const uniqueExhibitors = new Set(orders.map((o) => o.exhibitor_id)).size;

  const monthBars = buildMonthBars(orders, period);
  const serviceStats = buildServiceStats(orders);

  function buildMonthBars(ords: OrderWithRels[], p: Period): MonthBar[] {
    const buckets: Record<string, MonthBar> = {};
    const count = p === 'week' ? 7 : p === 'month' ? 4 : p === 'quarter' ? 12 : 12;
    const isWeekly = p === 'week';

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      if (isWeekly) {
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        buckets[key] = { label: d.toLocaleDateString('en', { weekday: 'short' }), revenue: 0, orders: 0 };
      } else {
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        buckets[key] = { label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), revenue: 0, orders: 0 };
      }
    }

    ords.filter((o) => ['paid', 'assigned', 'on_progress', 'completed'].includes(o.status)).forEach((o) => {
      const d = new Date(o.created_at);
      const key = isWeekly
        ? d.toISOString().split('T')[0]
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) {
        buckets[key].revenue += o.total_price;
        buckets[key].orders++;
      }
    });

    return Object.values(buckets);
  }

  function buildServiceStats(ords: OrderWithRels[]): ServiceStat[] {
    const map: Record<string, ServiceStat> = {};
    ords.filter((o) => ['paid', 'assigned', 'on_progress', 'completed'].includes(o.status)).forEach((o) => {
      const name = (o.service as unknown as Service)?.name ?? 'Unknown';
      if (!map[name]) map[name] = { name, count: 0, revenue: 0 };
      map[name].count++;
      map[name].revenue += o.total_price;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }

  const maxServiceRev = Math.max(...serviceStats.map((s) => s.revenue), 1);

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last Month' },
    { value: 'quarter', label: 'Last Quarter' },
    { value: 'year', label: 'Last Year' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p.value
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: <TrendingUp size={18} />, bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600 dark:text-green-400' },
          { label: 'Total Orders', value: orders.length, icon: <Package size={18} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Completed', value: completedOrders, icon: <CheckCircle size={18} />, bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-600 dark:text-teal-400' },
          { label: 'Pending Payment', value: pendingPayments, icon: <CreditCard size={18} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}>{card.icon}</div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['overview', 'services', 'orders'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Revenue Chart' : tab === 'services' ? 'Top Services' : 'Order List'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 size={16} className="text-blue-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Revenue Over Time</p>
            </div>
            <BarChartSimple bars={monthBars} valueKey="revenue" color="bg-blue-500" formatValue={formatCurrency} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-5">
              <Package size={16} className="text-teal-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Orders Over Time</p>
            </div>
            <BarChartSimple bars={monthBars} valueKey="orders" color="bg-teal-500" formatValue={(v) => `${v} orders`} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <Users size={16} className="text-amber-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Key Metrics</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Avg Order Value', value: orders.length > 0 ? formatCurrency(totalRevenue / Math.max(paidOrders.length, 1)) : formatCurrency(0) },
                { label: 'Completion Rate', value: orders.length > 0 ? `${Math.round((completedOrders / orders.length) * 100)}%` : '0%' },
                { label: 'Active Exhibitors', value: uniqueExhibitors },
                { label: 'Cancelled Orders', value: orders.filter((o) => o.status === 'cancelled').length },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{m.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'services' ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} className="text-blue-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Top Services by Revenue</p>
          </div>
          {serviceStats.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No data available for this period</div>
          ) : (
            <div className="space-y-3">
              {serviceStats.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{s.count} orders</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(s.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(s.revenue / maxServiceRev) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-gray-100 dark:border-gray-800">
            <Calendar size={16} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">All Orders</p>
            <span className="ml-auto text-xs text-gray-500">{orders.length} total</span>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No orders in this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Invoice', 'Service', 'Exhibitor', 'Event', 'Total', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{o.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[140px] truncate">{(o.service as unknown as Service)?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{(o.exhibitor as unknown as Profile)?.full_name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[130px] truncate">{(o.event as unknown as Event)?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{formatCurrency(o.total_price)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          o.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          o.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          o.status === 'pending_payment' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
