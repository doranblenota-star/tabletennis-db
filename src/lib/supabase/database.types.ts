export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          name_ja: string
          name_en: string | null
          gender: 'male' | 'female'
          nationality: string | null
          world_ranking: number | null
          category: 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
          play_style: 'shakehands_both' | 'shakehands_surface_pips' | 'penhold_pips' | 'penhold_surface' | 'defender' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_ja: string
          name_en?: string | null
          gender: 'male' | 'female'
          nationality?: string | null
          world_ranking?: number | null
          category: 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
          play_style?: 'shakehands_both' | 'shakehands_surface_pips' | 'penhold_pips' | 'penhold_surface' | 'defender' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_ja?: string
          name_en?: string | null
          gender?: 'male' | 'female'
          nationality?: string | null
          world_ranking?: number | null
          category?: 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
          play_style?: 'shakehands_both' | 'shakehands_surface_pips' | 'penhold_pips' | 'penhold_surface' | 'defender' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      rackets: {
        Row: {
          id: string
          name: string
          name_aliases: string[] | null
          manufacturer: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_aliases?: string[] | null
          manufacturer?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_aliases?: string[] | null
          manufacturer?: string | null
          created_at?: string
        }
        Relationships: []
      }
      rubbers: {
        Row: {
          id: string
          name: string
          name_aliases: string[] | null
          manufacturer: string | null
          rubber_type: 'inverted' | 'short_pips' | 'long_pips' | 'anti' | 'medium_pips' | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_aliases?: string[] | null
          manufacturer?: string | null
          rubber_type?: 'inverted' | 'short_pips' | 'long_pips' | 'anti' | 'medium_pips' | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_aliases?: string[] | null
          manufacturer?: string | null
          rubber_type?: 'inverted' | 'short_pips' | 'long_pips' | 'anti' | 'medium_pips' | null
          created_at?: string
        }
        Relationships: []
      }
      equipment_records: {
        Row: {
          id: string
          player_id: string
          racket_id: string | null
          rubber_fore_id: string | null
          rubber_back_id: string | null
          racket_raw: string | null
          rubber_fore_raw: string | null
          rubber_back_raw: string | null
          rubber_fore_thickness: string | null
          rubber_back_thickness: string | null
          grip_type: 'FL' | 'ST' | 'AN' | 'CN' | null
          is_current: boolean
          valid_from: string | null
          valid_to: string | null
          source_category: 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          racket_id?: string | null
          rubber_fore_id?: string | null
          rubber_back_id?: string | null
          racket_raw?: string | null
          rubber_fore_raw?: string | null
          rubber_back_raw?: string | null
          rubber_fore_thickness?: string | null
          rubber_back_thickness?: string | null
          grip_type?: 'FL' | 'ST' | 'AN' | 'CN' | null
          is_current?: boolean
          valid_from?: string | null
          valid_to?: string | null
          source_category: 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          racket_id?: string | null
          rubber_fore_id?: string | null
          rubber_back_id?: string | null
          racket_raw?: string | null
          rubber_fore_raw?: string | null
          rubber_back_raw?: string | null
          rubber_fore_thickness?: string | null
          rubber_back_thickness?: string | null
          grip_type?: 'FL' | 'ST' | 'AN' | 'CN' | null
          is_current?: boolean
          valid_from?: string | null
          valid_to?: string | null
          source_category?: 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_records_racket_id_fkey"
            columns: ["racket_id"]
            isOneToOne: false
            referencedRelation: "rackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_records_rubber_fore_id_fkey"
            columns: ["rubber_fore_id"]
            isOneToOne: false
            referencedRelation: "rubbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_records_rubber_back_id_fkey"
            columns: ["rubber_back_id"]
            isOneToOne: false
            referencedRelation: "rubbers"
            referencedColumns: ["id"]
          }
        ]
      }
      data_sources: {
        Row: {
          id: string
          url: string
          category: string
          scraped_at: string
          status: 'success' | 'failed' | 'partial'
          player_count: number | null
          error_log: string | null
        }
        Insert: {
          id?: string
          url: string
          category: string
          scraped_at?: string
          status: 'success' | 'failed' | 'partial'
          player_count?: number | null
          error_log?: string | null
        }
        Update: {
          id?: string
          url?: string
          category?: string
          scraped_at?: string
          status?: 'success' | 'failed' | 'partial'
          player_count?: number | null
          error_log?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
