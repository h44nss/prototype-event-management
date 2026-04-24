export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${random}`;
}

export function generateRequestNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${year}${month}${day}-${random}`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    eo_admin: 'EO Admin',
    exhibitor: 'Exhibitor',
    contractor: 'Contractor',
  };
  return labels[role] ?? role;
}

export function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    electricity: 'Electricity',
    internet: 'Internet',
    booth_support: 'Booth Support',
    furniture: 'Furniture',
    av_equipment: 'AV Equipment',
    general: 'General',
  };
  return labels[cat] ?? cat;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    active: 'Active',
    closed: 'Closed',
    cancelled: 'Cancelled',
    pending_payment: 'Pending Payment',
    paid: 'Paid',
    assigned: 'Assigned',
    on_progress: 'On Progress',
    completed: 'Completed',
    pending_verification: 'Pending Verification',
    approved: 'Approved',
    rejected: 'Rejected',
    instruction_received: 'Instruction Received',
    in_progress: 'In Progress',
    complete: 'Complete',
    need_revision: 'Need Revision',
    available: 'Available',
    invited: 'Invited',
    accepted: 'Accepted',
    declined: 'Declined',
  };
  return labels[status] ?? status;
}

export function canAccess(role: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(role);
}
