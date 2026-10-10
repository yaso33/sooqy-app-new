export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      order_items: {
        Row: {
          id: string;
          offer_id: string | null;
          options: Json;
          order_id: string;
          product_name: string;
          quantity: number;
          store_id: string;
          unit_price: number;
        };
        Insert: {
          id?: string;
          offer_id?: string | null;
          options?: Json;
          order_id: string;
          product_name: string;
          quantity: number;
          store_id: string;
          unit_price: number;
        };
        Update: {
          id?: string;
          offer_id?: string | null;
          options?: Json;
          order_id?: string;
          product_name?: string;
          quantity?: number;
          store_id?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "store_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address_line: string | null;
          commission_amount: number;
          commune: string;
          created_at: string;
          delivery_type: string;
          full_name: string;
          id: string;
          payment_method: string;
          phone: string;
          receipt_url: string | null;
          shipping_fee: number;
          status: string;
          subtotal: number;
          total: number;
          user_id: string;
          wilaya_id: number;
        };
        Insert: {
          address_line?: string | null;
          commission_amount?: number;
          commune: string;
          created_at?: string;
          delivery_type: string;
          full_name: string;
          id?: string;
          payment_method: string;
          phone: string;
          receipt_url?: string | null;
          shipping_fee: number;
          status?: string;
          subtotal: number;
          total: number;
          user_id: string;
          wilaya_id: number;
        };
        Update: {
          address_line?: string | null;
          commission_amount?: number;
          commune?: string;
          created_at?: string;
          delivery_type?: string;
          full_name?: string;
          id?: string;
          payment_method?: string;
          phone?: string;
          receipt_url?: string | null;
          shipping_fee?: number;
          status?: string;
          subtotal?: number;
          total?: number;
          user_id?: string;
          wilaya_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "orders_wilaya_id_fkey";
            columns: ["wilaya_id"];
            isOneToOne: false;
            referencedRelation: "wilayas";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          is_primary: boolean;
          offer_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          is_primary?: boolean;
          offer_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          is_primary?: boolean;
          offer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "store_offers";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand: string | null;
          category: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          brand?: string | null;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          brand?: string | null;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: Json;
          id: string;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          read?: boolean;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          commune: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          is_phone_verified: boolean;
          phone: string | null;
          updated_at: string;
          user_id: string;
          wilaya_id: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          commune?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_phone_verified?: boolean;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
          wilaya_id?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          commune?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_phone_verified?: boolean;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
          wilaya_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_wilaya_id_fkey";
            columns: ["wilaya_id"];
            isOneToOne: false;
            referencedRelation: "wilayas";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          offer_id: string;
          options: Json;
          quantity: number;
          status: string;
          store_id: string;
          user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          offer_id: string;
          options?: Json;
          quantity?: number;
          status?: string;
          store_id: string;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          offer_id?: string;
          options?: Json;
          quantity?: number;
          status?: string;
          store_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "store_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          status: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          status?: string;
          target_id: string;
          target_type: string;
          user_id?: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          status?: string;
          target_id?: string;
          target_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      store_offers: {
        Row: {
          created_at: string;
          id: string;
          is_available: boolean;
          last_confirmed_at: string;
          old_price: number | null;
          options: Json;
          price: number;
          product_id: string;
          stock_quantity: number;
          store_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_available?: boolean;
          last_confirmed_at?: string;
          old_price?: number | null;
          options?: Json;
          price: number;
          product_id: string;
          stock_quantity?: number;
          store_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_available?: boolean;
          last_confirmed_at?: string;
          old_price?: number | null;
          options?: Json;
          price?: number;
          product_id?: string;
          stock_quantity?: number;
          store_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_offers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_offers_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          address_line: string | null;
          commission_rate: number;
          commune: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          facebook_url: string | null;
          id: string;
          instagram_url: string | null;
          is_verified: boolean;
          latitude: number | null;
          logo_url: string | null;
          longitude: number | null;
          name: string;
          opening_hours: Json;
          owner_id: string | null;
          phone: string | null;
          rating: number;
          slug: string;
          whatsapp: string | null;
          wilaya_id: number;
        };
        Insert: {
          address_line?: string | null;
          commission_rate?: number;
          commune?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          facebook_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          is_verified?: boolean;
          latitude?: number | null;
          logo_url?: string | null;
          longitude?: number | null;
          name: string;
          opening_hours?: Json;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          slug: string;
          whatsapp?: string | null;
          wilaya_id: number;
        };
        Update: {
          address_line?: string | null;
          commission_rate?: number;
          commune?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          facebook_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          is_verified?: boolean;
          latitude?: number | null;
          logo_url?: string | null;
          longitude?: number | null;
          name?: string;
          opening_hours?: Json;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          slug?: string;
          whatsapp?: string | null;
          wilaya_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "stores_wilaya_id_fkey";
            columns: ["wilaya_id"];
            isOneToOne: false;
            referencedRelation: "wilayas";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wilayas: {
        Row: {
          desk_price: number;
          home_price: number;
          id: number;
          name_ar: string;
          name_fr: string;
        };
        Insert: {
          desk_price: number;
          home_price: number;
          id: number;
          name_ar: string;
          name_fr: string;
        };
        Update: {
          desk_price?: number;
          home_price?: number;
          id?: number;
          name_ar?: string;
          name_fr?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      become_merchant: { Args: never; Returns: undefined };
      cancel_reservation: {
        Args: { _reservation_id: string };
        Returns: undefined;
      };
      create_order: {
        Args: {
          _address_line: string;
          _commune: string;
          _delivery_type: string;
          _full_name: string;
          _items: Json;
          _payment_method: string;
          _phone: string;
          _receipt_url?: string;
          _wilaya_id: number;
        };
        Returns: string;
      };
      create_reservation: {
        Args: {
          _hours?: number;
          _offer_id: string;
          _options?: Json;
          _quantity?: number;
        };
        Returns: {
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          offer_id: string;
          options: Json;
          quantity: number;
          status: string;
          store_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "reservations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_offer_owner: { Args: { _offer_id: string }; Returns: boolean };
      is_order_merchant: { Args: { _order_id: string }; Returns: boolean };
      is_order_owner: { Args: { _order_id: string }; Returns: boolean };
      is_store_owner: { Args: { _store_id: string }; Returns: boolean };
      merchant_confirm_all_stock: {
        Args: { _store_id: string };
        Returns: number;
      };
      merchant_confirm_reservation: {
        Args: { _code: string };
        Returns: {
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          offer_id: string;
          options: Json;
          quantity: number;
          status: string;
          store_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "reservations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      app_role: "customer" | "merchant" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "merchant", "admin"],
    },
  },
} as const;
