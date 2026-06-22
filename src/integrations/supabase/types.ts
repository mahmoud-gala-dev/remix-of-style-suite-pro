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
      alert_dismissals: {
        Row: {
          alert_key: string
          dismissed_at: string
          id: string
          snooze_until: string | null
          user_id: string
        }
        Insert: {
          alert_key: string
          dismissed_at?: string
          id?: string
          snooze_until?: string | null
          user_id: string
        }
        Update: {
          alert_key?: string
          dismissed_at?: string
          id?: string
          snooze_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          at: string
          diff: Json | null
          hash: string | null
          id: string
          prev_hash: string | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          diff?: Json | null
          hash?: string | null
          id?: string
          prev_hash?: string | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          diff?: Json | null
          hash?: string | null
          id?: string
          prev_hash?: string | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      audit_log_archive: {
        Row: {
          action: string
          actor: string | null
          at: string
          diff: Json | null
          id: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          diff?: Json | null
          id?: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          diff?: Json | null
          id?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          attempted_at: string
          email: string | null
          id: number
          ip: string | null
        }
        Insert: {
          attempted_at?: string
          email?: string | null
          id?: number
          ip?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string | null
          id?: number
          ip?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          branch_id: string
          created_at: string
          customer_id: string
          deposit_amount_cents: number | null
          deposit_currency: string | null
          deposit_held_at: string | null
          deposit_intent_id: string | null
          deposit_settled_at: string | null
          deposit_status: string | null
          employee_id: string
          end_at: string
          id: string
          manage_token: string
          notes: string | null
          price: number
          recurrence_group_id: string | null
          reminder_sent_at: string | null
          review_request_sent_at: string | null
          service_id: string
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          customer_id: string
          deposit_amount_cents?: number | null
          deposit_currency?: string | null
          deposit_held_at?: string | null
          deposit_intent_id?: string | null
          deposit_settled_at?: string | null
          deposit_status?: string | null
          employee_id: string
          end_at: string
          id?: string
          manage_token?: string
          notes?: string | null
          price?: number
          recurrence_group_id?: string | null
          reminder_sent_at?: string | null
          review_request_sent_at?: string | null
          service_id: string
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          customer_id?: string
          deposit_amount_cents?: number | null
          deposit_currency?: string | null
          deposit_held_at?: string | null
          deposit_intent_id?: string | null
          deposit_settled_at?: string | null
          deposit_status?: string | null
          employee_id?: string
          end_at?: string
          id?: string
          manage_token?: string
          notes?: string | null
          price?: number
          recurrence_group_id?: string | null
          reminder_sent_at?: string | null
          review_request_sent_at?: string | null
          service_id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          address: string | null
          chairs: number
          created_at: string
          hours_close: string
          hours_open: string
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          chairs?: number
          created_at?: string
          hours_close?: string
          hours_open?: string
          id?: string
          logo_url?: string | null
          name_ar: string
          name_en: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          chairs?: number
          created_at?: string
          hours_close?: string
          hours_open?: string
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          booking_id: string
          branch_id: string
          commission_pct: number
          created_at: string
          employee_id: string
          id: string
          paid: boolean
          paid_at: string | null
          service_price: number
        }
        Insert: {
          amount: number
          booking_id: string
          branch_id: string
          commission_pct: number
          created_at?: string
          employee_id: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          service_price: number
        }
        Update: {
          amount?: number
          booking_id?: string
          branch_id?: string
          commission_pct?: number
          created_at?: string
          employee_id?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          service_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          branch_id: string | null
          code: string
          created_at: string
          id: string
          kind: string
          max_uses: number | null
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
          value: number
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          code: string
          created_at?: string
          id?: string
          kind?: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          value?: number
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          code?: string
          created_at?: string
          id?: string
          kind?: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memberships: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string
          expires_at: string
          expiry_reminder_sent_at: string | null
          id: string
          plan_id: string
          remaining_visits: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id: string
          expires_at?: string
          expiry_reminder_sent_at?: string | null
          id?: string
          plan_id: string
          remaining_visits?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string
          expires_at?: string
          expiry_reminder_sent_at?: string | null
          id?: string
          plan_id?: string
          remaining_visits?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          birthday: string | null
          blocked: boolean
          branch_id: string
          created_at: string
          email: string | null
          gender: Database["public"]["Enums"]["gender_t"] | null
          id: string
          last_visit: string | null
          name: string
          no_show_count: number
          notes: string | null
          phone: string | null
          photo_url: string | null
          points: number
          total_spend: number
          updated_at: string
          visits: number
        }
        Insert: {
          auth_user_id?: string | null
          birthday?: string | null
          blocked?: boolean
          branch_id: string
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          last_visit?: string | null
          name: string
          no_show_count?: number
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          points?: number
          total_spend?: number
          updated_at?: string
          visits?: number
        }
        Update: {
          auth_user_id?: string | null
          birthday?: string | null
          blocked?: boolean
          branch_id?: string
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          last_visit?: string | null
          name?: string
          no_show_count?: number
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          points?: number
          total_spend?: number
          updated_at?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_days_off: {
        Row: {
          created_at: string
          day: string
          employee_id: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          day: string
          employee_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          day?: string
          employee_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_days_off_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          created_at: string
          employee_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          branch_id: string
          commission_pct: number
          created_at: string
          email: string | null
          id: string
          name_ar: string
          name_en: string
          phone: string | null
          photo_url: string | null
          rating: number
          role: string
          specialization: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          commission_pct?: number
          created_at?: string
          email?: string | null
          id?: string
          name_ar: string
          name_en: string
          phone?: string | null
          photo_url?: string | null
          rating?: number
          role?: string
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          commission_pct?: number
          created_at?: string
          email?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          phone?: string | null
          photo_url?: string | null
          rating?: number
          role?: string
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          qty: number
          service_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          qty?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          qty?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          booking_id: string | null
          branch_id: string | null
          coupon_id: string | null
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          issued_at: string
          notes: string | null
          number: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          branch_id?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          issued_at?: string
          notes?: string | null
          number?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          branch_id?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          issued_at?: string
          notes?: string | null
          number?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          branch_id: string | null
          created_at: string
          discount_pct: number
          id: string
          included_services: Json
          name_ar: string
          name_en: string
          price: number
          tier: string
          updated_at: string
          validity_days: number
          visits: number
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          discount_pct?: number
          id?: string
          included_services?: Json
          name_ar: string
          name_en: string
          price?: number
          tier?: string
          updated_at?: string
          validity_days?: number
          visits?: number
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          discount_pct?: number
          id?: string
          included_services?: Json
          name_ar?: string
          name_en?: string
          price?: number
          tier?: string
          updated_at?: string
          validity_days?: number
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          kind: string
          last_error: string | null
          payload: Json
          run_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          payload: Json
          run_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          used?: boolean
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          paid_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          booking_id: string | null
          branch_id: string | null
          created_at: string
          customer_id: string
          delta: number
          id: string
          reason: string
        }
        Insert: {
          booking_id?: string | null
          branch_id?: string | null
          created_at?: string
          customer_id: string
          delta: number
          id?: string
          reason?: string
        }
        Update: {
          booking_id?: string | null
          branch_id?: string | null
          created_at?: string
          customer_id?: string
          delta?: number
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          branch_id: string
          cost: number
          created_at: string
          id: string
          last_low_stock_alert_at: string | null
          low_stock_threshold: number
          name: string
          price: number
          sku: string | null
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          cost?: number
          created_at?: string
          id?: string
          last_low_stock_alert_at?: string | null
          low_stock_threshold?: number
          name: string
          price?: number
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          cost?: number
          created_at?: string
          id?: string
          last_low_stock_alert_at?: string | null
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          preferences: Json
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          preferences?: Json
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          preferences?: Json
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      queue_items: {
        Row: {
          branch_id: string
          created_at: string
          customer_id: string
          employee_id: string | null
          id: string
          position: number
          service_id: string | null
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          customer_id: string
          employee_id?: string | null
          id?: string
          position?: number
          service_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          customer_id?: string
          employee_id?: string | null
          id?: string
          position?: number
          service_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          key: string
          tokens: number
          updated_at: string
        }
        Insert: {
          key: string
          tokens: number
          updated_at?: string
        }
        Update: {
          key?: string
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      report_cache: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          payload: Json
        }
        Insert: {
          created_at?: string
          expires_at: string
          key: string
          payload: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          payload?: Json
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          branch_id: string
          comment: string | null
          created_at: string
          customer_id: string
          employee_id: string
          id: string
          rating: number
        }
        Insert: {
          booking_id: string
          branch_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          employee_id: string
          id?: string
          rating: number
        }
        Update: {
          booking_id?: string
          branch_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          employee_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          branch_id: string
          category: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          duration_min: number
          gender: Database["public"]["Enums"]["gender_t"]
          id: string
          image_url: string | null
          name_ar: string
          name_en: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          category?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_min?: number
          gender?: Database["public"]["Enums"]["gender_t"]
          id?: string
          image_url?: string | null
          name_ar: string
          name_en: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          category?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_min?: number
          gender?: Database["public"]["Enums"]["gender_t"]
          id?: string
          image_url?: string | null
          name_ar?: string
          name_en?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          booking_id: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          product_id: string
          qty: number
          unit_cost: number | null
        }
        Insert: {
          booking_id?: string | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          product_id: string
          qty: number
          unit_cost?: number | null
        }
        Update: {
          booking_id?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          product_id?: string
          qty?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          max_bookings_per_month: number
          status: string
          tenant_id: string
          tier: Database["public"]["Enums"]["billing_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          max_bookings_per_month?: number
          status?: string
          tenant_id: string
          tier?: Database["public"]["Enums"]["billing_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          max_bookings_per_month?: number
          status?: string
          tenant_id?: string
          tier?: Database["public"]["Enums"]["billing_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          salon_type: string
          staff_photos_public: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          salon_type?: string
          staff_photos_public?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          salon_type?: string
          staff_photos_public?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_2fa: {
        Row: {
          enabled: boolean
          enrolled_at: string
          last_verified_at: string | null
          secret: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          enrolled_at?: string
          last_verified_at?: string | null
          secret: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          enrolled_at?: string
          last_verified_at?: string | null
          secret?: string
          user_id?: string
        }
        Relationships: []
      }
      user_branches: {
        Row: {
          branch_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          branch_id: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          notified_at: string | null
          preferred_date: string | null
          service_id: string | null
          status: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date?: string | null
          service_id?: string | null
          status?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date?: string | null
          service_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      web_vitals_samples: {
        Row: {
          at: string
          id: number
          ip: string | null
          name: string
          rating: string | null
          route: string | null
          value: number
        }
        Insert: {
          at?: string
          id?: number
          ip?: string | null
          name: string
          rating?: string | null
          route?: string | null
          value: number
        }
        Update: {
          at?: string
          id?: number
          ip?: string | null
          name?: string
          rating?: string | null
          route?: string | null
          value?: number
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          event: string
          failed: boolean
          id: string
          next_retry_at: string | null
          payload: Json
          response: string | null
          status: number | null
          webhook_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          event: string
          failed?: boolean
          id?: string
          next_retry_at?: string | null
          payload: Json
          response?: string | null
          status?: number | null
          webhook_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          event?: string
          failed?: boolean
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response?: string | null
          status?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          event: string
          id: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          event: string
          id?: string
          secret?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          event?: string
          id?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_daily_revenue: {
        Row: {
          branch_id: string | null
          day: string | null
          invoice_count: number | null
          total_discount: number | null
          total_revenue: number | null
          total_tax: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries_dlq: {
        Row: {
          attempts: number | null
          created_at: string | null
          event: string | null
          failed: boolean | null
          id: string | null
          next_retry_at: string | null
          payload: Json | null
          response: string | null
          status: number | null
          webhook_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event?: string | null
          failed?: boolean | null
          id?: string | null
          next_retry_at?: string | null
          payload?: Json | null
          response?: string | null
          status?: number | null
          webhook_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event?: string | null
          failed?: boolean | null
          id?: string | null
          next_retry_at?: string | null
          payload?: Json | null
          response?: string | null
          status?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_old_audit_logs: { Args: never; Returns: number }
      check_rate_limit: {
        Args: { p_email: string; p_ip: string }
        Returns: undefined
      }
      check_token_bucket: {
        Args: { p_capacity: number; p_key: string; p_refill_per_min: number }
        Returns: number
      }
      cleanup_rate_limit_buckets: { Args: never; Returns: number }
      cleanup_report_cache: { Args: never; Returns: number }
      count_tenant_bookings_this_period: {
        Args: { _tenant_id: string }
        Returns: number
      }
      current_user_tenants: { Args: never; Returns: string[] }
      has_any_staff_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notification_jobs_health: {
        Args: never
        Returns: {
          failed: number
          pending: number
          stuck: number
        }[]
      }
      refresh_mv_daily_revenue: { Args: never; Returns: undefined }
      request_otp: { Args: { p_phone: string }; Returns: string }
      seed_service_templates: {
        Args: { _branch_id: string; _salon_type?: string; _tenant_id: string }
        Returns: number
      }
      user_has_branch: {
        Args: { _bid: string; _uid: string }
        Returns: boolean
      }
      verify_audit_chain: {
        Args: { p_limit?: number }
        Returns: {
          at: string
          id: string
          reason: string
        }[]
      }
      verify_otp: {
        Args: { p_code: string; p_phone: string }
        Returns: boolean
      }
      web_vitals_p75: {
        Args: { p_window_minutes?: number }
        Returns: {
          name: string
          p75: number
          samples: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "reception" | "staff" | "customer"
      billing_tier: "free" | "pro" | "enterprise"
      booking_status:
        | "pending"
        | "confirmed"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      gender_t: "male" | "female" | "both"
      queue_status:
        | "waiting"
        | "called"
        | "in_progress"
        | "completed"
        | "cancelled"
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
    Enums: {
      app_role: ["super_admin", "admin", "reception", "staff", "customer"],
      billing_tier: ["free", "pro", "enterprise"],
      booking_status: [
        "pending",
        "confirmed",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      gender_t: ["male", "female", "both"],
      queue_status: [
        "waiting",
        "called",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
