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
      addresses: {
        Row: {
          city: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string | null
          line1: string
          line2: string | null
          phone: string
          postal_code: string | null
          user_id: string
          zone_id: string | null
        }
        Insert: {
          city: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string | null
          line1: string
          line2?: string | null
          phone: string
          postal_code?: string | null
          user_id: string
          zone_id?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string | null
          line1?: string
          line2?: string | null
          phone?: string
          postal_code?: string | null
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          id: string
          link: string | null
          sort_order: number
          text: string
        }
        Insert: {
          active?: boolean
          id?: string
          link?: string | null
          sort_order?: number
          text: string
        }
        Update: {
          active?: boolean
          id?: string
          link?: string | null
          sort_order?: number
          text?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          badge: string | null
          created_at: string
          cta_label: string | null
          cta_link: string | null
          id: string
          image_url: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
          type: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          type?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          type?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty?: number
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
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          sender: Database["public"]["Enums"]["chat_sender"]
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          sender: Database["public"]["Enums"]["chat_sender"]
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          sender?: Database["public"]["Enums"]["chat_sender"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          guest_email: string | null
          guest_name: string
          id: string
          last_message_at: string
          status: string
          unread_admin: number
          unread_user: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          guest_name: string
          id?: string
          last_message_at?: string
          status?: string
          unread_admin?: number
          unread_user?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_admin?: number
          unread_user?: number
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          active: boolean
          id: string
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      incomplete_orders: {
        Row: {
          cart: Json
          converted_to_order_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          last_field: string | null
          session_id: string
          shipping: number
          shipping_address: Json | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
          zone_id: string | null
        }
        Insert: {
          cart?: Json
          converted_to_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_field?: string | null
          session_id: string
          shipping?: number
          shipping_address?: Json | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          zone_id?: string | null
        }
        Update: {
          cart?: Json
          converted_to_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_field?: string | null
          session_id?: string
          shipping?: number
          shipping_address?: Json | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incomplete_orders_converted_to_order_id_fkey"
            columns: ["converted_to_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomplete_orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          order_id: string
          price: number
          product_id: string | null
          qty: number
          title: string
        }
        Insert: {
          id?: string
          image_url?: string | null
          order_id: string
          price: number
          product_id?: string | null
          qty?: number
          title: string
        }
        Update: {
          id?: string
          image_url?: string | null
          order_id?: string
          price?: number
          product_id?: string | null
          qty?: number
          title?: string
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
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          due_amount: number
          id: string
          invoice_id: string | null
          notes: string | null
          order_number: string
          paid_amount: number
          payment_meta: Json | null
          payment_method: string
          payment_provider: string | null
          payment_status: string
          recovered_from_incomplete: boolean
          sender_number: string | null
          shipping: number
          shipping_address: Json
          source_incomplete_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          steadfast_consignment_id: string | null
          steadfast_shipped_at: string | null
          steadfast_status: string | null
          steadfast_synced_at: string | null
          steadfast_tracking_code: string | null
          subtotal: number
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          due_amount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_number?: string
          paid_amount?: number
          payment_meta?: Json | null
          payment_method?: string
          payment_provider?: string | null
          payment_status?: string
          recovered_from_incomplete?: boolean
          sender_number?: string | null
          shipping?: number
          shipping_address: Json
          source_incomplete_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          steadfast_consignment_id?: string | null
          steadfast_shipped_at?: string | null
          steadfast_status?: string | null
          steadfast_synced_at?: string | null
          steadfast_tracking_code?: string | null
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          due_amount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_number?: string
          paid_amount?: number
          payment_meta?: Json | null
          payment_method?: string
          payment_provider?: string | null
          payment_status?: string
          recovered_from_incomplete?: boolean
          sender_number?: string | null
          shipping?: number
          shipping_address?: Json
          source_incomplete_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          steadfast_consignment_id?: string | null
          steadfast_shipped_at?: string | null
          steadfast_status?: string | null
          steadfast_synced_at?: string | null
          steadfast_tracking_code?: string | null
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
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
      product_tags: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          active: boolean
          attributes: Json
          compare_price: number | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          attributes?: Json
          compare_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          attributes?: Json
          compare_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand_id: string | null
          category_id: string | null
          compare_price: number | null
          cover_image: string | null
          created_at: string
          description: string | null
          duration: string | null
          featured: boolean
          id: string
          kind: Database["public"]["Enums"]["product_kind"]
          level: string | null
          price: number
          rating: number
          rating_count: number
          shipping_cost: number | null
          short_description: string | null
          slug: string
          specs: Json | null
          stock: number
          title: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          compare_price?: number | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          featured?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["product_kind"]
          level?: string | null
          price: number
          rating?: number
          rating_count?: number
          shipping_cost?: number | null
          short_description?: string | null
          slug: string
          specs?: Json | null
          stock?: number
          title: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          compare_price?: number | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          featured?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["product_kind"]
          level?: string | null
          price?: number
          rating?: number
          rating_count?: number
          shipping_cost?: number | null
          short_description?: string | null
          slug?: string
          specs?: Json | null
          stock?: number
          title?: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      related_products: {
        Row: {
          product_id: string
          related_id: string
          sort_order: number
        }
        Insert: {
          product_id: string
          related_id: string
          sort_order?: number
        }
        Update: {
          product_id?: string
          related_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "related_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_products_related_id_fkey"
            columns: ["related_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          approved: boolean
          body: string
          created_at: string
          featured: boolean
          id: string
          product_id: string | null
          rating: number
          reviewer_avatar: string | null
          reviewer_name: string
          reviewer_role: string | null
        }
        Insert: {
          approved?: boolean
          body: string
          created_at?: string
          featured?: boolean
          id?: string
          product_id?: string | null
          rating: number
          reviewer_avatar?: string | null
          reviewer_name: string
          reviewer_role?: string | null
        }
        Update: {
          approved?: boolean
          body?: string
          created_at?: string
          featured?: boolean
          id?: string
          product_id?: string | null
          rating?: number
          reviewer_avatar?: string | null
          reviewer_name?: string
          reviewer_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "customer"
      chat_sender: "user" | "admin" | "system"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_kind: "simple" | "variable"
      product_type: "course" | "lab"
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
      app_role: ["admin", "customer"],
      chat_sender: ["user", "admin", "system"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_kind: ["simple", "variable"],
      product_type: ["course", "lab"],
    },
  },
} as const
