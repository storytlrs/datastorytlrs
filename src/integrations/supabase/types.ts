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
      audit_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          aqs: number | null
          brand_minutes: number | null
          branded_views: number | null
          comments: number | null
          content_type: Database["public"]["Enums"]["content_type"]
          cost: number | null
          cpe: number | null
          cpm: number | null
          cpv: number | null
          created_at: string
          creator_id: string
          engagement_rate: number | null
          id: string
          impressions: number | null
          is_branded: boolean | null
          likes: number | null
          link_clicks: number | null
          main_usp: string | null
          notes: string | null
          organic_views: number | null
          paid_views: number | null
          platform: Database["public"]["Enums"]["platform_type"]
          published_date: string | null
          reach: number | null
          report_id: string
          saves: number | null
          sentiment: Database["public"]["Enums"]["sentiment_type"] | null
          sentiment_summary: string | null
          shares: number | null
          sticker_clicks: number | null
          thumbnail_url: string | null
          updated_at: string
          url: string | null
          views: number | null
          watch_time: number | null
        }
        Insert: {
          aqs?: number | null
          brand_minutes?: number | null
          branded_views?: number | null
          comments?: number | null
          content_type: Database["public"]["Enums"]["content_type"]
          cost?: number | null
          cpe?: number | null
          cpm?: number | null
          cpv?: number | null
          created_at?: string
          creator_id: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          is_branded?: boolean | null
          likes?: number | null
          link_clicks?: number | null
          main_usp?: string | null
          notes?: string | null
          organic_views?: number | null
          paid_views?: number | null
          platform: Database["public"]["Enums"]["platform_type"]
          published_date?: string | null
          reach?: number | null
          report_id: string
          saves?: number | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          sentiment_summary?: string | null
          shares?: number | null
          sticker_clicks?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          views?: number | null
          watch_time?: number | null
        }
        Update: {
          aqs?: number | null
          brand_minutes?: number | null
          branded_views?: number | null
          comments?: number | null
          content_type?: Database["public"]["Enums"]["content_type"]
          cost?: number | null
          cpe?: number | null
          cpm?: number | null
          cpv?: number | null
          created_at?: string
          creator_id?: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          is_branded?: boolean | null
          likes?: number | null
          link_clicks?: number | null
          main_usp?: string | null
          notes?: string | null
          organic_views?: number | null
          paid_views?: number | null
          platform?: Database["public"]["Enums"]["platform_type"]
          published_date?: string | null
          reach?: number | null
          report_id?: string
          saves?: number | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          sentiment_summary?: string | null
          shares?: number | null
          sticker_clicks?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          views?: number | null
          watch_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags: {
        Row: {
          content_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tags_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          audience_breakdown: Json | null
          avatar_url: string | null
          avg_engagement_rate: number | null
          avg_reach: number | null
          avg_views: number | null
          created_at: string
          currency: string | null
          followers: number | null
          handle: string
          id: string
          notes: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          posts_cost: number | null
          posts_count: number | null
          profile_url: string | null
          reels_cost: number | null
          reels_count: number | null
          report_id: string
          sentiment_summary: Json | null
          stories_cost: number | null
          stories_count: number | null
          updated_at: string
        }
        Insert: {
          audience_breakdown?: Json | null
          avatar_url?: string | null
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          avg_views?: number | null
          created_at?: string
          currency?: string | null
          followers?: number | null
          handle: string
          id?: string
          notes?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          posts_cost?: number | null
          posts_count?: number | null
          profile_url?: string | null
          reels_cost?: number | null
          reels_count?: number | null
          report_id: string
          sentiment_summary?: Json | null
          stories_cost?: number | null
          stories_count?: number | null
          updated_at?: string
        }
        Update: {
          audience_breakdown?: Json | null
          avatar_url?: string | null
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          avg_views?: number | null
          created_at?: string
          currency?: string | null
          followers?: number | null
          handle?: string
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          posts_cost?: number | null
          posts_count?: number | null
          profile_url?: string | null
          reels_cost?: number | null
          reels_count?: number | null
          report_id?: string
          sentiment_summary?: Json | null
          stories_cost?: number | null
          stories_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creators_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      data_imports: {
        Row: {
          created_at: string
          errors: Json | null
          file_name: string
          file_type: string
          id: string
          mapping_config: Json | null
          processed_at: string | null
          report_id: string
          rows_failed: number | null
          rows_imported: number | null
          rows_total: number | null
          source: Database["public"]["Enums"]["import_source"]
          status: Database["public"]["Enums"]["import_status"]
          uploaded_at: string
          uploaded_by: string
          warnings: Json | null
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          file_name: string
          file_type: string
          id?: string
          mapping_config?: Json | null
          processed_at?: string | null
          report_id: string
          rows_failed?: number | null
          rows_imported?: number | null
          rows_total?: number | null
          source: Database["public"]["Enums"]["import_source"]
          status?: Database["public"]["Enums"]["import_status"]
          uploaded_at?: string
          uploaded_by: string
          warnings?: Json | null
        }
        Update: {
          created_at?: string
          errors?: Json | null
          file_name?: string
          file_type?: string
          id?: string
          mapping_config?: Json | null
          processed_at?: string | null
          report_id?: string
          rows_failed?: number | null
          rows_imported?: number | null
          rows_total?: number | null
          source?: Database["public"]["Enums"]["import_source"]
          status?: Database["public"]["Enums"]["import_status"]
          uploaded_at?: string
          uploaded_by?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "data_imports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          actual_value: number | null
          created_at: string
          id: string
          kpi_name: string
          planned_value: number
          report_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          id?: string
          kpi_name: string
          planned_value: number
          report_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          id?: string
          kpi_name?: string
          planned_value?: number
          report_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          space_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          space_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          clicks: number | null
          code: string
          conversion_rate: number | null
          created_at: string
          creator_id: string | null
          id: string
          purchases: number | null
          report_id: string
          revenue: number | null
          updated_at: string
        }
        Insert: {
          clicks?: number | null
          code: string
          conversion_rate?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          purchases?: number | null
          report_id: string
          revenue?: number | null
          updated_at?: string
        }
        Update: {
          clicks?: number | null
          code?: string
          conversion_rate?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          purchases?: number | null
          report_id?: string
          revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          project_id: string | null
          space_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["report_status"]
          type: Database["public"]["Enums"]["report_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          project_id?: string | null
          space_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          type: Database["public"]["Enums"]["report_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string | null
          space_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          type?: Database["public"]["Enums"]["report_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_users: {
        Row: {
          created_at: string
          id: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_users_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          profile_image_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          profile_image_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          profile_image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "client"
      content_type: "story" | "reel" | "post" | "video" | "short"
      import_source: "birell" | "carl" | "hypeauditor" | "xlsx" | "csv"
      import_status: "pending" | "processing" | "completed" | "failed"
      platform_type: "instagram" | "tiktok" | "youtube" | "facebook" | "twitter"
      report_status: "draft" | "active" | "archived"
      report_type: "influencer" | "social" | "ads" | "always_on"
      sentiment_type: "positive" | "negative" | "neutral"
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
      app_role: ["admin", "analyst", "client"],
      content_type: ["story", "reel", "post", "video", "short"],
      import_source: ["birell", "carl", "hypeauditor", "xlsx", "csv"],
      import_status: ["pending", "processing", "completed", "failed"],
      platform_type: ["instagram", "tiktok", "youtube", "facebook", "twitter"],
      report_status: ["draft", "active", "archived"],
      report_type: ["influencer", "social", "ads", "always_on"],
      sentiment_type: ["positive", "negative", "neutral"],
    },
  },
} as const
