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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_token?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_metrics: {
        Row: {
          created_at: string | null
          dimensions: Json | null
          endpoint: string
          id: string
          metric_type: string
          metric_value: number
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          dimensions?: Json | null
          endpoint: string
          id?: string
          metric_type: string
          metric_value: number
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          dimensions?: Json | null
          endpoint?: string
          id?: string
          metric_type?: string
          metric_value?: number
          timestamp?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          category: string | null
          event_time: string | null
          id: string
          ip_address: string | null
          message: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          category?: string | null
          event_time?: string | null
          id?: string
          ip_address?: string | null
          message?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string | null
          event_time?: string | null
          id?: string
          ip_address?: string | null
          message?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          email: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          created_at: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          guests_count: number
          id: string
          special_requests: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          created_at?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          guests_count: number
          id?: string
          special_requests?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          created_at?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          guests_count?: number
          id?: string
          special_requests?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_baller_content: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      business_analytics: {
        Row: {
          created_at: string | null
          dimensions: Json | null
          id: string
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          metric_name?: string
          metric_value?: number
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      cart_sessions: {
        Row: {
          cart_data: Json
          created_at: string | null
          customer_id: string | null
          expires_at: string
          id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          cart_data?: Json
          created_at?: string | null
          customer_id?: string | null
          expires_at: string
          id?: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          cart_data?: Json
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string
          id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          order_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string | null
          template_key: string | null
          template_variables: Json | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string | null
          template_key?: string | null
          template_variables?: Json | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string | null
          template_key?: string | null
          template_variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      content_management: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          metadata: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          metadata?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          metadata?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          email_verified: boolean | null
          id: string
          name: string
          phone: string | null
          phone_verified: boolean | null
          profile_completion_percentage: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          id?: string
          name: string
          phone?: string | null
          phone_verified?: boolean | null
          profile_completion_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          id?: string
          name?: string
          phone?: string | null
          phone_verified?: boolean | null
          profile_completion_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          address_type: string | null
          city: string
          country: string | null
          created_at: string | null
          customer_id: string | null
          delivery_instructions: string | null
          id: string
          is_default: boolean | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          state: string
          street_address: string
          updated_at: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          address_type?: string | null
          city: string
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state: string
          street_address: string
          updated_at?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          address_type?: string | null
          city?: string
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state?: string
          street_address?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communication_preferences: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          email_enabled: boolean | null
          id: string
          marketing_emails: boolean | null
          order_updates: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          email_enabled?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          email_enabled?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products_view"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          created_at: string | null
          customer_id: string
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          newsletter_subscription: boolean | null
          order_updates: boolean | null
          preferred_currency: string | null
          preferred_language: string | null
          price_alerts: boolean | null
          promotion_alerts: boolean | null
          push_notifications: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          newsletter_subscription?: boolean | null
          order_updates?: boolean | null
          preferred_currency?: string | null
          preferred_language?: string | null
          price_alerts?: boolean | null
          promotion_alerts?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          newsletter_subscription?: boolean | null
          order_updates?: boolean | null
          preferred_currency?: string | null
          preferred_language?: string | null
          price_alerts?: boolean | null
          promotion_alerts?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_fees: {
        Row: {
          created_at: string | null
          fee: number
          id: string
          is_active: boolean | null
          max_order_value: number | null
          min_order_value: number | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string | null
          fee: number
          id?: string
          is_active?: boolean | null
          max_order_value?: number | null
          min_order_value?: number | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string | null
          fee?: number
          id?: string
          is_active?: boolean | null
          max_order_value?: number | null
          min_order_value?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_fees_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          base_fee: number | null
          color: string | null
          created_at: string | null
          description: string | null
          geometry: Json
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_fee?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          geometry: Json
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_fee?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          geometry?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string | null
          current_location: Json | null
          email: string | null
          id: string
          is_active: boolean | null
          license_number: string | null
          license_plate: string | null
          name: string
          phone: string
          profile_id: string | null
          updated_at: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          current_location?: Json | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          license_plate?: string | null
          name: string
          phone: string
          profile_id?: string | null
          updated_at?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          current_location?: Json | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          license_plate?: string | null
          name?: string
          phone?: string
          profile_id?: string | null
          updated_at?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      header_banners: {
        Row: {
          background_color: string | null
          created_at: string | null
          display_priority: number | null
          id: string
          is_active: boolean | null
          link_url: string | null
          message: string
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          display_priority?: number | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          message: string
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          display_priority?: number | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          message?: string
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hero_carousel_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      map_api_usage: {
        Row: {
          created_at: string | null
          date: string
          id: string
          requests_count: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          requests_count?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          requests_count?: number | null
        }
        Relationships: []
      }
      map_settings: {
        Row: {
          api_key: string | null
          created_at: string | null
          default_center: Json | null
          default_zoom: number | null
          id: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          default_center?: Json | null
          default_zoom?: number | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          default_center?: Json | null
          default_zoom?: number | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json | null
          created_at: string | null
          id: string
          order_id: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          order_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_delivery_schedule: {
        Row: {
          created_at: string | null
          delivery_date: string
          delivery_time_end: string | null
          delivery_time_start: string | null
          id: string
          is_flexible: boolean | null
          order_id: string
          requested_at: string | null
          special_instructions: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_date: string
          delivery_time_end?: string | null
          delivery_time_start?: string | null
          id?: string
          is_flexible?: boolean | null
          order_id: string
          requested_at?: string | null
          special_instructions?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_date?: string
          delivery_time_end?: string | null
          delivery_time_start?: string | null
          id?: string
          is_flexible?: boolean | null
          order_id?: string
          requested_at?: string | null
          special_instructions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_delivery_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          customizations: Json | null
          discount_amount: number | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          customizations?: Json | null
          discount_amount?: number | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          customizations?: Json | null
          discount_amount?: number | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products_view"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          amount_kobo: number | null
          assigned_rider_id: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_status: string | null
          delivery_time: string | null
          delivery_time_slot_id: string | null
          delivery_zone_id: string | null
          discount_amount: number | null
          estimated_delivery_date: string | null
          guest_session_id: string | null
          id: string
          idempotency_key: string | null
          last_modified_by: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"] | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payment_verified_at: string | null
          paystack_reference: string | null
          pickup_point_id: string | null
          pickup_ready: boolean | null
          pickup_time: string | null
          preferred_delivery_time: string | null
          processing_lock: boolean | null
          processing_officer_id: string | null
          processing_officer_name: string | null
          processing_started_at: string | null
          reference_updated_at: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          admin_notes?: string | null
          amount_kobo?: number | null
          assigned_rider_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_status?: string | null
          delivery_time?: string | null
          delivery_time_slot_id?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          guest_session_id?: string | null
          id?: string
          idempotency_key?: string | null
          last_modified_by?: string | null
          order_number: string
          order_type?: Database["public"]["Enums"]["order_type"] | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_verified_at?: string | null
          paystack_reference?: string | null
          pickup_point_id?: string | null
          pickup_ready?: boolean | null
          pickup_time?: string | null
          preferred_delivery_time?: string | null
          processing_lock?: boolean | null
          processing_officer_id?: string | null
          processing_officer_name?: string | null
          processing_started_at?: string | null
          reference_updated_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          admin_notes?: string | null
          amount_kobo?: number | null
          assigned_rider_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_status?: string | null
          delivery_time?: string | null
          delivery_time_slot_id?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          guest_session_id?: string | null
          id?: string
          idempotency_key?: string | null
          last_modified_by?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"] | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_verified_at?: string | null
          paystack_reference?: string | null
          pickup_point_id?: string | null
          pickup_ready?: boolean | null
          pickup_time?: string | null
          preferred_delivery_time?: string | null
          processing_lock?: boolean | null
          processing_officer_id?: string | null
          processing_officer_name?: string | null
          processing_started_at?: string | null
          reference_updated_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_integration_config: {
        Row: {
          connection_status: string | null
          created_at: string | null
          environment: string | null
          id: string
          live_public_key: string | null
          live_secret_key: string | null
          live_webhook_secret: string | null
          provider: string
          public_key: string | null
          secret_key: string | null
          test_mode: boolean | null
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          connection_status?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          live_public_key?: string | null
          live_secret_key?: string | null
          live_webhook_secret?: string | null
          provider?: string
          public_key?: string | null
          secret_key?: string | null
          test_mode?: boolean | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          connection_status?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          live_public_key?: string | null
          live_secret_key?: string | null
          live_webhook_secret?: string | null
          provider?: string
          public_key?: string | null
          secret_key?: string | null
          test_mode?: boolean | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          amount_kobo: number
          created_at: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          payment_method: string | null
          provider: string | null
          provider_reference: string | null
          reference: string
          status: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          amount_kobo: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          reference: string
          status: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          amount_kobo?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          reference?: string
          status?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_points: {
        Row: {
          address: string
          contact_email: string | null
          contact_phone: string | null
          coordinates: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          operating_hours: Json | null
          updated_at: string | null
        }
        Insert: {
          address: string
          contact_email?: string | null
          contact_phone?: string | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          operating_hours?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          contact_email?: string | null
          contact_phone?: string | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          operating_hours?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          helpful_count: number | null
          id: string
          is_published: boolean | null
          not_helpful_count: number | null
          order_id: string | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string | null
          verified_purchase: boolean | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          order_id?: string | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string | null
          verified_purchase?: boolean | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          order_id?: string | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string | null
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products_view"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          image_url: string | null
          ingredients: Json | null
          is_active: boolean | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_active?: boolean | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_active?: boolean | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          customer_id: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          customer_id: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          customer_id?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          must_change_password: boolean | null
          name: string
          password_changed_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          name: string
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          name?: string
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promotion_usage: {
        Row: {
          customer_email: string
          customer_id: string | null
          discount_amount: number
          id: string
          order_id: string | null
          promotion_id: string | null
          used_at: string | null
        }
        Insert: {
          customer_email: string
          customer_id?: string | null
          discount_amount: number
          id?: string
          order_id?: string | null
          promotion_id?: string | null
          used_at?: string | null
        }
        Update: {
          customer_email?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          promotion_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["promotion_type"]
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_value: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["promotion_status"] | null
          times_used: number | null
          updated_at: string | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["promotion_type"]
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_value?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["promotion_status"] | null
          times_used?: number | null
          updated_at?: string | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["promotion_type"]
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_value?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["promotion_status"] | null
          times_used?: number | null
          updated_at?: string | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      public_holidays: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          created_at: string | null
          id: string
          request_data: Json | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_data?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_data?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          type?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          id: string
          menu_section: Database["public"]["Enums"]["menu_section"]
          permission_level: Database["public"]["Enums"]["permission_level"]
          user_id: string | null
        }
        Insert: {
          id?: string
          menu_section: Database["public"]["Enums"]["menu_section"]
          permission_level: Database["public"]["Enums"]["permission_level"]
          user_id?: string | null
        }
        Update: {
          id?: string
          menu_section?: Database["public"]["Enums"]["menu_section"]
          permission_level?: Database["public"]["Enums"]["permission_level"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_menu: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_menu_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "website_menu"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_products_view: {
        Row: {
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string | null
          image_url: string | null
          ingredients: Json | null
          is_active: boolean | null
          name: string | null
          price: number | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_profile_completion: {
        Args: { customer_uuid: string }
        Returns: number
      }
      check_otp_rate_limit: { Args: { p_email: string }; Returns: Json }
      check_production_readiness: { Args: never; Returns: Json }
      generate_order_number: { Args: never; Returns: string }
      get_analytics_dashboard: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_comprehensive_order_fulfillment: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_daily_revenue_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          avg_order_value: number
          date: string
          total_orders: number
          total_revenue: number
        }[]
      }
      get_driver_orders_detail: {
        Args: { p_driver_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          customer_name: string
          delivery_address: Json
          delivery_fee: number
          order_date: string
          order_id: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
        }[]
      }
      get_driver_revenue_report: {
        Args: { p_end_date: string; p_interval?: string; p_start_date: string }
        Returns: {
          avg_delivery_fee: number
          driver_id: string
          driver_name: string
          interval_start: string
          total_deliveries: number
          total_delivery_fees: number
          total_revenue: number
        }[]
      }
      get_product_sales_trends: {
        Args: {
          p_end_date: string
          p_interval?: string
          p_product_id: string
          p_start_date: string
        }
        Returns: {
          interval_start: string
          orders_count: number
          revenue: number
          units_sold: number
        }[]
      }
      get_products_sold_report: {
        Args: { p_end_date: string; p_interval?: string; p_start_date: string }
        Returns: {
          avg_price: number
          interval_start: string
          product_id: string
          product_name: string
          total_revenue: number
          units_sold: number
        }[]
      }
      get_top_selling_products: {
        Args: { p_end_date: string; p_limit?: number; p_start_date: string }
        Returns: {
          avg_order_quantity: number
          number_of_orders: number
          product_id: string
          product_name: string
          total_revenue: number
          total_units_sold: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_privilege_escalation_attempt: {
        Args: {
          p_details: Json
          p_email: string
          p_user_id: string
          p_violation_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff" | "viewer" | "super_admin"
      menu_section:
        | "dashboard"
        | "orders"
        | "products"
        | "customers"
        | "reports"
        | "settings"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "completed"
        | "returned"
      order_type: "delivery" | "pickup" | "dine-in"
      payment_status: "pending" | "paid" | "refunded" | "failed"
      permission_level: "none" | "read" | "write" | "admin"
      promotion_status: "active" | "inactive" | "expired" | "scheduled"
      promotion_type:
        | "percentage"
        | "fixed_amount"
        | "free_shipping"
        | "buy_one_get_one"
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
      app_role: ["admin", "manager", "staff", "viewer", "super_admin"],
      menu_section: [
        "dashboard",
        "orders",
        "products",
        "customers",
        "reports",
        "settings",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
        "completed",
        "returned",
      ],
      order_type: ["delivery", "pickup", "dine-in"],
      payment_status: ["pending", "paid", "refunded", "failed"],
      permission_level: ["none", "read", "write", "admin"],
      promotion_status: ["active", "inactive", "expired", "scheduled"],
      promotion_type: [
        "percentage",
        "fixed_amount",
        "free_shipping",
        "buy_one_get_one",
      ],
    },
  },
} as const
