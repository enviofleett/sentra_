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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
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
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          subject: string
          template_id: string
          text_content: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          subject: string
          template_id: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          subject?: string
          template_id?: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      group_buy_campaigns: {
        Row: {
          created_at: string | null
          current_quantity: number
          discount_price: number
          expiry_at: string
          goal_quantity: number
          id: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          payment_window_hours: number
          product_id: string
          status: Database["public"]["Enums"]["group_buy_status"]
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          current_quantity?: number
          discount_price: number
          expiry_at: string
          goal_quantity: number
          id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_window_hours?: number
          product_id: string
          status?: Database["public"]["Enums"]["group_buy_status"]
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          current_quantity?: number
          discount_price?: number
          expiry_at?: string
          goal_quantity?: number
          id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_window_hours?: number
          product_id?: string
          status?: Database["public"]["Enums"]["group_buy_status"]
          updated_at?: string | null
          vendor_id?: string
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
            foreignKeyName: "group_buy_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
          quantity: number
          status: Database["public"]["Enums"]["commitment_status"]
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
          quantity?: number
          status?: Database["public"]["Enums"]["commitment_status"]
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
          quantity?: number
          status?: Database["public"]["Enums"]["commitment_status"]
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
          {
            foreignKeyName: "group_buy_commitments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_items: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          billing_address: Json
          commitment_id: string | null
          created_at: string
          customer_email: string
          id: string
          items: Json
          paystack_reference: string | null
          paystack_status: string | null
          shipping_address: Json
          shipping_cost: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address: Json
          commitment_id?: string | null
          created_at?: string
          customer_email: string
          id?: string
          items: Json
          paystack_reference?: string | null
          paystack_status?: string | null
          shipping_address: Json
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax?: number | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json
          commitment_id?: string | null
          created_at?: string
          customer_email?: string
          id?: string
          items?: Json
          paystack_reference?: string | null
          paystack_status?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "group_buy_commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          product_id: string | null
          quantity: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          product_id?: string | null
          quantity?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          product_id?: string | null
          quantity?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active_group_buy_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean
          is_featured: boolean
          name: string
          original_price: number | null
          price: number
          scent_profile: Database["public"]["Enums"]["scent_profile"] | null
          stock_quantity: number
          vendor_id: string
        }
        Insert: {
          active_group_buy_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          original_price?: number | null
          price?: number
          scent_profile?: Database["public"]["Enums"]["scent_profile"] | null
          stock_quantity?: number
          vendor_id: string
        }
        Update: {
          active_group_buy_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          original_price?: number | null
          price?: number
          scent_profile?: Database["public"]["Enums"]["scent_profile"] | null
          stock_quantity?: number
          vendor_id?: string
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
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          rating: number | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          rating?: number | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          rating?: number | null
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
          created_at: string
          email: string
          id: string
          phone: string | null
          rep_full_name: string
          store_location: string | null
          updated_at: string
        }
        Insert: {
          bank_info?: Json | null
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          rep_full_name: string
          store_location?: string | null
          updated_at?: string
        }
        Update: {
          bank_info?: Json | null
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          rep_full_name?: string
          store_location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_order_processor: { Args: never; Returns: boolean }
      is_product_manager: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "product_manager"
        | "order_processor"
        | "vendor"
      commitment_status:
        | "committed_unpaid"
        | "committed_paid"
        | "payment_window_expired"
        | "refunded"
      group_buy_status:
        | "pending"
        | "active"
        | "goal_met_pending_payment"
        | "goal_met_finalized"
        | "failed_expired"
        | "failed_cancelled"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_mode: "pay_to_book" | "pay_on_success"
      scent_profile:
        | "floral"
        | "citrus"
        | "woody"
        | "oriental"
        | "fresh"
        | "spicy"
        | "aquatic"
        | "gourmand"
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
      commitment_status: [
        "committed_unpaid",
        "committed_paid",
        "payment_window_expired",
        "refunded",
      ],
      group_buy_status: [
        "pending",
        "active",
        "goal_met_pending_payment",
        "goal_met_finalized",
        "failed_expired",
        "failed_cancelled",
      ],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_mode: ["pay_to_book", "pay_on_success"],
      scent_profile: [
        "floral",
        "citrus",
        "woody",
        "oriental",
        "fresh",
        "spicy",
        "aquatic",
        "gourmand",
      ],
    },
  },
} as const
