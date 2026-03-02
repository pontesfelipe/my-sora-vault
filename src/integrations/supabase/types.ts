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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          page: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          page?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          page?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_feature_usage: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      allowed_users: {
        Row: {
          added_at: string | null
          added_by: string | null
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          email?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      collection_feature_toggles: {
        Row: {
          collection_type: string
          created_at: string
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          collection_type: string
          created_at?: string
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          collection_type?: string
          created_at?: string
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      collection_gap_suggestions: {
        Row: {
          brand: string
          created_at: string
          dial_colors: string
          id: string
          model: string
          notes: string | null
          rank: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          dial_colors?: string
          id?: string
          model: string
          notes?: string | null
          rank?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          dial_colors?: string
          id?: string
          model?: string
          notes?: string | null
          rank?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_insights: {
        Row: {
          created_at: string
          id: string
          insights: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insights: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insights?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          collection_type: Database["public"]["Enums"]["collection_type"]
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          collection_type?: Database["public"]["Enums"]["collection_type"]
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          collection_type?: Database["public"]["Enums"]["collection_type"]
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
          vote_type: number
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
          vote_type: number
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          days: number
          id: string
          location: string
          purpose: string
          start_date: string
          updated_at: string
          user_id: string | null
          watch_model: Json | null
        }
        Insert: {
          created_at?: string
          days?: number
          id?: string
          location: string
          purpose: string
          start_date: string
          updated_at?: string
          user_id?: string | null
          watch_model?: Json | null
        }
        Update: {
          created_at?: string
          days?: number
          id?: string
          location?: string
          purpose?: string
          start_date?: string
          updated_at?: string
          user_id?: string | null
          watch_model?: Json | null
        }
        Relationships: []
      }
      feature_usage_events: {
        Row: {
          collection_type: string
          created_at: string
          feature_key: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          collection_type: string
          created_at?: string
          feature_key: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          collection_type?: string
          created_at?: string
          feature_key?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["friend_request_status"]
          to_user_id: string
          trade_match_watch_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["friend_request_status"]
          to_user_id: string
          trade_match_watch_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["friend_request_status"]
          to_user_id?: string
          trade_match_watch_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          added_at: string
          id: string
          list_id: string
          watch_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          watch_id: string
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device_type: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          login_at: string
          os: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          os?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          os?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mention_notifications: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          is_read: boolean
          mentioned_by_user_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by_user_id: string
          post_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by_user_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mention_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote_type: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote_type: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          state: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          state?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          state?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      purse_specs: {
        Row: {
          authenticity_card_included: boolean | null
          authenticity_verified: boolean | null
          box_included: boolean | null
          closure_type: string | null
          color: string | null
          created_at: string
          dust_bag_included: boolean | null
          hardware_color: string | null
          id: string
          item_id: string
          material: string | null
          pattern: string | null
          serial_number: string | null
          size_category: string | null
          strap_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          authenticity_card_included?: boolean | null
          authenticity_verified?: boolean | null
          box_included?: boolean | null
          closure_type?: string | null
          color?: string | null
          created_at?: string
          dust_bag_included?: boolean | null
          hardware_color?: string | null
          id?: string
          item_id: string
          material?: string | null
          pattern?: string | null
          serial_number?: string | null
          size_category?: string | null
          strap_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          authenticity_card_included?: boolean | null
          authenticity_verified?: boolean | null
          box_included?: boolean | null
          closure_type?: string | null
          color?: string | null
          created_at?: string
          dust_bag_included?: boolean | null
          hardware_color?: string | null
          id?: string
          item_id?: string
          material?: string | null
          pattern?: string | null
          serial_number?: string | null
          size_category?: string | null
          strap_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purse_specs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          accepted_privacy: boolean
          accepted_terms: boolean
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          privacy_version: string | null
          status: string
          terms_version: string | null
        }
        Insert: {
          accepted_privacy?: boolean
          accepted_terms?: boolean
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          privacy_version?: string | null
          status?: string
          terms_version?: string | null
        }
        Update: {
          accepted_privacy?: boolean
          accepted_terms?: boolean
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          privacy_version?: string | null
          status?: string
          terms_version?: string | null
        }
        Relationships: []
      }
      sneaker_specs: {
        Row: {
          box_included: boolean | null
          collaboration: string | null
          colorway: string | null
          condition: string | null
          created_at: string
          id: string
          item_id: string
          limited_edition: boolean | null
          og_all: boolean | null
          release_date: string | null
          shoe_size: string | null
          silhouette: string | null
          size_type: string | null
          sku: string | null
          style_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          box_included?: boolean | null
          collaboration?: string | null
          colorway?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          item_id: string
          limited_edition?: boolean | null
          og_all?: boolean | null
          release_date?: string | null
          shoe_size?: string | null
          silhouette?: string | null
          size_type?: string | null
          sku?: string | null
          style_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          box_included?: boolean | null
          collaboration?: string | null
          colorway?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          item_id?: string
          limited_edition?: boolean | null
          og_all?: boolean | null
          release_date?: string | null
          shoe_size?: string | null
          silhouette?: string | null
          size_type?: string | null
          sku?: string | null
          style_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sneaker_specs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          activity_date: string
          created_at: string
          duration_minutes: number | null
          id: string
          location: string | null
          notes: string | null
          sport_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activity_date: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          sport_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activity_date?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          sport_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          accepted_privacy: boolean
          accepted_terms: boolean
          created_at: string
          email: string
          id: string
          ip_address: string | null
          privacy_version: string
          registration_request_id: string | null
          terms_version: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_privacy?: boolean
          accepted_terms?: boolean
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          registration_request_id?: string | null
          terms_version?: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_privacy?: boolean
          accepted_terms?: boolean
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          registration_request_id?: string | null
          terms_version?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_registration_request_id_fkey"
            columns: ["registration_request_id"]
            isOneToOne: false
            referencedRelation: "registration_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_guidelines_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          user_id: string
          version: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          user_id: string
          version?: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      trade_match_notifications: {
        Row: {
          created_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          trade_owner_id: string
          trade_watch_id: string
          user_id: string
          wishlist_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          trade_owner_id: string
          trade_watch_id: string
          user_id: string
          wishlist_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          trade_owner_id?: string
          trade_watch_id?: string
          user_id?: string
          wishlist_item_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          created_at: string
          days: number
          id: string
          location: string
          notes: string | null
          purpose: string
          start_date: string
          updated_at: string
          user_id: string | null
          watch_model: Json | null
        }
        Insert: {
          created_at?: string
          days?: number
          id?: string
          location: string
          notes?: string | null
          purpose: string
          start_date: string
          updated_at?: string
          user_id?: string | null
          watch_model?: Json | null
        }
        Update: {
          created_at?: string
          days?: number
          id?: string
          location?: string
          notes?: string | null
          purpose?: string
          start_date?: string
          updated_at?: string
          user_id?: string | null
          watch_model?: Json | null
        }
        Relationships: []
      }
      user_collections: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["collection_role"]
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["collection_role"]
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["collection_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lists: {
        Row: {
          created_at: string
          id: string
          is_system: boolean | null
          list_type: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean | null
          list_type?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean | null
          list_type?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          post_type: string
          updated_at: string
          user_id: string
          watch_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          post_type?: string
          updated_at?: string
          user_id: string
          watch_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          post_type?: string
          updated_at?: string
          user_id?: string
          watch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_posts_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          default_collection_id: string | null
          id: string
          last_selected_collection_id: string | null
          taste_description: string | null
          trade_match_scope: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          default_collection_id?: string | null
          id?: string
          last_selected_collection_id?: string | null
          taste_description?: string | null
          trade_match_scope?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          default_collection_id?: string | null
          id?: string
          last_selected_collection_id?: string | null
          taste_description?: string | null
          trade_match_scope?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_default_collection_id_fkey"
            columns: ["default_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_last_selected_collection_id_fkey"
            columns: ["last_selected_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_trust_levels: {
        Row: {
          assigned_by: string | null
          completed_trades: number
          created_at: string
          id: string
          reason: string | null
          trust_level: Database["public"]["Enums"]["trust_level"]
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          completed_trades?: number
          created_at?: string
          id?: string
          reason?: string | null
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          completed_trades?: number
          created_at?: string
          id?: string
          reason?: string | null
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      vault_pal_conversations: {
        Row: {
          collection_type: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_pal_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_pal_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "vault_pal_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_specs: {
        Row: {
          band: string | null
          case_material: string | null
          case_size: string | null
          caseback: string | null
          created_at: string
          crystal: string | null
          id: string
          lug_to_lug: string | null
          movement: string | null
          power_reserve: string | null
          price: number
          updated_at: string
          user_id: string | null
          watch_id: string
          water_resistance: string | null
        }
        Insert: {
          band?: string | null
          case_material?: string | null
          case_size?: string | null
          caseback?: string | null
          created_at?: string
          crystal?: string | null
          id?: string
          lug_to_lug?: string | null
          movement?: string | null
          power_reserve?: string | null
          price?: number
          updated_at?: string
          user_id?: string | null
          watch_id: string
          water_resistance?: string | null
        }
        Update: {
          band?: string | null
          case_material?: string | null
          case_size?: string | null
          caseback?: string | null
          created_at?: string
          crystal?: string | null
          id?: string
          lug_to_lug?: string | null
          movement?: string | null
          power_reserve?: string | null
          price?: number
          updated_at?: string
          user_id?: string | null
          watch_id?: string
          water_resistance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_specs_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      watches: {
        Row: {
          ai_image_url: string | null
          available_for_trade: boolean
          average_resale_price: number | null
          brand: string
          case_size: string | null
          caseback_material: string | null
          collection_id: string | null
          cost: number
          created_at: string
          dial_color: string
          has_sapphire: boolean | null
          historical_significance:
            | Database["public"]["Enums"]["watch_historical_significance"]
            | null
          id: string
          is_shared: boolean | null
          lug_to_lug_size: string | null
          metadata_analysis_reasoning: string | null
          metadata_analyzed_at: string | null
          model: string
          movement: string | null
          msrp: number | null
          rarity: Database["public"]["Enums"]["watch_rarity"] | null
          sentiment: string | null
          sentiment_analyzed_at: string | null
          sort_order: number
          status: string
          type: string
          updated_at: string
          user_id: string | null
          warranty_card_url: string | null
          warranty_date: string | null
          what_i_dont_like: string | null
          what_i_like: string | null
          when_bought: string | null
          why_bought: string | null
        }
        Insert: {
          ai_image_url?: string | null
          available_for_trade?: boolean
          average_resale_price?: number | null
          brand: string
          case_size?: string | null
          caseback_material?: string | null
          collection_id?: string | null
          cost?: number
          created_at?: string
          dial_color: string
          has_sapphire?: boolean | null
          historical_significance?:
            | Database["public"]["Enums"]["watch_historical_significance"]
            | null
          id?: string
          is_shared?: boolean | null
          lug_to_lug_size?: string | null
          metadata_analysis_reasoning?: string | null
          metadata_analyzed_at?: string | null
          model: string
          movement?: string | null
          msrp?: number | null
          rarity?: Database["public"]["Enums"]["watch_rarity"] | null
          sentiment?: string | null
          sentiment_analyzed_at?: string | null
          sort_order?: number
          status?: string
          type: string
          updated_at?: string
          user_id?: string | null
          warranty_card_url?: string | null
          warranty_date?: string | null
          what_i_dont_like?: string | null
          what_i_like?: string | null
          when_bought?: string | null
          why_bought?: string | null
        }
        Update: {
          ai_image_url?: string | null
          available_for_trade?: boolean
          average_resale_price?: number | null
          brand?: string
          case_size?: string | null
          caseback_material?: string | null
          collection_id?: string | null
          cost?: number
          created_at?: string
          dial_color?: string
          has_sapphire?: boolean | null
          historical_significance?:
            | Database["public"]["Enums"]["watch_historical_significance"]
            | null
          id?: string
          is_shared?: boolean | null
          lug_to_lug_size?: string | null
          metadata_analysis_reasoning?: string | null
          metadata_analyzed_at?: string | null
          model?: string
          movement?: string | null
          msrp?: number | null
          rarity?: Database["public"]["Enums"]["watch_rarity"] | null
          sentiment?: string | null
          sentiment_analyzed_at?: string | null
          sort_order?: number
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          warranty_card_url?: string | null
          warranty_date?: string | null
          what_i_dont_like?: string | null
          what_i_like?: string | null
          when_bought?: string | null
          why_bought?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watches_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      water_usage: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          depth_meters: number | null
          duration_minutes: number | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string | null
          watch_id: string
        }
        Insert: {
          activity_date: string
          activity_type: string
          created_at?: string
          depth_meters?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
          watch_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          depth_meters?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_usage_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      wear_entries: {
        Row: {
          created_at: string
          days: number
          event_id: string | null
          id: string
          notes: string | null
          photo_url: string | null
          sport_id: string | null
          trip_id: string | null
          updated_at: string
          user_id: string | null
          watch_id: string
          water_usage_id: string | null
          wear_date: string
        }
        Insert: {
          created_at?: string
          days?: number
          event_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          sport_id?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
          watch_id: string
          water_usage_id?: string | null
          wear_date: string
        }
        Update: {
          created_at?: string
          days?: number
          event_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          sport_id?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
          watch_id?: string
          water_usage_id?: string | null
          wear_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "wear_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wear_entries_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wear_entries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wear_entries_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wear_entries_water_usage_id_fkey"
            columns: ["water_usage_id"]
            isOneToOne: false
            referencedRelation: "water_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      wear_entry_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          wear_entry_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          wear_entry_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          wear_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wear_entry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wear_entry_tags_wear_entry_id_fkey"
            columns: ["wear_entry_id"]
            isOneToOne: false
            referencedRelation: "wear_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist: {
        Row: {
          brand: string
          created_at: string
          dial_colors: string
          id: string
          is_ai_suggested: boolean
          model: string
          notes: string | null
          rank: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brand: string
          created_at?: string
          dial_colors: string
          id?: string
          is_ai_suggested?: boolean
          model: string
          notes?: string | null
          rank?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brand?: string
          created_at?: string
          dial_colors?: string
          id?: string
          is_ai_suggested?: boolean
          model?: string
          notes?: string | null
          rank?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      feature_usage_stats: {
        Row: {
          collection_type: string | null
          feature_key: string | null
          last_used: string | null
          total_uses: number | null
          unique_users: number | null
          usage_date: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_color: string | null
          avatar_url: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_url?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_url?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          action: string | null
          count: number | null
          date: string | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_friend_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      anonymize_old_access_logs: { Args: never; Returns: undefined }
      can_use_ai_feature: {
        Args: { _feature_name: string; _user_id: string }
        Returns: boolean
      }
      create_collection: { Args: { _name: string }; Returns: string }
      get_ai_feature_usage: {
        Args: { _feature_name: string; _user_id: string }
        Returns: {
          remaining_count: number
          used_count: number
        }[]
      }
      get_feature_usage_summary: {
        Args: { _days_back?: number }
        Returns: {
          collection_type: string
          feature_key: string
          last_used: string
          total_uses: number
          unique_users: number
        }[]
      }
      get_profile_id_by_email: { Args: { _email: string }; Returns: string }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_color: string
          avatar_url: string
          id: string
          username: string
        }[]
      }
      get_public_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_color: string
          avatar_url: string
          id: string
          username: string
        }[]
      }
      get_usage_metrics: {
        Args: never
        Returns: {
          action: string
          count: number
          date: string
          unique_users: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_allowed_user: { Args: { _user_id: string }; Returns: boolean }
      is_collection_owner: {
        Args: { _collection_id: string; _user_id: string }
        Returns: boolean
      }
      mark_messages_as_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      purge_old_login_history: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      collection_role: "owner" | "editor" | "viewer"
      collection_type: "watches" | "sneakers" | "purses"
      friend_request_status: "pending" | "accepted" | "declined"
      trust_level:
        | "observer"
        | "collector"
        | "verified_collector"
        | "trusted_trader"
      watch_historical_significance:
        | "regular"
        | "notable"
        | "historically_significant"
      watch_rarity: "common" | "uncommon" | "rare" | "very_rare" | "grail"
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
      app_role: ["admin", "user"],
      collection_role: ["owner", "editor", "viewer"],
      collection_type: ["watches", "sneakers", "purses"],
      friend_request_status: ["pending", "accepted", "declined"],
      trust_level: [
        "observer",
        "collector",
        "verified_collector",
        "trusted_trader",
      ],
      watch_historical_significance: [
        "regular",
        "notable",
        "historically_significant",
      ],
      watch_rarity: ["common", "uncommon", "rare", "very_rare", "grail"],
    },
  },
} as const
