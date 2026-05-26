export type Gender = 'male' | 'female'
export type Category = 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
export type PlayStyle =
  | 'shakehands_both'
  | 'shakehands_surface_pips'
  | 'penhold_pips'
  | 'penhold_surface'
  | 'defender'
export type RubberType = 'inverted' | 'short_pips' | 'long_pips' | 'anti' | 'medium_pips'
export type GripType = 'FL' | 'ST' | 'AN' | 'CN'
export type ScrapeStatus = 'success' | 'failed' | 'partial'

export interface Player {
  id: string
  name_ja: string
  name_en: string | null
  gender: Gender
  nationality: string | null
  world_ranking: number | null
  category: Category
  play_style: PlayStyle | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Racket {
  id: string
  name: string
  name_aliases: string[] | null
  manufacturer: string | null
  created_at: string
}

export interface Rubber {
  id: string
  name: string
  name_aliases: string[] | null
  manufacturer: string | null
  rubber_type: RubberType | null
  created_at: string
}

export interface EquipmentRecord {
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
  grip_type: GripType | null
  is_current: boolean
  valid_from: string | null
  valid_to: string | null
  source_category: Category
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DataSource {
  id: string
  url: string
  category: Category
  scraped_at: string
  status: ScrapeStatus
  player_count: number | null
  error_log: string | null
}

// Joined types for UI
export interface PlayerWithCurrentEquipment extends Player {
  current_equipment: EquipmentRecordWithDetails | null
}

export interface EquipmentRecordWithDetails extends EquipmentRecord {
  player?: Player
  racket?: Racket | null
  rubber_fore?: Rubber | null
  rubber_back?: Rubber | null
}

export interface RubberWithUsers extends Rubber {
  current_users: EquipmentUserEntry[]
  past_users: EquipmentUserEntry[]
}

export interface RacketWithUsers extends Racket {
  current_users: EquipmentUserEntry[]
  past_users: EquipmentUserEntry[]
}

export interface EquipmentUserEntry {
  player_id: string
  name_ja: string
  name_en: string | null
  world_ranking: number | null
  gender: Gender
  side?: 'fore' | 'back' | 'both'
  thickness?: string | null
  valid_from: string | null
  valid_to: string | null
}

export interface SearchResult {
  players: PlayerWithCurrentEquipment[]
  rackets: RacketWithUsers[]
  rubbers: RubberWithUsers[]
}

// Scraper raw data
export interface ScrapedPlayer {
  name_ja: string
  name_en: string | null
  world_ranking: number | null
  category: Category
  current: ScrapedEquipment
  history: ScrapedEquipmentEntry[]
}

export interface ScrapedEquipment {
  racket_raw: string | null
  rubber_fore_raw: string | null
  rubber_back_raw: string | null
  grip_type: GripType | null
  notes: string | null
  valid_from: string | null
}

export interface ScrapedEquipmentEntry extends ScrapedEquipment {
  valid_to: string | null
}
