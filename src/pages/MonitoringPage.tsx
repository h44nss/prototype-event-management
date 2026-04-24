import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Loader, Activity, Users, Package, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/utils';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Assignment, WorkLog, Order, Profile, Service } from '../lib/types';


interface AssignmentWithDetails extends Assignment {
  latest_log?: WorkLog;
}

interface ContractorStat {
  id: string;
  name: string;
  full_name?: string;
  company: string | null;
  active: number;
  done: number;
  total: number;
}

export default function MonitoringPage() {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [contractorStats, setContractorStats] = useState<ContractorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'contractors'>('live');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: assignData } = await supabase
      .from('assignments')
      .select(`
        *,
        order:orders(id, invoice_number, total_price, service:services(id, name, category), booth:booths(id, number), event:events(id, name)),
        contractor:profiles!assignments_contractor_id_fkey(id, full_name, company)
      `)
      .order('created_at', { ascending: false });

    const list = (assignData as Assignment[]) ?? [];
    const ids = list.map((a) => a.id);
    const logsMap: Record<string, WorkLog> = {};
    if (ids.length > 0) {
      const { data: logs } = await supabase
        .from('work_logs')
        .select('*')
        .in('assignment_id', ids)
        .order('created_at', { ascending: false });
      (logs ?? []).forEach((log) => {
        if (!logsMap[log.assignment_id!]) logsMap[log.assignment_id!] = log as WorkLog;
      });
    }

    const enriched = list.map((a) => ({ ...a, latest_log: logsMap[a.id] }));
    setAssignments(enriched);

    const statsMap: Record<string, ContractorStat> = {};
    enriched.forEach((a) => {
      const c = a.contractor as unknown as Profile;
      if (!c) return;
      if (!statsMap[c.id]) statsMap[c.id] = { 
        id: c.id, 
        name: c.full_name ?? 'No Name', 
        company: c.company ?? '-', 
        active: 0, 
        done: 0, 
        total: 0 
      };
      statsMap[c.id].total++;
      const status = a.latest_log?.status ?? 'waiting';
      if (status === 'complete') statsMap[c.id].done++;
      else statsMap[c.id].active++;
    });
    setContractorStats(Object.values(statsMap).sort((a, b) => b.total - a.total));
    setLoading(false);
  }

  const totalActive = assignments.filter((a) => !['done'].includes(a.latest_log?.status ?? 'waiting') && (a.latest_log?.status ?? 'waiting') !== 'waiting').length;
  const totalWaiting = assignments.filter((a) => (a.latest_log?.status ?? 'waiting') === 'waiting').length;
  const totalDone = assignments.filter((a) => a.latest_log?.status === 'complete').length;
  const totalJobs = assignments.length;

  const activeJobs = assignments.filter((a) => {
    const s = a.latest_log?.status ?? 'waiting';
    return s !== 'complete';
  });

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Jobs', value: totalJobs, icon: <Package size={18} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Waiting', value: totalWaiting, icon: <Clock size={18} />, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800' },
          { label: 'In Progress', value: totalActive, icon: <Activity size={18} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Completed', value: totalDone, icon: <CheckCircle size={18} />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['live', 'contractors'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab === 'live' ? 'Live Jobs' : 'Contractors'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'live' ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {activeJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle size={40} className="text-green-300 dark:text-green-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">All jobs are completed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Invoice', 'Service', 'Contractor', 'Event', 'Booth', 'Status', 'Last Update'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {activeJobs.map((a) => {
                    const order = a.order as unknown as Order;
                    const contractor = a.contractor as unknown as Profile;
                    const service = order?.service as unknown as Service;
                    const latestStatus = a.latest_log?.status ?? 'waiting';
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {(order as unknown as { invoice_number?: string })?.invoice_number ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[140px] truncate">{service?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{contractor?.full_name ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[130px] truncate">
                          {(order?.event as unknown as { name?: string })?.name ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {(order?.booth as unknown as { number?: string })?.number ?? '-'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={latestStatus} size="sm" /></td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {a.latest_log ? formatDateTime(a.latest_log.created_at) : formatDateTime(a.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {contractorStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <Users size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No contractor data</p>
            </div>
          ) : (
            contractorStats.map((c) => {
              const completionRate = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
              return (
                <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                        {c.company && <p className="text-xs text-gray-500 dark:text-gray-400">{c.company}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">completion</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{c.done} done</span>
                      <span>{c.total} total</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Loader size={12} />
                      <span>{c.active} active</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle size={12} />
                      <span>{c.done} done</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <TrendingUp size={12} />
                      <span>{c.total} total</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
