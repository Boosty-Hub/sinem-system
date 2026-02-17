// Auto-generated Supabase types - do not edit manually
// Regenerate with: supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          last_login: string | null
          name: string
          role_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          name: string
          role_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          name?: string
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
          status?: string
          total_projects?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
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
          bu: string
          client_id: string | null
          comments: string
          contact_id: string | null
          cost_usd: number
          cotorta: number
          created_at: string
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
          revenue: number
          scope: string
          status: string
          updated_at: string
          weighted: number
        }
        Insert: {
          bu?: string
          client_id?: string | null
          comments?: string
          contact_id?: string | null
          cost_usd?: number
          cotorta?: number
          created_at?: string
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
          revenue?: number
          scope?: string
          status?: string
          updated_at?: string
          weighted?: number
        }
        Update: {
          bu?: string
          client_id?: string | null
          comments?: string
          contact_id?: string | null
          cost_usd?: number
          cotorta?: number
          created_at?: string
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
          revenue?: number
          scope?: string
          status?: string
          updated_at?: string
          weighted?: number
        }
        Relationships: [
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
      quotations: {
        Row: {
          apply_itbis: boolean
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
          delivery_location: string
          delivery_time: string
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
        }
        Insert: {
          apply_itbis?: boolean
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
          delivery_location?: string
          delivery_time?: string
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
        }
        Update: {
          apply_itbis?: boolean
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
          delivery_location?: string
          delivery_time?: string
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
