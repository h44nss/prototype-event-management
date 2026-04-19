import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, MapPin, CreditCard as Edit2, Save, X, Plus, Trash2, Users, Building2, Wrench, Package, ChevronRight, LayoutGrid, UserCheck, Settings, ToggleLeft, ToggleRight, AlertCircle, Search, CheckCircle, XCircle, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatCurrency, getCategoryLabel } from '../lib/utils';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import type {
  Event, Hall, Booth, Service, EventService, EventParticipant,
  EventOrganizer, ContractorAssignment, Profile, ServiceCategory,
} from '../lib/types';

type MainTab = 'overview' | 'setup' | 'exhibitors' | 'organizers' | 'contractors';
type SetupSubTab = 'floorplan' | 'services' | 'assign';

const EVENT_STAGES = [
  { key: 'pre_event', label: 'Pre-Event', desc: 'Planning & preparation phase' },
  { key: 'in_event', label: 'In Event', desc: 'Event is live and running' },
  { key: 'post_event', label: 'Post-Event', desc: 'Wrap-up and reporting' },
];

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'electricity', 'internet', 'booth_support', 'furniture', 'av_equipment', 'general',
];

interface Props {
  event: Event;
  onBack: () => void;
  onEventUpdate?: (event: Event) => void;
}

export default function EventDetailPage({ event: initialEvent, onBack, onEventUpdate }: Props) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'eo_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  const [event, setEvent] = useState<Event>(initialEvent);
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [setupSubTab, setSetupSubTab] = useState<SetupSubTab>('floorplan');

  // Overview edit
  const [editingEvent, setEditingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: event.name,
    description: event.description ?? '',
    location: event.location ?? '',
    start_date: event.start_date?.slice(0, 10) ?? '',
    end_date: event.end_date?.slice(0, 10) ?? '',
    status: event.status,
  });

  // Floorplan
  const [halls, setHalls] = useState<Hall[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [hallForm, setHallForm] = useState({ name: '', description: '' });
  const [showHallModal, setShowHallModal] = useState(false);
  const [editHall, setEditHall] = useState<Hall | null>(null);
  const [boothForm, setBoothForm] = useState({ number: '', size: '', hall_id: '' });
  const [showBoothModal, setShowBoothModal] = useState(false);
  const [editBooth, setEditBooth] = useState<Booth | null>(null);
  const [deleteHallTarget, setDeleteHallTarget] = useState<Hall | null>(null);
  const [deleteBoothTarget, setDeleteBoothTarget] = useState<Booth | null>(null);

  // Services
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [eventServices, setEventServices] = useState<EventService[]>([]);

  // Exhibitors
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [exhibitors, setExhibitors] = useState<Profile[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ exhibitor_id: '', booth_id: '' });
  const [exhibitorSearch, setExhibitorSearch] = useState('');

  // Organizers
  const [organizers, setOrganizers] = useState<EventOrganizer[]>([]);
  const [eoAdmins, setEoAdmins] = useState<Profile[]>([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgForm, setOrgForm] = useState({ organizer_id: '', hall_id: '' });

  // Contractors
  const [contractorAssignments, setContractorAssignments] = useState<ContractorAssignment[]>([]);
  const [contractorProfiles, setContractorProfiles] = useState<Profile[]>([]);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [contractorForm, setContractorForm] = useState({
    contractor_id: '',
    hall_id: '',
    service_categories: [] as ServiceCategory[],
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'setup') {
      loadFloorplan();
      loadAllServices();
      loadEventServices();
    }
    if (activeTab === 'exhibitors') { loadParticipants(); loadExhibitors(); }
    if (activeTab === 'organizers') { loadOrganizers(); loadEoAdmins(); }
    if (activeTab === 'contractors') { loadContractorAssignments(); loadContractors(); loadFloorplan(); }
  }, [activeTab]);

  async function loadFloorplan() {
    const { data: hallData } = await supabase.from('halls').select('*').eq('event_id', event.id).order('name');
    const { data: boothData } = await supabase.from('booths').select('*, exhibitor:profiles!booths_exhibitor_id_fkey(id, name, company)').eq('event_id', event.id).order('number');
    setHalls((hallData as Hall[]) ?? []);
    setBooths((boothData as Booth[]) ?? []);
    if (!selectedHall && hallData && hallData.length > 0) setSelectedHall(hallData[0] as Hall);
  }

  async function loadAllServices() {
    const { data } = await supabase.from('services').select('*').eq('is_active', true).order('category', { ascending: true });
    setAllServices((data as Service[]) ?? []);
  }

  async function loadEventServices() {
    const { data } = await supabase.from('event_services').select('*, service:services(*)').eq('event_id', event.id);
    setEventServices((data as EventService[]) ?? []);
  }

  async function loadParticipants() {
    setLoading(true);
    const { data } = await supabase.from('event_participants').select('*, exhibitor:profiles!event_participants_exhibitor_id_fkey(id, name, company, phone), booth:booths(id, number)').eq('event_id', event.id).order('created_at', { ascending: false });
    setParticipants((data as EventParticipant[]) ?? []);
    setLoading(false);
  }

  async function loadExhibitors() {
    const { data } = await supabase.from('profiles').select('id, name, company, phone').eq('role', 'exhibitor').eq('is_active', true).order('name');
    setExhibitors((data as Profile[]) ?? []);
  }

  async function loadOrganizers() {
    setLoading(true);
    const { data } = await supabase.from('event_organizers').select('*, organizer:profiles!event_organizers_organizer_id_fkey(id, name, company), hall:halls(id, name)').eq('event_id', event.id);
    setOrganizers((data as EventOrganizer[]) ?? []);
    setLoading(false);
  }

  async function loadEoAdmins() {
    const { data } = await supabase.from('profiles').select('id, name, company').eq('role', 'eo_admin').eq('is_active', true).order('name');
    setEoAdmins((data as Profile[]) ?? []);
  }

  async function loadContractorAssignments() {
    setLoading(true);
    const { data } = await supabase.from('contractor_assignments').select('*, contractor:profiles!contractor_assignments_contractor_id_fkey(id, name, company), hall:halls(id, name)').eq('event_id', event.id);
    setContractorAssignments((data as ContractorAssignment[]) ?? []);
    setLoading(false);
  }

  async function loadContractors() {
    const { data } = await supabase.from('profiles').select('id, name, company').eq('role', 'contractor').eq('is_active', true).order('name');
    setContractorProfiles((data as Profile[]) ?? []);
  }

  async function saveEvent() {
    setSaving(true);
    const { data, error } = await supabase.from('events').update({ ...eventForm, updated_at: new Date().toISOString() }).eq('id', event.id).select().maybeSingle();
    if (!error && data) {
      const updated = data as Event;
      setEvent(updated);
      onEventUpdate?.(updated);
      setEditingEvent(false);
    }
    setSaving(false);
  }

  async function saveHall() {
    setSaving(true);
    if (editHall) {
      await supabase.from('halls').update({ name: hallForm.name, description: hallForm.description }).eq('id', editHall.id);
    } else {
      await supabase.from('halls').insert({ event_id: event.id, name: hallForm.name, description: hallForm.description });
    }
    setShowHallModal(false);
    setEditHall(null);
    setHallForm({ name: '', description: '' });
    loadFloorplan();
    setSaving(false);
  }

  async function deleteHall() {
    if (!deleteHallTarget) return;
    await supabase.from('halls').delete().eq('id', deleteHallTarget.id);
    setDeleteHallTarget(null);
    setSelectedHall(null);
    loadFloorplan();
  }

  async function saveBooth() {
    setSaving(true);
    const hallId = boothForm.hall_id || selectedHall?.id;
    if (editBooth) {
      await supabase.from('booths').update({ number: boothForm.number, size: boothForm.size, hall_id: hallId, updated_at: new Date().toISOString() }).eq('id', editBooth.id);
    } else {
      await supabase.from('booths').insert({ event_id: event.id, hall_id: hallId, number: boothForm.number, size: boothForm.size });
    }
    setShowBoothModal(false);
    setEditBooth(null);
    setBoothForm({ number: '', size: '', hall_id: '' });
    loadFloorplan();
    setSaving(false);
  }

  async function deleteBooth() {
    if (!deleteBoothTarget) return;
    await supabase.from('booths').delete().eq('id', deleteBoothTarget.id);
    setDeleteBoothTarget(null);
    loadFloorplan();
  }

  async function toggleEventService(serviceId: string) {
    const existing = eventServices.find((es) => es.service_id === serviceId);
    if (existing) {
      await supabase.from('event_services').delete().eq('id', existing.id);
    } else {
      await supabase.from('event_services').insert({ event_id: event.id, service_id: serviceId });
    }
    loadEventServices();
  }

  async function assignExhibitor() {
    if (!inviteForm.exhibitor_id) return;
    setSaving(true);
    await supabase.from('event_participants').upsert({
      event_id: event.id,
      exhibitor_id: inviteForm.exhibitor_id,
      booth_id: inviteForm.booth_id || null,
      status: 'invited',
    }, { onConflict: 'event_id,exhibitor_id' });
    if (inviteForm.booth_id) {
      await supabase.from('booths').update({ exhibitor_id: inviteForm.exhibitor_id, status: 'assigned', updated_at: new Date().toISOString() }).eq('id', inviteForm.booth_id);
    }
    setShowInviteModal(false);
    setInviteForm({ exhibitor_id: '', booth_id: '' });
    loadParticipants();
    setSaving(false);
  }

  async function removeParticipant(p: EventParticipant) {
    await supabase.from('event_participants').delete().eq('id', p.id);
    if (p.booth_id) {
      await supabase.from('booths').update({ exhibitor_id: null, status: 'available', updated_at: new Date().toISOString() }).eq('id', p.booth_id);
    }
    loadParticipants();
  }

  async function saveOrganizer() {
    if (!orgForm.organizer_id) return;
    setSaving(true);
    await supabase.from('event_organizers').upsert({
      event_id: event.id,
      organizer_id: orgForm.organizer_id,
      hall_id: orgForm.hall_id || null,
    }, { onConflict: 'event_id,organizer_id' });
    setShowOrgModal(false);
    setOrgForm({ organizer_id: '', hall_id: '' });
    loadOrganizers();
    setSaving(false);
  }

  async function removeOrganizer(o: EventOrganizer) {
    await supabase.from('event_organizers').delete().eq('id', o.id);
    loadOrganizers();
  }

  async function saveContractor() {
    if (!contractorForm.contractor_id) return;
    setSaving(true);
    await supabase.from('contractor_assignments').upsert({
      event_id: event.id,
      contractor_id: contractorForm.contractor_id,
      hall_id: contractorForm.hall_id || null,
      service_categories: contractorForm.service_categories,
      notes: contractorForm.notes || null,
    }, { onConflict: 'event_id,contractor_id' });
    setShowContractorModal(false);
    setContractorForm({ contractor_id: '', hall_id: '', service_categories: [], notes: '' });
    loadContractorAssignments();
    setSaving(false);
  }

  async function removeContractor(ca: ContractorAssignment) {
    await supabase.from('contractor_assignments').delete().eq('id', ca.id);
    loadContractorAssignments();
  }

  function toggleContractorCategory(cat: ServiceCategory) {
    setContractorForm((f) => ({
      ...f,
      service_categories: f.service_categories.includes(cat)
        ? f.service_categories.filter((c) => c !== cat)
        : [...f.service_categories, cat],
    }));
  }

  const hallBooths = selectedHall ? booths.filter((b) => b.hall_id === selectedHall.id) : [];
  const unassignedBooths = booths.filter((b) => b.status === 'available');
  const assignedBooths = booths.filter((b) => b.status === 'assigned');

  const filteredExhibitors = exhibitors.filter((e) =>
    e.name.toLowerCase().includes(exhibitorSearch.toLowerCase()) ||
    (e.company ?? '').toLowerCase().includes(exhibitorSearch.toLowerCase())
  );

  const eventServiceIds = new Set(eventServices.map((es) => es.service_id));
  const servicesByCategory = SERVICE_CATEGORIES.map((cat) => ({
    cat,
    services: allServices.filter((s) => s.category === cat),
  })).filter((g) => g.services.length > 0);

  const mainTabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid size={15} /> },
    { id: 'setup', label: 'Setup', icon: <Settings size={15} /> },
    { id: 'exhibitors', label: 'Exhibitors', icon: <Users size={15} /> },
    { id: 'organizers', label: 'Organizers', icon: <UserCheck size={15} /> },
    { id: 'contractors', label: 'Contractors', icon: <Wrench size={15} /> },
  ];

  const setupTabs: { id: SetupSubTab; label: string }[] = [
    { id: 'floorplan', label: 'Floorplan' },
    { id: 'services', label: 'Services' },
    { id: 'assign', label: 'Assign Exhibitor' },
  ];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 transition-colors">
          <ArrowLeft size={15} /> Back to Events
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{event.name}</h1>
              <StatusBadge status={event.status} />
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
              {event.location && <span className="flex items-center gap-1"><MapPin size={13} />{event.location}</span>}
              <span className="flex items-center gap-1">
                <Calendar size={13} />{formatDate(event.start_date)} — {formatDate(event.end_date)}
              </span>
            </div>
          </div>
          {isAdmin && !editingEvent && (
            <button onClick={() => setEditingEvent(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors flex-shrink-0">
              <Edit2 size={14} /> Edit
            </button>
          )}
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {mainTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">

        {/* ========== OVERVIEW TAB ========== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-3xl">
            {editingEvent ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Edit Event Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Event Name</label>
                    <input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                    <textarea rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                    <input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                    <select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value as typeof eventForm.status })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['draft', 'published', 'active', 'closed', 'cancelled'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
                    <input type="date" value={eventForm.start_date} onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date</label>
                    <input type="date" value={eventForm.end_date} onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingEvent(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={14} className="inline mr-1" />Cancel</button>
                  <button onClick={saveEvent} disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center justify-center gap-2">{saving && <LoadingSpinner size="sm" />}<Save size={14} />Save</button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Event Details</h2>
                {event.description && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{event.description}</p>}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Location', value: event.location ?? '-' },
                    { label: 'Start Date', value: formatDate(event.start_date) },
                    { label: 'End Date', value: formatDate(event.end_date) },
                    { label: 'Status', value: <StatusBadge status={event.status} size="sm" /> },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{item.label}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Stage */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Event Stage</h2>
              <div className="flex items-center gap-0">
                {EVENT_STAGES.map((stage, i) => {
                  const isActive = event.status === 'active' && i === 1;
                  const isPast = event.status === 'closed' || event.status === 'cancelled';
                  const stageColor = isPast ? 'bg-gray-400' : isActive ? 'bg-green-500' : i === 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700';
                  return (
                    <div key={stage.key} className="flex-1 flex flex-col items-center">
                      <div className="flex items-center w-full">
                        <div className={`w-full h-1 ${i === 0 ? 'opacity-0' : stageColor}`} />
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 ${stageColor} flex items-center justify-center`}>
                          {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className={`w-full h-1 ${i === EVENT_STAGES.length - 1 ? 'opacity-0' : stageColor}`} />
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">{stage.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-0.5">{stage.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Halls', value: halls.length, icon: <Building2 size={16} /> },
                { label: 'Booths', value: booths.length, icon: <LayoutGrid size={16} /> },
                { label: 'Assigned', value: assignedBooths.length, icon: <CheckCircle size={16} /> },
                { label: 'Available', value: unassignedBooths.length, icon: <XCircle size={16} /> },
              ].map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-1">{stat.icon}<span className="text-xs">{stat.label}</span></div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== SETUP TAB ========== */}
        {activeTab === 'setup' && (
          <div className="space-y-4">
            {/* Setup sub-tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
              {setupTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSetupSubTab(t.id)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    setupSubTab === t.id
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* FLOORPLAN sub-tab */}
            {setupSubTab === 'floorplan' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Halls list */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Halls</h3>
                    {isAdmin && (
                      <button onClick={() => { setEditHall(null); setHallForm({ name: '', description: '' }); setShowHallModal(true); }} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {halls.length === 0 ? (
                      <div className="text-center py-10">
                        <Building2 size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No halls yet</p>
                      </div>
                    ) : halls.map((hall) => (
                      <div
                        key={hall.id}
                        onClick={() => setSelectedHall(hall)}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${selectedHall?.id === hall.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${selectedHall?.id === hall.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{hall.name}</p>
                          <p className="text-xs text-gray-400">{booths.filter((b) => b.hall_id === hall.id).length} booths</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {isAdmin && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setEditHall(hall); setHallForm({ name: hall.name, description: hall.description ?? '' }); setShowHallModal(true); }} className="p-1 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={13} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setDeleteHallTarget(hall); }} className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                            </>
                          )}
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booths grid */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {selectedHall ? `Booths — ${selectedHall.name}` : 'Select a hall'}
                    </h3>
                    {isAdmin && selectedHall && (
                      <button onClick={() => { setEditBooth(null); setBoothForm({ number: '', size: '', hall_id: selectedHall.id }); setShowBoothModal(true); }} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        <Plus size={12} /> Add Booth
                      </button>
                    )}
                  </div>
                  {!selectedHall ? (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center">
                        <Building2 size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm">Select a hall to view booths</p>
                      </div>
                    </div>
                  ) : hallBooths.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center">
                        <LayoutGrid size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm">No booths in this hall</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {hallBooths.map((booth) => {
                        const exhibitor = booth.exhibitor as Profile | undefined;
                        return (
                          <div key={booth.id} className={`rounded-xl border p-3 relative group ${booth.status === 'assigned' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                            <div className="flex items-start justify-between mb-1.5">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">#{booth.number}</span>
                              <StatusBadge status={booth.status} size="sm" />
                            </div>
                            {booth.size && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{booth.size}</p>}
                            {exhibitor && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">{exhibitor.name}</p>}
                            {isAdmin && (
                              <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                                <button onClick={() => { setEditBooth(booth); setBoothForm({ number: booth.number, size: booth.size ?? '', hall_id: booth.hall_id }); setShowBoothModal(true); }} className="p-0.5 bg-white dark:bg-gray-900 rounded shadow text-gray-500 hover:text-blue-600"><Edit2 size={11} /></button>
                                <button onClick={() => setDeleteBoothTarget(booth)} className="p-0.5 bg-white dark:bg-gray-900 rounded shadow text-gray-500 hover:text-red-500"><Trash2 size={11} /></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SERVICES sub-tab */}
            {setupSubTab === 'services' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                  <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">Toggle services to enable or disable them for this event. Enabled services will appear in the exhibitor marketplace.</p>
                </div>
                {servicesByCategory.map(({ cat, services }) => (
                  <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{getCategoryLabel(cat)}</h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {services.map((service) => {
                        const enabled = eventServiceIds.has(service.id);
                        return (
                          <div key={service.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(service.price)} / {service.unit}</p>
                            </div>
                            {isAdmin ? (
                              <button onClick={() => toggleEventService(service.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {enabled ? <><ToggleRight size={14} />Enabled</> : <><ToggleLeft size={14} />Disabled</>}
                              </button>
                            ) : (
                              <StatusBadge status={enabled ? 'active' : 'closed'} size="sm" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ASSIGN EXHIBITOR sub-tab */}
            {setupSubTab === 'assign' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{participants.length} exhibitor(s) assigned to this event</p>
                  {isAdmin && (
                    <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                      <Plus size={15} /> Assign Exhibitor
                    </button>
                  )}
                </div>
                {loading ? (
                  <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <Users size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No exhibitors assigned yet</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {participants.map((p) => {
                        const exhibitor = p.exhibitor as Profile | undefined;
                        const booth = p.booth as Booth | undefined;
                        return (
                          <div key={p.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{exhibitor?.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{exhibitor?.name ?? '-'}</p>
                                <p className="text-xs text-gray-400">{exhibitor?.company ?? '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {booth ? (
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">Booth #{booth.number}</span>
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">No booth</span>
                              )}
                              <StatusBadge status={p.status} size="sm" />
                              {isAdmin && (
                                <button onClick={() => removeParticipant(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========== EXHIBITORS TAB ========== */}
        {activeTab === 'exhibitors' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">{participants.length} exhibitor(s)</p>
              {isAdmin && (
                <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                  <Plus size={15} /> Invite Exhibitor
                </button>
              )}
            </div>
            {loading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> : participants.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <Users size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No exhibitors invited yet</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {participants.map((p) => {
                    const exhibitor = p.exhibitor as Profile | undefined;
                    const booth = p.booth as Booth | undefined;
                    return (
                      <div key={p.id} className="flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{exhibitor?.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{exhibitor?.name ?? '-'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{exhibitor?.company ?? '-'} {exhibitor?.phone ? `· ${exhibitor.phone}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {booth ? (
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">Booth #{booth.number}</span>
                          ) : (
                            <span className="text-xs text-gray-400">No booth assigned</span>
                          )}
                          <StatusBadge status={p.status} size="sm" />
                          {isAdmin && (
                            <button onClick={() => removeParticipant(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== ORGANIZERS TAB ========== */}
        {activeTab === 'organizers' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">{organizers.length} organizer(s)</p>
              {isSuperAdmin && (
                <button onClick={() => setShowOrgModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                  <Plus size={15} /> Assign Organizer
                </button>
              )}
            </div>
            {loading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> : organizers.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <UserCheck size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No organizers assigned</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {organizers.map((o) => {
                    const org = o.organizer as Profile | undefined;
                    const hall = o.hall as Hall | undefined;
                    return (
                      <div key={o.id} className="flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{org?.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{org?.name ?? '-'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{org?.company ?? '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {hall && <span className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">{hall.name}</span>}
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">{o.role_label}</span>
                          {isSuperAdmin && (
                            <button onClick={() => removeOrganizer(o)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== CONTRACTORS TAB ========== */}
        {activeTab === 'contractors' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">{contractorAssignments.length} contractor(s) assigned</p>
              {isAdmin && (
                <button onClick={() => setShowContractorModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                  <Plus size={15} /> Assign Contractor
                </button>
              )}
            </div>
            {loading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> : contractorAssignments.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <Wrench size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No contractors assigned</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {contractorAssignments.map((ca) => {
                    const contractor = ca.contractor as Profile | undefined;
                    const hall = ca.hall as Hall | undefined;
                    return (
                      <div key={ca.id} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{contractor?.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{contractor?.name ?? '-'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{contractor?.company ?? '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hall && <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">{hall.name}</span>}
                            {isAdmin && (
                              <button onClick={() => removeContractor(ca)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </div>
                        {ca.service_categories && ca.service_categories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5 ml-13">
                            {ca.service_categories.map((cat) => (
                              <span key={cat} className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                {getCategoryLabel(cat)}
                              </span>
                            ))}
                          </div>
                        )}
                        {ca.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{ca.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== MODALS ========== */}

      {/* Hall Modal */}
      <Modal open={showHallModal} onClose={() => { setShowHallModal(false); setEditHall(null); }} title={editHall ? 'Edit Hall' : 'Add Hall'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hall Name *</label>
            <input value={hallForm.name} onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} placeholder="e.g. Hall A" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea rows={2} value={hallForm.description} onChange={(e) => setHallForm({ ...hallForm, description: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowHallModal(false); setEditHall(null); }} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
            <button onClick={saveHall} disabled={saving || !hallForm.name} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center justify-center gap-2">{saving && <LoadingSpinner size="sm" />}Save Hall</button>
          </div>
        </div>
      </Modal>

      {/* Booth Modal */}
      <Modal open={showBoothModal} onClose={() => { setShowBoothModal(false); setEditBooth(null); }} title={editBooth ? 'Edit Booth' : 'Add Booth'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hall *</label>
            <select value={boothForm.hall_id} onChange={(e) => setBoothForm({ ...boothForm, hall_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select hall</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Booth Number *</label>
              <input value={boothForm.number} onChange={(e) => setBoothForm({ ...boothForm, number: e.target.value })} placeholder="e.g. A-01" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Size</label>
              <input value={boothForm.size} onChange={(e) => setBoothForm({ ...boothForm, size: e.target.value })} placeholder="e.g. 3x3m" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowBoothModal(false); setEditBooth(null); }} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
            <button onClick={saveBooth} disabled={saving || !boothForm.number} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center justify-center gap-2">{saving && <LoadingSpinner size="sm" />}Save Booth</button>
          </div>
        </div>
      </Modal>

      {/* Invite Exhibitor Modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Assign Exhibitor">
        <div className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={exhibitorSearch} onChange={(e) => setExhibitorSearch(e.target.value)} placeholder="Search exhibitor..." className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
            {filteredExhibitors.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No exhibitors found</div>
            ) : filteredExhibitors.map((ex) => (
              <button key={ex.id} onClick={() => setInviteForm({ ...inviteForm, exhibitor_id: ex.id })} className={`w-full text-left px-4 py-3 transition-colors ${inviteForm.exhibitor_id === ex.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ex.company ?? '-'}</p>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assign Booth</label>
            <select value={inviteForm.booth_id} onChange={(e) => setInviteForm({ ...inviteForm, booth_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No booth (assign later)</option>
              {unassignedBooths.map((b) => <option key={b.id} value={b.id}>Booth #{b.number} — {halls.find((h) => h.id === b.hall_id)?.name ?? ''}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
            <button onClick={assignExhibitor} disabled={saving || !inviteForm.exhibitor_id} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center justify-center gap-2">{saving && <LoadingSpinner size="sm" />}Assign</button>
          </div>
        </div>
      </Modal>

      {/* Organizer Modal */}
      <Modal open={showOrgModal} onClose={() => setShowOrgModal(false)} title="Assign Organizer">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select EO Admin *</label>
            <select value={orgForm.organizer_id} onChange={(e) => setOrgForm({ ...orgForm, organizer_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select organizer</option>
              {eoAdmins.map((a) => <option key={a.id} value={a.id}>{a.name} {a.company ? `(${a.company})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Responsible Hall</label>
            <select value={orgForm.hall_id} onChange={(e) => setOrgForm({ ...orgForm, hall_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All halls (General)</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowOrgModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
            <button onClick={saveOrganizer} disabled={saving || !orgForm.organizer_id} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center justify-center gap-2">{saving && <LoadingSpinner size="sm" />}Assign</button>
          </div>
        </div>
      </Modal>

      {/* Contractor Modal */}
      <Modal open={showContractorModal} onClose={() => setShowContractorModal(false)} title="Assign Contractor">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contractor *</label>
            <select value={contractorForm.contractor_id} onChange={(e) => setContractorForm({ ...contractorForm, contractor_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select contractor</option>
              {contractorProfiles.map((c) => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assigned Hall</label>
            <select value={contractorForm.hall_id} onChange={(e) => setContractorForm({ ...contractorForm, hall_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All halls</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Categories (multi-select) *</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleContractorCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                    contractorForm.service_categories.includes(cat)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
                  }`}
                >
                  <Package size={11} />
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea rows={2} value={contractorForm.notes} onChange={(e) => setContractorForm({ ...contractorForm, notes: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowContractorModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
            <button onClick={saveContractor} disabled={saving || !contractorForm.contractor_id} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center justify-center gap-2">{saving && <LoadingSpinner size="sm" />}Assign</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteHallTarget}
        onConfirm={deleteHall}
        onCancel={() => setDeleteHallTarget(null)}
        title="Delete Hall"
        message={`Delete "${deleteHallTarget?.name}"? All booths inside will also be deleted.`}
        confirmLabel="Delete"
        danger
      />
      <ConfirmDialog
        open={!!deleteBoothTarget}
        onConfirm={deleteBooth}
        onCancel={() => setDeleteBoothTarget(null)}
        title="Delete Booth"
        message={`Delete booth #${deleteBoothTarget?.number}?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
