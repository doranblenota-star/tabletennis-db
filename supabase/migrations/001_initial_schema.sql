-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- players
CREATE TABLE players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ja       TEXT NOT NULL,
  name_en       TEXT,
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  nationality   TEXT,
  world_ranking INT,
  category      TEXT NOT NULL CHECK (category IN ('japan_men', 'world_men', 'japan_women', 'world_women')),
  play_style    TEXT CHECK (play_style IN ('shakehands_both','shakehands_surface_pips','penhold_pips','penhold_surface','defender')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_name_trgm ON players USING gin(name_ja gin_trgm_ops);
CREATE INDEX idx_players_name_en_trgm ON players USING gin(coalesce(name_en,'') gin_trgm_ops);
CREATE INDEX idx_players_category ON players(category);
CREATE INDEX idx_players_gender ON players(gender);

-- rackets
CREATE TABLE rackets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  name_aliases  TEXT[],
  manufacturer  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rackets_name_trgm ON rackets USING gin(name gin_trgm_ops);

-- rubbers
CREATE TABLE rubbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  name_aliases  TEXT[],
  manufacturer  TEXT,
  rubber_type   TEXT CHECK (rubber_type IN ('inverted','short_pips','long_pips','anti','medium_pips')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rubbers_name_trgm ON rubbers USING gin(name gin_trgm_ops);

-- equipment_records
CREATE TABLE equipment_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  racket_id             UUID REFERENCES rackets(id),
  rubber_fore_id        UUID REFERENCES rubbers(id),
  rubber_back_id        UUID REFERENCES rubbers(id),
  racket_raw            TEXT,
  rubber_fore_raw       TEXT,
  rubber_back_raw       TEXT,
  rubber_fore_thickness TEXT,
  rubber_back_thickness TEXT,
  grip_type             TEXT CHECK (grip_type IN ('FL','ST','AN','CN')),
  is_current            BOOLEAN DEFAULT false,
  valid_from            DATE,
  valid_to              DATE,
  source_category       TEXT NOT NULL CHECK (source_category IN ('japan_men','world_men','japan_women','world_women')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_player ON equipment_records(player_id);
CREATE INDEX idx_equipment_racket ON equipment_records(racket_id);
CREATE INDEX idx_equipment_rubber_fore ON equipment_records(rubber_fore_id);
CREATE INDEX idx_equipment_rubber_back ON equipment_records(rubber_back_id);
CREATE INDEX idx_equipment_is_current ON equipment_records(is_current);

-- data_sources
CREATE TABLE data_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url          TEXT NOT NULL,
  category     TEXT NOT NULL,
  scraped_at   TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT NOT NULL CHECK (status IN ('success','failed','partial')),
  player_count INT,
  error_log    TEXT
);

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER equipment_records_updated_at
  BEFORE UPDATE ON equipment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- 公開読み取り許可
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read rackets" ON rackets FOR SELECT USING (true);
CREATE POLICY "Public read rubbers" ON rubbers FOR SELECT USING (true);
CREATE POLICY "Public read equipment" ON equipment_records FOR SELECT USING (true);

-- service_role は全操作許可（RLSをバイパス）
