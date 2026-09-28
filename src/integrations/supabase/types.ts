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
      products: {
        Row: {
          active: boolean
          back_url: string | null
          category: string
          created_at: string
          description: string
          front_url: string
          id: string
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          back_url?: string | null
          category?: string
          created_at?: string
          description?: string
          front_url: string
          id?: string
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          back_url?: string | null
          category?: string
          created_at?: string
          description?: string
          front_url?: string
          id?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          about_text: string
          accent_color: string
          announcement: string
          brand_name: string
          coupon_code: string
          coupon_discount: number
          grid_columns: number
          hero_image_url: string
          hero_layout: string
          hero_subtitle: string
          hero_title: string
          id: number
          instagram_url: string
          logo_url: string
          promo_price: number
          show_about: boolean
          show_offer: boolean
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          about_text?: string
          accent_color?: string
          announcement?: string
          brand_name?: string
          coupon_code?: string
          coupon_discount?: number
          grid_columns?: number
          hero_image_url: string
          hero_layout?: string
          hero_subtitle?: string
          hero_title?: string
          id?: number
          instagram_url?: string
          logo_url: string
          promo_price?: number
          show_about?: boolean
          show_offer?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          about_text?: string
          accent_color?: string
          announcement?: string
          brand_name?: string
          coupon_code?: string
          coupon_discount?: number
          grid_columns?: number
          hero_image_url?: string
          hero_layout?: string
          hero_subtitle?: string
          hero_title?: string
          id?: number
          instagram_url?: string
          logo_url?: string
          promo_price?: number
          show_about?: boolean
          show_offer?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      // As 4 tabelas abaixo (product_colors .. product_customization_sizes) foram
      // escritas a mao a partir de
      // supabase/migrations/20260926200000_shirt_customizer_schema.sql -- ainda nao
      // existem no banco vivo. Substituir por regeneracao (Supabase CLI/dashboard)
      // assim que a migration for aplicada, para conferir contra o schema real.
      product_colors: {
        Row: {
          id: string
          product_id: string
          name: string
          hex: string
          sort_order: number
          active: boolean
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          hex: string
          sort_order?: number
          active?: boolean
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          hex?: string
          sort_order?: number
          active?: boolean
        }
        Relationships: []
      }
      product_customizer_configs: {
        Row: {
          product_id: string
          enabled: boolean
          garment_width_cm: number
          garment_height_cm: number
          front_print_area: Json
          back_print_area: Json
          pricing: Json
        }
        Insert: {
          product_id: string
          enabled?: boolean
          garment_width_cm?: number
          garment_height_cm?: number
          front_print_area?: Json
          back_print_area?: Json
          pricing?: Json
        }
        Update: {
          product_id?: string
          enabled?: boolean
          garment_width_cm?: number
          garment_height_cm?: number
          front_print_area?: Json
          back_print_area?: Json
          pricing?: Json
        }
        Relationships: []
      }
      product_customizations: {
        Row: {
          id: string
          user_id: string
          product_id: string
          color_id: string
          configuration: Json
          front_width_cm: number
          front_height_cm: number
          back_width_cm: number
          back_height_cm: number
          front_area_cm2: number
          back_area_cm2: number
          calculated_price: number
          front_artwork_url: string | null
          back_artwork_url: string | null
          front_preview_url: string | null
          back_preview_url: string | null
          status: string
          whatsapp_attachment_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          color_id: string
          configuration: Json
          front_width_cm?: number
          front_height_cm?: number
          back_width_cm?: number
          back_height_cm?: number
          front_area_cm2?: number
          back_area_cm2?: number
          calculated_price?: number
          front_artwork_url?: string | null
          back_artwork_url?: string | null
          front_preview_url?: string | null
          back_preview_url?: string | null
          status?: string
          whatsapp_attachment_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          color_id?: string
          configuration?: Json
          front_width_cm?: number
          front_height_cm?: number
          back_width_cm?: number
          back_height_cm?: number
          front_area_cm2?: number
          back_area_cm2?: number
          calculated_price?: number
          front_artwork_url?: string | null
          back_artwork_url?: string | null
          front_preview_url?: string | null
          back_preview_url?: string | null
          status?: string
          whatsapp_attachment_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_customization_sizes: {
        Row: {
          id: string
          customization_id: string
          size_id: string
          label: string
          quantity: number
        }
        Insert: {
          id?: string
          customization_id: string
          size_id: string
          label: string
          quantity: number
        }
        Update: {
          id?: string
          customization_id?: string
          size_id?: string
          label?: string
          quantity?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_store_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
