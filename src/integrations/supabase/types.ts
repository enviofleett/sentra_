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
      affiliate_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          clicks: number
          code: string
          conversions: number
          created_at: string
          id: string
          is_active: boolean
          signups: number
          total_revenue: number
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number
          code: string
          conversions?: number
          created_at?: string
          id?: string
          is_active?: boolean
          signups?: number
          total_revenue?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number
          code?: string
          conversions?: number
          created_at?: string
          id?: string
          is_active?: boolean
          signups?: number
          total_revenue?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_at_risk"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_thresholds: {
        Row: {
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          name: string
          target_id: string | null
          target_type: Database["public"]["Enums"]["target_type"]
          threshold: number
          type: Database["public"]["Enums"]["threshold_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean
          name: string
          target_id?: string | null
          target_type: Database["public"]["Enums"]["target_type"]
          threshold: number
          type: Database["public"]["Enums"]["threshold_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          name?: string
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["target_type"]
          threshold?: number
          type?: Database["public"]["Enums"]["threshold_type"]
          updated_at?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          clicked_count: number
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          opened_count: number
          recipient_filter: string
          sent_at: string | null
          sent_count: number
          subject: string
          total_recipients: number
        }
        Insert: {
          clicked_count?: number
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          opened_count?: number
          recipient_filter?: string
          sent_at?: string | null
          sent_count?: number
          subject: string
          total_recipients?: number
        }
        Update: {
          clicked_count?: number
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          opened_count?: number
          recipient_filter?: string
          sent_at?: string | null
          sent_count?: number
          subject?: string
          total_recipients?: number
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_content: string
          id: string
          name: string
          subject: string
          template_id: string
          text_content: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: string
          name: string
          subject: string
          template_id: string
          text_content?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: string
          name?: string
          subject?: string
          template_id?: string
          text_content?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_tracking_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          recipient_email: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          recipient_email: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          recipient_email?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_brands: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      group_buy_campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_quantity: number | null
          discount_price: number
          expiry_at: string
          goal_quantity: number
          id: string
          payment_deadline: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          payment_window_hours: number | null
          product_id: string
          status: Database["public"]["Enums"]["campaign_status"] | null
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          discount_price: number
          expiry_at: string
          goal_quantity: number
          id?: string
          payment_deadline?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          payment_window_hours?: number | null
          product_id: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          discount_price?: number
          expiry_at?: string
          goal_quantity?: number
          id?: string
          payment_deadline?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          payment_window_hours?: number | null
          product_id?: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_buy_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buy_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_at_risk"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buy_commitments: {
        Row: {
          campaign_id: string
          committed_price: number
          created_at: string | null
          id: string
          order_id: string | null
          payment_deadline: string | null
          payment_ref: string | null
          payment_reference: string | null
          quantity: number
          status: Database["public"]["Enums"]["commitment_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          committed_price: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_deadline?: string | null
          payment_ref?: string | null
          payment_reference?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["commitment_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          committed_price?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_deadline?: string | null
          payment_ref?: string | null
          payment_reference?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["commitment_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_buy_commitments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "group_buy_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "membership_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_deposited: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_volumes: {
        Row: {
          created_at: string
          id: string
          order_count: number
          total_volume: number
          updated_at: string
          user_id: string
          year_month: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_count?: number
          total_volume?: number
          updated_at?: string
          user_id: string
          year_month: string
        }
        Update: {
          created_at?: string
          id?: string
          order_count?: number
          total_volume?: number
          updated_at?: string
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          applied_reseller_discount: boolean | null
          billing_address: Json | null
          created_at: string | null
          customer_email: string
          id: string
          items: Json
          notes: string | null
          order_type: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          paystack_status: string | null
          reseller_access_id: string | null
          shipping_address: Json | null
          shipping_cost: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_reseller_discount?: boolean | null
          billing_address?: Json | null
          created_at?: string | null
          customer_email: string
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          paystack_status?: string | null
          reseller_access_id?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_reseller_discount?: boolean | null
          billing_address?: Json | null
          created_at?: string | null
          customer_email?: string
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          paystack_status?: string | null
          reseller_access_id?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_reseller_access_id_fkey"
            columns: ["reseller_access_id"]
            isOneToOne: false
            referencedRelation: "reseller_access"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_launch_settings: {
        Row: {
          badge_1_icon: string | null
          badge_1_text: string | null
          badge_2_icon: string | null
          badge_2_text: string | null
          banner_image_url: string | null
          banner_subtitle: string | null
          banner_title: string | null
          created_at: string
          description_text: string | null
          headline_accent: string | null
          headline_text: string | null
          id: string
          is_prelaunch_mode: boolean | null
          launch_date: string | null
          updated_at: string
          waitlist_reward_amount: number | null
        }
        Insert: {
          badge_1_icon?: string | null
          badge_1_text?: string | null
          badge_2_icon?: string | null
          badge_2_text?: string | null
          banner_image_url?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          created_at?: string
          description_text?: string | null
          headline_accent?: string | null
          headline_text?: string | null
          id?: string
          is_prelaunch_mode?: boolean | null
          launch_date?: string | null
          updated_at?: string
          waitlist_reward_amount?: number | null
        }
        Update: {
          badge_1_icon?: string | null
          badge_1_text?: string | null
          badge_2_icon?: string | null
          badge_2_text?: string | null
          banner_image_url?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          created_at?: string
          description_text?: string | null
          headline_accent?: string | null
          headline_text?: string | null
          id?: string
          is_prelaunch_mode?: boolean | null
          launch_date?: string | null
          updated_at?: string
          waitlist_reward_amount?: number | null
        }
        Relationships: []
      }
      price_intelligence: {
        Row: {
          average_market_price: number | null
          competitor_data: Json | null
          created_at: string
          highest_market_price: number | null
          id: string
          last_scraped_at: string | null
          lowest_market_price: number | null
          product_id: string
          updated_at: string
        }
        Insert: {
          average_market_price?: number | null
          competitor_data?: Json | null
          created_at?: string
          highest_market_price?: number | null
          id?: string
          last_scraped_at?: string | null
          lowest_market_price?: number | null
          product_id: string
          updated_at?: string
        }
        Update: {
          average_market_price?: number | null
          competitor_data?: Json | null
          created_at?: string
          highest_market_price?: number | null
          id?: string
          last_scraped_at?: string | null
          lowest_market_price?: number | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_intelligence_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_intelligence_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_at_risk"
            referencedColumns: ["id"]
          },
        ]
      }
      proactive_vehicle_events: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          device_id: string
          event_type: string
          id: string
          message: string
          metadata: Json | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          device_id: string
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          device_id?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      product_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          product_id: string
          quantity: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          product_id: string
          quantity?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          product_id?: string
          quantity?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_pricing_audit: {
        Row: {
          change_reason: string | null
          change_source: string | null
          competitor_average: number | null
          created_at: string
          id: string
          new_price: number | null
          old_price: number | null
          product_id: string
          triggered_by: string | null
        }
        Insert: {
          change_reason?: string | null
          change_source?: string | null
          competitor_average?: number | null
          created_at?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id: string
          triggered_by?: string | null
        }
        Update: {
          change_reason?: string | null
          change_source?: string | null
          competitor_average?: number | null
          created_at?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_audit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_audit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_at_risk"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active_group_buy_id: string | null
          brand: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          gender: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean | null
          is_featured: boolean
          margin_override_allowed: boolean | null
          metadata: Json | null
          name: string
          original_price: number | null
          price: number
          scent_profile: string | null
          size: string | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
          vendor_id: string | null
          weight: number | null
        }
        Insert: {
          active_group_buy_id?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean
          margin_override_allowed?: boolean | null
          metadata?: Json | null
          name: string
          original_price?: number | null
          price: number
          scent_profile?: string | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          weight?: number | null
        }
        Update: {
          active_group_buy_id?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean
          margin_override_allowed?: boolean | null
          metadata?: Json | null
          name?: string
          original_price?: number | null
          price?: number
          scent_profile?: string | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_active_group_buy_id_fkey"
            columns: ["active_group_buy_id"]
            isOneToOne: false
            referencedRelation: "group_buy_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliate_code: string | null
          created_at: string
          current_rank_id: string | null
          default_billing_address: Json | null
          default_shipping_address: Json | null
          email: string
          full_name: string | null
          has_reseller_access: boolean | null
          id: string
          phone: string | null
          rank_updated_at: string | null
          referred_by: string | null
          reseller_access_expires_at: string | null
          updated_at: string
        }
        Insert: {
          affiliate_code?: string | null
          created_at?: string
          current_rank_id?: string | null
          default_billing_address?: Json | null
          default_shipping_address?: Json | null
          email: string
          full_name?: string | null
          has_reseller_access?: boolean | null
          id: string
          phone?: string | null
          rank_updated_at?: string | null
          referred_by?: string | null
          reseller_access_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_code?: string | null
          created_at?: string
          current_rank_id?: string | null
          default_billing_address?: Json | null
          default_shipping_address?: Json | null
          email?: string
          full_name?: string | null
          has_reseller_access?: boolean | null
          id?: string
          phone?: string | null
          rank_updated_at?: string | null
          referred_by?: string | null
          reseller_access_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_rank_id_fkey"
            columns: ["current_rank_id"]
            isOneToOne: false
            referencedRelation: "reseller_ranks"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_allocations: {
        Row: {
          admin_amount: number
          capital_amount: number
          commitment_id: string | null
          created_at: string
          growth_amount: number
          id: string
          marketing_amount: number
          order_id: string | null
          payment_reference: string
          split_config_id: string | null
          total_amount: number
        }
        Insert: {
          admin_amount: number
          capital_amount: number
          commitment_id?: string | null
          created_at?: string
          growth_amount: number
          id?: string
          marketing_amount: number
          order_id?: string | null
          payment_reference: string
          split_config_id?: string | null
          total_amount: number
        }
        Update: {
          admin_amount?: number
          capital_amount?: number
          commitment_id?: string | null
          created_at?: string
          growth_amount?: number
          id?: string
          marketing_amount?: number
          order_id?: string | null
          payment_reference?: string
          split_config_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "profit_allocations_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "group_buy_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_allocations_split_config_id_fkey"
            columns: ["split_config_id"]
            isOneToOne: false
            referencedRelation: "profit_split_config"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_split_config: {
        Row: {
          admin_percentage: number
          admin_subaccount_code: string | null
          capital_percentage: number
          capital_subaccount_code: string | null
          created_at: string
          growth_percentage: number
          growth_subaccount_code: string | null
          id: string
          is_active: boolean
          marketing_percentage: number
          marketing_subaccount_code: string | null
          name: string
          updated_at: string
        }
        Insert: {
          admin_percentage?: number
          admin_subaccount_code?: string | null
          capital_percentage?: number
          capital_subaccount_code?: string | null
          created_at?: string
          growth_percentage?: number
          growth_subaccount_code?: string | null
          id?: string
          is_active?: boolean
          marketing_percentage?: number
          marketing_subaccount_code?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          admin_percentage?: number
          admin_subaccount_code?: string | null
          capital_percentage?: number
          capital_subaccount_code?: string | null
          created_at?: string
          growth_percentage?: number
          growth_subaccount_code?: string | null
          id?: string
          is_active?: boolean
          marketing_percentage?: number
          marketing_subaccount_code?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          affiliate_link_id: string | null
          commission_paid: number
          created_at: string
          first_order_id: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_link_id?: string | null
          commission_paid?: number
          created_at?: string
          first_order_id?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_link_id?: string | null
          commission_paid?: number
          created_at?: string
          first_order_id?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_access: {
        Row: {
          created_at: string | null
          discount_percentage: number | null
          expires_at: string
          id: string
          is_active: boolean | null
          unlock_order_id: string | null
          unlocked_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          unlock_order_id?: string | null
          unlocked_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          unlock_order_id?: string | null
          unlocked_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_access_unlock_order_id_fkey"
            columns: ["unlock_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_ranks: {
        Row: {
          badge_color: string | null
          created_at: string
          description: string | null
          discount_percentage: number
          display_order: number
          id: string
          is_active: boolean
          min_monthly_volume: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          badge_color?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number
          display_order?: number
          id?: string
          is_active?: boolean
          min_monthly_volume?: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          badge_color?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number
          display_order?: number
          id?: string
          is_active?: boolean
          min_monthly_volume?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      scent_profiles: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          notes: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_matrix: {
        Row: {
          base_cost: number
          created_at: string
          destination_region_id: string
          estimated_days: string | null
          id: string
          is_active: boolean
          origin_region_id: string
          updated_at: string
          weight_rate: number
        }
        Insert: {
          base_cost?: number
          created_at?: string
          destination_region_id: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          origin_region_id: string
          updated_at?: string
          weight_rate?: number
        }
        Update: {
          base_cost?: number
          created_at?: string
          destination_region_id?: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          origin_region_id?: string
          updated_at?: string
          weight_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipping_matrix_destination_region_id_fkey"
            columns: ["destination_region_id"]
            isOneToOne: false
            referencedRelation: "shipping_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_matrix_origin_region_id_fkey"
            columns: ["origin_region_id"]
            isOneToOne: false
            referencedRelation: "shipping_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_regions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_weight_rates: {
        Row: {
          cost: number
          created_at: string
          id: string
          max_weight: number
          min_weight: number
          updated_at: string
        }
        Insert: {
          cost: number
          created_at?: string
          id?: string
          max_weight: number
          min_weight: number
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          max_weight?: number
          min_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_banners: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          section: string
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          section: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          section?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content_key: string
          content_type: string | null
          content_value: string
          created_at: string | null
          id: string
          section: string
          updated_at: string | null
        }
        Insert: {
          content_key: string
          content_type?: string | null
          content_value: string
          created_at?: string | null
          id?: string
          section: string
          updated_at?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string | null
          content_value?: string
          created_at?: string | null
          id?: string
          section?: string
          updated_at?: string | null
        }
        Relationships: []
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
      user_wallets: {
        Row: {
          balance_promo: number
          balance_real: number
          created_at: string
          id: string
          pending_withdrawal: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_promo?: number
          balance_real?: number
          created_at?: string
          id?: string
          pending_withdrawal?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_promo?: number
          balance_real?: number
          created_at?: string
          id?: string
          pending_withdrawal?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_shipping_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          min_quantity: number
          shipping_schedule: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_quantity: number
          shipping_schedule: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_quantity?: number
          shipping_schedule?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_shipping_rules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          bank_info: Json | null
          created_at: string | null
          email: string
          id: string
          min_order_quantity: number
          phone: string | null
          rep_full_name: string
          shipping_region_id: string | null
          store_location: string | null
          updated_at: string | null
        }
        Insert: {
          bank_info?: Json | null
          created_at?: string | null
          email: string
          id?: string
          min_order_quantity?: number
          phone?: string | null
          rep_full_name: string
          shipping_region_id?: string | null
          store_location?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_info?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          min_order_quantity?: number
          phone?: string | null
          rep_full_name?: string
          shipping_region_id?: string | null
          store_location?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_shipping_region_id_fkey"
            columns: ["shipping_region_id"]
            isOneToOne: false
            referencedRelation: "shipping_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list: {
        Row: {
          created_at: string
          email: string
          facebook_handle: string | null
          full_name: string | null
          id: string
          is_social_verified: boolean | null
          phone: string | null
          reward_credited: boolean | null
          social_handle: string | null
          tiktok_handle: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          facebook_handle?: string | null
          full_name?: string | null
          id?: string
          is_social_verified?: boolean | null
          phone?: string | null
          reward_credited?: boolean | null
          social_handle?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          facebook_handle?: string | null
          full_name?: string | null
          id?: string
          is_social_verified?: boolean | null
          phone?: string | null
          reward_credited?: boolean | null
          social_handle?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          is_promo: boolean
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          is_promo?: boolean
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          is_promo?: boolean
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_profitability: {
        Row: {
          avg_margin_percentage: number | null
          cost_data_coverage_pct: number | null
          low_margin_products: number | null
          products_with_cost_data: number | null
          profitable_products: number | null
          total_inventory_cost: number | null
          total_inventory_value: number | null
          total_potential_margin: number | null
          total_products: number | null
          unprofitable_products: number | null
        }
        Relationships: []
      }
      products_at_risk: {
        Row: {
          cost_price: number | null
          id: string | null
          is_active: boolean | null
          margin_amount: number | null
          margin_percentage: number | null
          name: string | null
          price: number | null
          risk_status: string | null
          stock_quantity: number | null
        }
        Insert: {
          cost_price?: number | null
          id?: string | null
          is_active?: boolean | null
          margin_amount?: never
          margin_percentage?: never
          name?: string | null
          price?: number | null
          risk_status?: never
          stock_quantity?: number | null
        }
        Update: {
          cost_price?: number | null
          id?: string | null
          is_active?: boolean | null
          margin_amount?: never
          margin_percentage?: never
          name?: string | null
          price?: number | null
          risk_status?: never
          stock_quantity?: number | null
        }
        Relationships: []
      }
      profiles_masked: {
        Row: {
          affiliate_code: string | null
          created_at: string | null
          current_rank_id: string | null
          default_billing_address: Json | null
          default_shipping_address: Json | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          referred_by: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_code?: string | null
          created_at?: string | null
          current_rank_id?: string | null
          default_billing_address?: never
          default_shipping_address?: never
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: never
          referred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_code?: string | null
          created_at?: string | null
          current_rank_id?: string | null
          default_billing_address?: never
          default_shipping_address?: never
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: never
          referred_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_rank_id_fkey"
            columns: ["current_rank_id"]
            isOneToOne: false
            referencedRelation: "reseller_ranks"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_bucket_totals: {
        Row: {
          total_admin: number | null
          total_capital: number | null
          total_growth: number | null
          total_marketing: number | null
          total_revenue: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_affiliate_commission: {
        Args: {
          p_commission_percentage?: number
          p_order_amount: number
          p_order_id: string
          p_referrer_id: string
        }
        Returns: string
      }
      atomic_decrement_campaign_quantity: {
        Args: { p_campaign_id: string; p_quantity: number }
        Returns: boolean
      }
      atomic_increment_campaign_quantity: {
        Args: { p_campaign_id: string; p_quantity: number }
        Returns: {
          error_message: string
          new_quantity: number
          remaining_spots: number
          success: boolean
        }[]
      }
      calculate_budget_limits: {
        Args: { p_product_id: string }
        Returns: {
          gross_profit: number
          growth_budget_amount: number
          marketing_budget_amount: number
        }[]
      }
      check_membership_status: {
        Args: { p_user_id: string }
        Returns: {
          balance: number
          is_member: boolean
          required_amount: number
        }[]
      }
      cleanup_expired_campaigns: { Args: never; Returns: undefined }
      credit_membership_wallet: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference: string
          p_user_id: string
        }
        Returns: string
      }
      credit_waitlist_reward: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      debit_membership_wallet: {
        Args: {
          p_amount: number
          p_description?: string
          p_order_id: string
          p_user_id: string
        }
        Returns: string
      }
      ensure_membership_wallet: { Args: { p_user_id: string }; Returns: string }
      ensure_user_wallet: { Args: { p_user_id: string }; Returns: string }
      generate_affiliate_code: { Args: { p_user_id: string }; Returns: string }
      get_active_reseller_access_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_reseller_discount_percentage: {
        Args: { p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_product_manager: { Args: never; Returns: boolean }
      process_withdrawal: {
        Args: {
          p_admin_id: string
          p_notes?: string
          p_status: Database["public"]["Enums"]["withdrawal_status"]
          p_withdrawal_id: string
        }
        Returns: boolean
      }
      record_profit_split: {
        Args: {
          p_commitment_id: string
          p_order_id: string
          p_payment_reference: string
          p_total_amount: number
        }
        Returns: string
      }
      sanitize_html: { Args: { p_html: string }; Returns: string }
      update_product_cost_price: {
        Args: { p_cost_price: number; p_product_id: string }
        Returns: boolean
      }
      user_has_reseller_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      verify_and_reward_user: {
        Args: { admin_id: string; entry_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "product_manager"
        | "order_processor"
        | "vendor"
      campaign_status:
        | "draft"
        | "active"
        | "goal_reached"
        | "expired"
        | "completed"
        | "cancelled"
        | "goal_met_pending_payment"
        | "goal_met_paid_finalized"
        | "failed_expired"
      commitment_status:
        | "committed_unpaid"
        | "committed_paid"
        | "payment_failed"
        | "cancelled"
        | "completed"
        | "payment_window_expired"
        | "refunded"
        | "paid_finalized"
      discount_type: "percentage" | "fixed"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_mode: "pay_to_book" | "pay_on_success"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      target_type: "global" | "product" | "category"
      threshold_type: "quantity" | "value"
      wallet_transaction_type:
        | "affiliate_commission"
        | "reseller_bonus"
        | "referral_signup"
        | "promo_credit"
        | "withdrawal_request"
        | "withdrawal_completed"
        | "withdrawal_cancelled"
        | "admin_adjustment"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "product_manager",
        "order_processor",
        "vendor",
      ],
      campaign_status: [
        "draft",
        "active",
        "goal_reached",
        "expired",
        "completed",
        "cancelled",
        "goal_met_pending_payment",
        "goal_met_paid_finalized",
        "failed_expired",
      ],
      commitment_status: [
        "committed_unpaid",
        "committed_paid",
        "payment_failed",
        "cancelled",
        "completed",
        "payment_window_expired",
        "refunded",
        "paid_finalized",
      ],
      discount_type: ["percentage", "fixed"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_mode: ["pay_to_book", "pay_on_success"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      target_type: ["global", "product", "category"],
      threshold_type: ["quantity", "value"],
      wallet_transaction_type: [
        "affiliate_commission",
        "reseller_bonus",
        "referral_signup",
        "promo_credit",
        "withdrawal_request",
        "withdrawal_completed",
        "withdrawal_cancelled",
        "admin_adjustment",
      ],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
