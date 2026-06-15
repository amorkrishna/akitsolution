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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_chat_sessions: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          messages: Json
          session_id: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          messages?: Json
          session_id: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          messages?: Json
          session_id?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      category_tiles: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string
          slug: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string
          slug: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string
          slug?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          company_name: string
          company_tagline: string | null
          created_at: string
          default_tax_rate: number
          email: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          mobile_banking: string | null
          phone: string | null
          show_payment_info: boolean
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_name?: string
          company_tagline?: string | null
          created_at?: string
          default_tax_rate?: number
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          mobile_banking?: string | null
          phone?: string | null
          show_payment_info?: boolean
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_name?: string
          company_tagline?: string | null
          created_at?: string
          default_tax_rate?: number
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          mobile_banking?: string | null
          phone?: string | null
          show_payment_info?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          rating: number
          review_text: string
          reviewer_name: string
          reviewer_role: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          rating?: number
          review_text: string
          reviewer_name: string
          reviewer_role?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          rating?: number
          review_text?: string
          reviewer_name?: string
          reviewer_role?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_habits: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          streak: number | null
          target_days: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          streak?: number | null
          target_days?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          streak?: number | null
          target_days?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_notes: {
        Row: {
          color: string | null
          content: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          note_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_date?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          is_recurring: boolean | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salaries: {
        Row: {
          base_salary: number
          bonus: number
          created_at: string
          deduction: number
          employee_id: string
          id: string
          net_salary: number
          notes: string | null
          paid_date: string | null
          payment_status: string
          salary_month: number
          salary_year: number
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deduction?: number
          employee_id: string
          id?: string
          net_salary?: number
          notes?: string | null
          paid_date?: string | null
          payment_status?: string
          salary_month: number
          salary_year: number
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deduction?: number
          employee_id?: string
          id?: string
          net_salary?: number
          notes?: string | null
          paid_date?: string | null
          payment_status?: string
          salary_month?: number
          salary_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          client_id: string | null
          created_at: string
          designation: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          project_id: string | null
          role: string
          status: string
          updated_at: string
          work_location: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          project_id?: string | null
          role?: string
          status?: string
          updated_at?: string
          work_location?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          project_id?: string | null
          role?: string
          status?: string
          updated_at?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          completed: boolean | null
          created_at: string
          duration_minutes: number
          id: string
          session_date: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          duration_minutes?: number
          id?: string
          session_date?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          duration_minutes?: number
          id?: string
          session_date?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed_date: string
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "daily_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
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
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          project_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          paid_amount: number
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          paid_amount?: number
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          paid_amount?: number
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          follow_up_date: string | null
          id: string
          message: string | null
          name: string
          notes: string | null
          phone: string | null
          service_type: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          service_type?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          service_type?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_posts: {
        Row: {
          campaign_type: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          platform: string
          product_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_type?: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          platform?: string
          product_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_type?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          platform?: string
          product_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_settings: {
        Row: {
          created_at: string
          facebook_page_url: string | null
          google_business_url: string | null
          id: string
          instagram_handle: string | null
          twitter_handle: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          facebook_page_url?: string | null
          google_business_url?: string | null
          id?: string
          instagram_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          facebook_page_url?: string | null
          google_business_url?: string | null
          id?: string
          instagram_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      planner_layouts: {
        Row: {
          created_at: string
          id: string
          is_shared: boolean
          measurements: Json
          name: string
          objects: Json
          room_depth: number
          room_height: number
          room_width: number
          share_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_shared?: boolean
          measurements?: Json
          name?: string
          objects?: Json
          room_depth?: number
          room_height?: number
          room_width?: number
          share_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_shared?: boolean
          measurements?: Json
          name?: string
          objects?: Json
          room_depth?: number
          room_height?: number
          room_width?: number
          share_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          category: string
          client_name: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_name?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_name?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock_quantity: number
          variant_group: string
          variant_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          variant_group?: string
          variant_label: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          variant_group?: string
          variant_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          call_for_price: boolean
          cash_discount_price: number | null
          category: string
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          image_url: string | null
          name: string
          price: number
          show_in_store: boolean
          is_featured: boolean
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          call_for_price?: boolean
          cash_discount_price?: number | null
          category?: string
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          show_in_store?: boolean
          is_featured?: boolean
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          call_for_price?: boolean
          cash_discount_price?: number | null
          category?: string
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          show_in_store?: boolean
          is_featured?: boolean
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          included_items: Json | null
          priority: string
          show_in_store: boolean
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          included_items?: Json | null
          priority?: string
          show_in_store?: boolean
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          included_items?: Json | null
          priority?: string
          show_in_store?: boolean
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_status: string
          product_id: string | null
          purchase_date: string
          quantity: number
          supplier_name: string
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          product_id?: string | null
          purchase_date?: string
          quantity?: number
          supplier_name: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          product_id?: string | null
          purchase_date?: string
          quantity?: number
          supplier_name?: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          id: string
          product_id: string | null
          quantity: number
          quotation_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          issue_date: string
          notes: string | null
          quotation_number: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          issue_date?: string
          notes?: string | null
          quotation_number: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          issue_date?: string
          notes?: string | null
          quotation_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_status: string
          product_id: string | null
          quantity: number
          sale_date: string
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          product_id?: string | null
          quantity?: number
          sale_date?: string
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          product_id?: string | null
          quantity?: number
          sale_date?: string
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          category: string
          created_at: string
          customer_name: string
          description: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          preferred_date: string | null
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          category?: string
          created_at?: string
          customer_name: string
          description: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_date?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          category?: string
          created_at?: string
          customer_name?: string
          description?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_date?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      servicing: {
        Row: {
          amount: number
          category: string
          client_name: string
          cost: number
          created_at: string
          description: string
          id: string
          notes: string | null
          service_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          client_name: string
          cost?: number
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          service_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_name?: string
          cost?: number
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          service_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_messages: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          is_read: boolean
          message: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          is_read?: boolean
          message: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          is_read?: boolean
          message?: string
        }
        Relationships: []
      }
      store_orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          invoice_id: string | null
          item_name: string
          item_price: number
          message: string | null
          product_id: string | null
          quantity: number
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          invoice_id?: string | null
          item_name: string
          item_price?: number
          message?: string | null
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          invoice_id?: string | null
          item_name?: string
          item_price?: number
          message?: string | null
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          announcement_active: boolean
          announcement_text: string | null
          banner_images: Json | null
          created_at: string
          custom_css: string | null
          facebook_url: string | null
          favicon_url: string | null
          fb_pixel_id: string | null
          footer_text: string | null
          ga_tracking_id: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram_url: string | null
          layout_style: string | null
          meta_description: string | null
          meta_title: string | null
          theme_primary_color: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          announcement_active?: boolean
          announcement_text?: string | null
          banner_images?: Json | null
          created_at?: string
          custom_css?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          footer_text?: string | null
          ga_tracking_id?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          layout_style?: string | null
          meta_description?: string | null
          meta_title?: string | null
          theme_primary_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          announcement_active?: boolean
          announcement_text?: string | null
          banner_images?: Json | null
          created_at?: string
          custom_css?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          footer_text?: string | null
          ga_tracking_id?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          layout_style?: string | null
          meta_description?: string | null
          meta_title?: string | null
          theme_primary_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      tenders: {
        Row: {
          budget_estimate: number | null
          created_at: string
          created_by: string | null
          deadline: string | null
          documents_url: string | null
          id: string
          notes: string | null
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_estimate?: number | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          documents_url?: string | null
          id?: string
          notes?: string | null
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_estimate?: number | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          documents_url?: string | null
          id?: string
          notes?: string | null
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          designation: string | null
          id: string
          is_approved: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          id?: string
          is_approved?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          id?: string
          is_approved?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      generate_quotation_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "ceo" | "manager" | "sales"
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
      app_role: ["admin", "employee", "ceo", "manager", "sales"],
    },
  },
} as const
