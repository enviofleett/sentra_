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
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          customer_email: string
          id: string
          items: Json
          notes: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          paystack_status: string | null
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
          billing_address?: Json | null
          created_at?: string | null
          customer_email: string
          id?: string
          items?: Json
          notes?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          paystack_status?: string | null
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
          billing_address?: Json | null
          created_at?: string | null
          customer_email?: string
          id?: string
          items?: Json
          notes?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          paystack_status?: string | null
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
        Relationships: []
      }
      pre_launch_settings: {
        Row: {
          banner_image_url: string | null
          banner_subtitle: string | null
          banner_title: string | null
          created_at: string
          id: string
          is_prelaunch_mode: boolean | null
          launch_date: string | null
          updated_at: string
          waitlist_reward_amount: number | null
        }
        Insert: {
          banner_image_url?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          created_at?: string
          id?: string
          is_prelaunch_mode?: boolean | null
          launch_date?: string | null
          updated_at?: string
          waitlist_reward_amount?: number | null
        }
        Update: {
          banner_image_url?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          created_at?: string
          id?: string
          is_prelaunch_mode?: boolean | null
          launch_date?: string | null
          updated_at?: string
          waitlist_reward_amount?: number | null
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
      products: {
        Row: {
          active_group_buy_id: string | null
          brand: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean | null
          is_featured: boolean
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
        }
        Insert: {
          active_group_buy_id?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean
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
        }
        Update: {
          active_group_buy_id?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean
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
          created_at: string
          default_billing_address: Json | null
          default_shipping_address: Json | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_billing_address?: Json | null
          default_shipping_address?: Json | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_billing_address?: Json | null
          default_shipping_address?: Json | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
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
      vendors: {
        Row: {
          bank_info: Json | null
          created_at: string | null
          email: string
          id: string
          phone: string | null
          rep_full_name: string
          store_location: string | null
          updated_at: string | null
        }
        Insert: {
          bank_info?: Json | null
          created_at?: string | null
          email: string
          id?: string
          phone?: string | null
          rep_full_name: string
          store_location?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_info?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          phone?: string | null
          rep_full_name?: string
          store_location?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waiting_list: {
        Row: {
          created_at: string
          email: string
          facebook_handle: string | null
          full_name: string | null
          id: string
          is_social_verified: boolean | null
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
          reward_credited?: boolean | null
          social_handle?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      cleanup_expired_campaigns: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_product_manager: { Args: never; Returns: boolean }
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
    },
  },
} as const
