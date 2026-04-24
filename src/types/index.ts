import type { Tables } from '../lib/database.types'

export type Profile = Tables<'profiles'>
export type Event = Tables<'events'>
export type Order = Tables<'orders'>
export type Payment = Tables<'payments'>
export type Assignment = Tables<'assignments'>
export type WorkLog = Tables<'work_logs'>

export type UserRole =
  | 'super_admin'
  | 'eo_admin'
  | 'exhibitor'
  | 'contractor'

export type Page =
  | 'dashboard'
  | 'users'
  | 'events'
  | 'services'
  | 'orders'
  | 'payments'
  | 'monitoring'

  