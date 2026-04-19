export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_by: string | null
          contractor_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          request_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          request_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booths: {
        Row: {
          created_at: string | null
          event_id: string | null
          exhibitor_id: string | null
          hall_id: string | null
          id: string
          number: string
          size: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          exhibitor_id?: string | null
          hall_id?: string | null
          id?: string
          number: string
          size?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          exhibitor_id?: string | null
          hall_id?: string | null
          id?: string
          number?: string
          size?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booths_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booths_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booths_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_assignments: {
        Row: {
          booth_id: string | null
          contractor_id: string
          created_at: string | null
          event_id: string
          hall_id: string | null
          id: string
          notes: string | null
          service_categories: string[]
        }
        Insert: {
          booth_id?: string | null
          contractor_id: string
          created_at?: string | null
          event_id: string
          hall_id?: string | null
          id?: string
          notes?: string | null
          service_categories?: string[]
        }
        Update: {
          booth_id?: string | null
          contractor_id?: string
          created_at?: string | null
          event_id?: string
          hall_id?: string | null
          id?: string
          notes?: string | null
          service_categories?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "contractor_assignments_booth_id_fkey"
            columns: ["booth_id"]
            isOneToOne: false
            referencedRelation: "booths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_assignments_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors_services: {
        Row: {
          contractor_id: string | null
          created_at: string | null
          id: string
          service_id: string | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          service_id?: string | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_services_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      event_organizers: {
        Row: {
          created_at: string | null
          event_id: string
          hall_id: string | null
          id: string
          organizer_id: string
          role_label: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          hall_id?: string | null
          id?: string
          organizer_id: string
          role_label?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          hall_id?: string | null
          id?: string
          organizer_id?: string
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_organizers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organizers_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organizers_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          accepted_at: string | null
          booth_id: string | null
          created_at: string | null
          event_id: string
          exhibitor_id: string
          id: string
          invited_at: string | null
          notes: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          booth_id?: string | null
          created_at?: string | null
          event_id: string
          exhibitor_id: string
          id?: string
          invited_at?: string | null
          notes?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          booth_id?: string | null
          created_at?: string | null
          event_id?: string
          exhibitor_id?: string
          id?: string
          invited_at?: string | null
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_booth_id_fkey"
            columns: ["booth_id"]
            isOneToOne: false
            referencedRelation: "booths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_services: {
        Row: {
          created_at: string | null
          custom_price: number | null
          event_id: string
          id: string
          is_active: boolean
          service_id: string
        }
        Insert: {
          created_at?: string | null
          custom_price?: number | null
          event_id: string
          id?: string
          is_active?: boolean
          service_id: string
        }
        Update: {
          created_at?: string | null
          custom_price?: number | null
          event_id?: string
          id?: string
          is_active?: boolean
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_services_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          floorplan_url: string | null
          id: string
          location: string | null
          name: string
          organizer_id: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          floorplan_url?: string | null
          id?: string
          location?: string | null
          name: string
          organizer_id?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          floorplan_url?: string | null
          id?: string
          location?: string | null
          name?: string
          organizer_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      halls: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "halls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean
          message: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          booth_id: string | null
          created_at: string | null
          event_id: string | null
          exhibitor_id: string | null
          id: string
          invoice_number: string
          notes: string | null
          quantity: number
          service_id: string | null
          status: string
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          booth_id?: string | null
          created_at?: string | null
          event_id?: string | null
          exhibitor_id?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          quantity?: number
          service_id?: string | null
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          booth_id?: string | null
          created_at?: string | null
          event_id?: string | null
          exhibitor_id?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          quantity?: number
          service_id?: string | null
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_booth_id_fkey"
            columns: ["booth_id"]
            isOneToOne: false
            referencedRelation: "booths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_method: string
          proof_url: string | null
          request_id: string | null
          status: string
          updated_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method: string
          proof_url?: string | null
          request_id?: string | null
          status?: string
          updated_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          proof_url?: string | null
          request_id?: string | null
          status?: string
          updated_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          npwp: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean
          name?: string
          npwp?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          npwp?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          event_id: string | null
          exhibitor_id: string | null
          id: string
          request_number: string
          service_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          event_id?: string | null
          exhibitor_id?: string | null
          id?: string
          request_number: string
          service_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          event_id?: string | null
          exhibitor_id?: string | null
          id?: string
          request_number?: string
          service_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      showcase: {
        Row: {
          booth_id: string | null
          created_at: string | null
          description: string | null
          event_id: string
          exhibitor_id: string
          id: string
          key_visual_url: string | null
          logo_url: string | null
          products: Json
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          booth_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id: string
          exhibitor_id: string
          id?: string
          key_visual_url?: string | null
          logo_url?: string | null
          products?: Json
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          booth_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          exhibitor_id?: string
          id?: string
          key_visual_url?: string | null
          logo_url?: string | null
          products?: Json
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showcase_booth_id_fkey"
            columns: ["booth_id"]
            isOneToOne: false
            referencedRelation: "booths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_logs: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          photo_url: string | null
          status: string
          updated_by: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          photo_url?: string | null
          status?: string
          updated_by?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          photo_url?: string | null
          status?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
