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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string
          created_at: string
          email: string
          id: string
          last_login: string | null
          name: string
          phone: string
          role_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          name: string
          phone?: string
          role_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          phone?: string
          role_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_offers: {
        Row: {
          client_id: string
          code: string
          contact_id: string | null
          converted_to_project_id: string | null
          cost_usd: number
          created_at: string
          id: string
          items: string
          margin_percent: number
          margin_usd: number
          notes: string
          price_usd: number
          project_name: string
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id: string
          code: string
          contact_id?: string | null
          converted_to_project_id?: string | null
          cost_usd?: number
          created_at?: string
          id?: string
          items?: string
          margin_percent?: number
          margin_usd?: number
          notes?: string
          price_usd?: number
          project_name?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          code?: string
          contact_id?: string | null
          converted_to_project_id?: string | null
          cost_usd?: number
          created_at?: string
          id?: string
          items?: string
          margin_percent?: number
          margin_usd?: number
          notes?: string
          price_usd?: number
          project_name?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_offers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_offers_converted_to_project_id_fkey"
            columns: ["converted_to_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          industry: string
          name: string
          origin_prospect_id: string | null
          primary_contact_id: string | null
          status: string
          total_projects: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          address?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          industry?: string
          name: string
          origin_prospect_id?: string | null
          primary_contact_id?: string | null
          status?: string
          total_projects?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          address?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          industry?: string
          name?: string
          origin_prospect_id?: string | null
          primary_contact_id?: string | null
          status?: string
          total_projects?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clients_origin_prospect"
            columns: ["origin_prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          mobile: string | null
          notes: string
          phone: string
          position: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string
          first_name: string
          id?: string
          last_name: string
          mobile?: string | null
          notes?: string
          phone?: string
          position?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          mobile?: string | null
          notes?: string
          phone?: string
          position?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_months: {
        Row: {
          actual: number
          created_at: string
          forecast_year_id: string
          id: string
          month: string
          projected: number
          target: number
        }
        Insert: {
          actual?: number
          created_at?: string
          forecast_year_id: string
          id?: string
          month: string
          projected?: number
          target?: number
        }
        Update: {
          actual?: number
          created_at?: string
          forecast_year_id?: string
          id?: string
          month?: string
          projected?: number
          target?: number
        }
        Relationships: [
          {
            foreignKeyName: "forecast_months_forecast_year_id_fkey"
            columns: ["forecast_year_id"]
            isOneToOne: false
            referencedRelation: "forecast_years"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_years: {
        Row: {
          annual_target: number
          created_at: string
          id: string
          margin_budget: number
          previous_year_margin: number
          previous_year_revenue: number
          previous_year_won: number
          revenue_budget: number
          updated_at: string
          year: number
        }
        Insert: {
          annual_target?: number
          created_at?: string
          id?: string
          margin_budget?: number
          previous_year_margin?: number
          previous_year_revenue?: number
          previous_year_won?: number
          revenue_budget?: number
          updated_at?: string
          year: number
        }
        Update: {
          annual_target?: number
          created_at?: string
          id?: string
          margin_budget?: number
          previous_year_margin?: number
          previous_year_revenue?: number
          previous_year_won?: number
          revenue_budget?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      general_settings: {
        Row: {
          description: string | null
          id: number
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: never
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: never
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: number
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: never
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: never
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client: string
          client_id: string | null
          created_at: string
          current_step: number
          id: string
          name: string
          origin_prospect_id: string | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          client?: string
          client_id?: string | null
          created_at?: string
          current_step?: number
          id?: string
          name: string
          origin_prospect_id?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          client?: string
          client_id?: string | null
          created_at?: string
          current_step?: number
          id?: string
          name?: string
          origin_prospect_id?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_origin_prospect_id_fkey"
            columns: ["origin_prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_settings: {
        Row: {
          closing_text: string
          company_address: string
          company_email: string
          company_name: string
          company_phone: string
          company_rnc: string
          company_website: string
          cover_closing_text: string
          cover_intro_text: string
          cover_partner_text: string
          created_at: string
          default_itbis_percent: number
          footer_text: string
          greeting_text: string
          id: string
          installation_text: string
          legal_clauses: string
          logo_url: string
          purchase_order_info: string
          responsibility_text: string
          returns_text: string
          risks_text: string
          signature_email: string
          signature_image_url: string
          signature_name: string
          signature_phone: string
          signature_title: string
          updated_at: string
          validity_text: string
          warranty_text: string
        }
        Insert: {
          closing_text?: string
          company_address?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          company_rnc?: string
          company_website?: string
          cover_closing_text?: string
          cover_intro_text?: string
          cover_partner_text?: string
          created_at?: string
          default_itbis_percent?: number
          footer_text?: string
          greeting_text?: string
          id?: string
          installation_text?: string
          legal_clauses?: string
          logo_url?: string
          purchase_order_info?: string
          responsibility_text?: string
          returns_text?: string
          risks_text?: string
          signature_email?: string
          signature_image_url?: string
          signature_name?: string
          signature_phone?: string
          signature_title?: string
          updated_at?: string
          validity_text?: string
          warranty_text?: string
        }
        Update: {
          closing_text?: string
          company_address?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          company_rnc?: string
          company_website?: string
          cover_closing_text?: string
          cover_intro_text?: string
          cover_partner_text?: string
          created_at?: string
          default_itbis_percent?: number
          footer_text?: string
          greeting_text?: string
          id?: string
          installation_text?: string
          legal_clauses?: string
          logo_url?: string
          purchase_order_info?: string
          responsibility_text?: string
          returns_text?: string
          risks_text?: string
          signature_email?: string
          signature_image_url?: string
          signature_name?: string
          signature_phone?: string
          signature_title?: string
          updated_at?: string
          validity_text?: string
          warranty_text?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          assigned_to: string | null
          bu: string
          client_id: string | null
          code: string
          comments: string
          contact_id: string | null
          cost_usd: number
          cotorta: number
          created_at: string
          created_by: string | null
          direct_customer: string
          end_customer: string
          estimated_oe: string
          get_percent: number
          go_percent: number
          id: string
          margin_percent: number
          margin_usd: number
          price_usd: number
          probability: number
          product: string
          project_name: string
          proveedor: string
          revenue: string
          scope: string
          status: string
          updated_at: string
          weighted: number
        }
        Insert: {
          assigned_to?: string | null
          bu?: string
          client_id?: string | null
          code?: string
          comments?: string
          contact_id?: string | null
          cost_usd?: number
          cotorta?: number
          created_at?: string
          created_by?: string | null
          direct_customer?: string
          end_customer?: string
          estimated_oe?: string
          get_percent?: number
          go_percent?: number
          id?: string
          margin_percent?: number
          margin_usd?: number
          price_usd?: number
          probability?: number
          product?: string
          project_name: string
          proveedor?: string
          revenue?: string
          scope?: string
          status?: string
          updated_at?: string
          weighted?: number
        }
        Update: {
          assigned_to?: string | null
          bu?: string
          client_id?: string | null
          code?: string
          comments?: string
          contact_id?: string | null
          cost_usd?: number
          cotorta?: number
          created_at?: string
          created_by?: string | null
          direct_customer?: string
          end_customer?: string
          estimated_oe?: string
          get_percent?: number
          go_percent?: number
          id?: string
          margin_percent?: number
          margin_usd?: number
          price_usd?: number
          probability?: number
          product?: string
          project_name?: string
          proveedor?: string
          revenue?: string
          scope?: string
          status?: string
          updated_at?: string
          weighted?: number
        }
        Relationships: [
          {
            foreignKeyName: "prospects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          quotation_id: string
          sort_order: number
          total_usd: number
          unit_price_usd: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quotation_id: string
          sort_order?: number
          total_usd?: number
          unit_price_usd?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quotation_id?: string
          sort_order?: number
          total_usd?: number
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_line_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_snapshots: {
        Row: {
          code: string
          cost_usd: number
          delivery_location: string
          delivery_terms: string
          delivery_weeks_max: number
          delivery_weeks_min: number
          id: string
          line_items: Json
          margin_percent: number
          margin_usd: number
          modified_by: string | null
          notes: string
          payment_terms: string
          quotation_id: string
          saved_at: string
          status: string
          subject: string
          subtotal_usd: number
          total_usd: number
          validity_days: number
          version: number
        }
        Insert: {
          code?: string
          cost_usd?: number
          delivery_location?: string
          delivery_terms?: string
          delivery_weeks_max?: number
          delivery_weeks_min?: number
          id?: string
          line_items?: Json
          margin_percent?: number
          margin_usd?: number
          modified_by?: string | null
          notes?: string
          payment_terms?: string
          quotation_id: string
          saved_at?: string
          status?: string
          subject?: string
          subtotal_usd?: number
          total_usd?: number
          validity_days?: number
          version: number
        }
        Update: {
          code?: string
          cost_usd?: number
          delivery_location?: string
          delivery_terms?: string
          delivery_weeks_max?: number
          delivery_weeks_min?: number
          id?: string
          line_items?: Json
          margin_percent?: number
          margin_usd?: number
          modified_by?: string | null
          notes?: string
          payment_terms?: string
          quotation_id?: string
          saved_at?: string
          status?: string
          subject?: string
          subtotal_usd?: number
          total_usd?: number
          validity_days?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_snapshots_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_snapshots_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          apply_itbis: boolean
          approval_note: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          client_address: string
          client_attention: string
          client_company: string
          client_email: string
          client_id: string | null
          client_phone: string
          client_rnc: string
          code: string
          contact_id: string | null
          cost_usd: number
          created_at: string
          created_by: string | null
          currency: string
          delivery_location: string
          delivery_terms: string
          delivery_weeks_max: number
          delivery_weeks_min: number
          exchange_rate: number
          id: string
          itbis_percent: number
          itbis_usd: number
          margin_percent: number
          margin_usd: number
          notes: string
          payment_terms: string
          prospect_id: string | null
          status: string
          subject: string
          subtotal_usd: number
          total_usd: number
          updated_at: string
          validity_days: number
          version: number
        }
        Insert: {
          apply_itbis?: boolean
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          client_address?: string
          client_attention?: string
          client_company?: string
          client_email?: string
          client_id?: string | null
          client_phone?: string
          client_rnc?: string
          code: string
          contact_id?: string | null
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_location?: string
          delivery_terms?: string
          delivery_weeks_max?: number
          delivery_weeks_min?: number
          exchange_rate?: number
          id?: string
          itbis_percent?: number
          itbis_usd?: number
          margin_percent?: number
          margin_usd?: number
          notes?: string
          payment_terms?: string
          prospect_id?: string | null
          status?: string
          subject?: string
          subtotal_usd?: number
          total_usd?: number
          updated_at?: string
          validity_days?: number
          version?: number
        }
        Update: {
          apply_itbis?: boolean
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          client_address?: string
          client_attention?: string
          client_company?: string
          client_email?: string
          client_id?: string | null
          client_phone?: string
          client_rnc?: string
          code?: string
          contact_id?: string | null
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_location?: string
          delivery_terms?: string
          delivery_weeks_max?: number
          delivery_weeks_min?: number
          exchange_rate?: number
          id?: string
          itbis_percent?: number
          itbis_usd?: number
          margin_percent?: number
          margin_usd?: number
          notes?: string
          payment_terms?: string
          prospect_id?: string | null
          status?: string
          subject?: string
          subtotal_usd?: number
          total_usd?: number
          updated_at?: string
          validity_days?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author: string
          created_at: string
          id: string
          task_id: string
          text: string
        }
        Insert: {
          author?: string
          created_at?: string
          id?: string
          task_id: string
          text?: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string
          client_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string
          client_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string
          client_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
