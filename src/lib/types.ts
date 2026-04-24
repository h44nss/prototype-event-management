// ==========================================
// ENUMS & LITERAL TYPES
// ==========================================

export type UserRole = 'super_admin' | 'eo_admin' | 'exhibitor' | 'contractor';
export type EventStatus = 'draft' | 'published' | 'active' | 'closed' | 'cancelled';
export type ServiceCategory = 'electricity' | 'internet' | 'booth_support' | 'furniture' | 'av_equipment' | 'general';
export type OrderStatus = 'pending_payment' | 'paid' | 'assigned' | 'on_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending_verification' | 'approved' | 'rejected';
export type WorkStatus = 'instruction_received' | 'in_progress' | 'complete' | 'need_revision';
export type BoothStatus = 'available' | 'assigned';
export type ParticipantStatus = 'invited' | 'accepted' | 'declined';
export type Page =
  | 'dashboard' | 'users' | 'events' | 'event_detail' | 'services'
  | 'marketplace' | 'my_booth' | 'showcase'
  | 'orders' | 'payments' | 'work_tracking' | 'monitoring' | 'reports';

// ==========================================
// DOMAIN MODELS
// ==========================================

export interface Profile {
  id: string;
  full_name: string | null; // Sesuai nama kolom di DB
  role: UserRole;
  company: string | null;
  phone: string | null;
  npwp: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at?: string | null; // Gunakan tanda ? agar tidak wajib (opsional)
  
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  status: EventStatus;
  organizer_id: string | null;
  floorplan_url: string | null;
  created_at: string;
  updated_at: string;
  organizer?: Profile;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  price: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Hall {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  created_at: string;
  event?: Event;
  booths?: Booth[];
}

export interface Booth {
  id: string;
  hall_id: string;
  event_id: string;
  number: string;
  size: string | null;
  status: BoothStatus;
  exhibitor_id: string | null;
  created_at: string;
  updated_at: string;
  hall?: Hall;
  exhibitor?: Profile;
}

export interface EventService {
  id: string;
  event_id: string;
  service_id: string;
  custom_price: number | null;
  is_active: boolean;
  created_at: string;
  service?: Service;
  event?: Event;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  exhibitor_id: string;
  booth_id: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: ParticipantStatus;
  notes: string | null;
  created_at: string;
  exhibitor?: Profile;
  booth?: Booth;
  event?: Event;
}

export interface EventOrganizer {
  id: string;
  event_id: string;
  organizer_id: string;
  hall_id: string | null;
  role_label: string;
  created_at: string;
  organizer?: Profile;
  hall?: Hall;
  event?: Event;
}

export interface ContractorAssignment {
  id: string;
  event_id: string;
  contractor_id: string;
  hall_id: string | null;
  booth_id: string | null;
  service_categories: ServiceCategory[];
  notes: string | null;
  created_at: string;
  contractor?: Profile;
  hall?: Hall;
  booth?: Booth;
  event?: Event;
}

export interface Order {
  id: string;
  invoice_number: string;
  event_id: string;
  booth_id: string | null;
  exhibitor_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at?: string | null;
  event?: Event;
  booth?: Booth;
  exhibitor?: Profile;
  service?: Service;
}

export interface Payment {
  id: string;
  request_id: string | null;
  order_id: string;
  payment_method: string;
  proof_url: string | null;
  status: PaymentStatus;
  notes: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
  verifier?: Profile;
}

export interface Assignment {
  id: string;
  order_id: string | null;
  contractor_id: string | null;
  notes: string | null;
  created_at: string | null;
  order?: Order;
  contractor?: Profile;
  assigner?: Profile;
  work_logs?: WorkLog[];
}

export interface WorkLog {
  id: string;
  assignment_id: string;
  order_id: string;
  status: WorkStatus;
  notes: string | null;
  photo_url: string | null;
  updated_by: string;
  created_at: string;
  updater?: Profile;
  assignment?: Assignment;
}

export interface ShowcaseProduct {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number | null;
}

export interface Showcase {
  id: string;
  exhibitor_id: string;
  event_id: string;
  booth_id: string | null;
  logo_url: string | null;
  key_visual_url: string | null;
  description: string | null;
  website_url: string | null;
  products: ShowcaseProduct[];
  created_at: string;
  updated_at: string;
  exhibitor?: Profile;
  event?: Event;
  booth?: Booth;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}
