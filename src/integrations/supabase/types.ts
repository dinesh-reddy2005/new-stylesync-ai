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
      fashion_knowledge_base: {
        Row: {
          category: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          embedding_status: string
          id: string
          keywords: string | null
          metadata: Json
          parent_id: string | null
          source: string | null
          title: string
          token_count: number | null
          updated_at: string
        }
        Insert: {
          category: string
          chunk_index?: number
          content: string
          created_at?: string
          embedding?: string | null
          embedding_status?: string
          id?: string
          keywords?: string | null
          metadata?: Json
          parent_id?: string | null
          source?: string | null
          title: string
          token_count?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          embedding_status?: string
          id?: string
          keywords?: string | null
          metadata?: Json
          parent_id?: string | null
          source?: string | null
          title?: string
          token_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fashion_knowledge_base_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fashion_knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_outfits: {
        Row: {
          created_at: string
          generation_id: string | null
          id: string
          saved_outfit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_id?: string | null
          id?: string
          saved_outfit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generation_id?: string | null
          id?: string
          saved_outfit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_outfits_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "user_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_outfits_saved_outfit_id_fkey"
            columns: ["saved_outfit_id"]
            isOneToOne: false
            referencedRelation: "saved_outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_images: {
        Row: {
          created_at: string
          error_message: string | null
          generation_id: string
          id: string
          image_url: string | null
          kind: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generation_id: string
          id?: string
          image_url?: string | null
          kind?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generation_id?: string
          id?: string
          image_url?: string | null
          kind?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_images_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "user_generations"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_outfits: {
        Row: {
          confidence_score: number | null
          created_at: string
          generation_id: string | null
          generation_type: string
          id: string
          image_status: string
          image_url: string | null
          is_favorite: boolean
          outfit_name: string
          product_list: Json
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          generation_id?: string | null
          generation_type: string
          id?: string
          image_status?: string
          image_url?: string | null
          is_favorite?: boolean
          outfit_name: string
          product_list?: Json
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          generation_id?: string | null
          generation_type?: string
          id?: string
          image_status?: string
          image_url?: string | null
          is_favorite?: boolean
          outfit_name?: string
          product_list?: Json
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_outfits_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "user_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_generations: {
        Row: {
          body_type: string | null
          color_palette: Json
          confidence_score: number | null
          created_at: string
          download_count: number
          generation_type: string
          id: string
          image_status: string
          image_url: string | null
          is_favorite: boolean
          is_saved: boolean
          metadata: Json
          occasion: string | null
          outfit_name: string | null
          product_list: Json
          prompt: string | null
          recommended_size: string | null
          result_text: string | null
          share_count: number
          style: string | null
          tags: string[]
          updated_at: string
          user_id: string
          weather: string | null
        }
        Insert: {
          body_type?: string | null
          color_palette?: Json
          confidence_score?: number | null
          created_at?: string
          download_count?: number
          generation_type: string
          id?: string
          image_status?: string
          image_url?: string | null
          is_favorite?: boolean
          is_saved?: boolean
          metadata?: Json
          occasion?: string | null
          outfit_name?: string | null
          product_list?: Json
          prompt?: string | null
          recommended_size?: string | null
          result_text?: string | null
          share_count?: number
          style?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
          weather?: string | null
        }
        Update: {
          body_type?: string | null
          color_palette?: Json
          confidence_score?: number | null
          created_at?: string
          download_count?: number
          generation_type?: string
          id?: string
          image_status?: string
          image_url?: string | null
          is_favorite?: boolean
          is_saved?: boolean
          metadata?: Json
          occasion?: string | null
          outfit_name?: string | null
          product_list?: Json
          prompt?: string | null
          recommended_size?: string | null
          result_text?: string | null
          share_count?: number
          style?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
          weather?: string | null
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
      user_statistics: {
        Row: {
          average_confidence: number
          created_at: string
          download_count: number
          favorite_count: number
          saved_looks: number
          share_count: number
          total_generations: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_confidence?: number
          created_at?: string
          download_count?: number
          favorite_count?: number
          saved_looks?: number
          share_count?: number
          total_generations?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_confidence?: number
          created_at?: string
          download_count?: number
          favorite_count?: number
          saved_looks?: number
          share_count?: number
          total_generations?: number
          updated_at?: string
          user_id?: string
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
      match_fashion_knowledge: {
        Args: {
          filter_category?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          keywords: string
          similarity: number
          source: string
          title: string
        }[]
      }
      recompute_user_statistics: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
