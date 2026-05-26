# 卓球選手使用用具検索サイト システム設計書

**プロジェクト名:** TableTennis DB  
**作成日:** 2026-05-26  
**バージョン:** 1.0

---

## 1. プロジェクト概要

卓球選手の使用用具（ラケット・ラバー）を検索・閲覧できるWebサービス。  
yarilog.com の4ページからデータをスクレイピングし、Supabase に保存。  
選手名・ラケット・ラバー名での横断検索と、フォア/バック別・現在/過去の用具履歴表示を提供する。

---

## 2. データソース分析

### 2.1 対象URL

| カテゴリ | URL |
|---------|-----|
| 日本男子 | https://yarilog.com/equipment-japan-men/ |
| 世界男子 | https://yarilog.com/equipment-world-men/ |
| 日本女子 | https://yarilog.com/equipment-japan-women/ |
| 世界女子 | https://yarilog.com/equipment-world-women/ |

### 2.2 データ構造（スクレイピング対象）

ページはHTMLのテキストベース構造（テーブルではなく段落形式）。

**1選手あたりのデータパターン:**
```
・選手名(英語表記)　WRランキング（更新年月）
R：ラケット名　F：フォアラバー(厚さ)　B：バックラバー(厚さ)
▼用具遍歴
  (年月) R：... F：... B：...
  ↓
  (年月) R：... F：... B：...
```

**表記の特徴:**
- `R:` = ラケット
- `F:` = フォアラバー
- `B:` = バックラバー
- `G:` = グリップ形状（FL/ST/AN など）
- ラバー厚さ: 括弧内（特厚/厚/中/薄/1.8mm など）
- 特注品: 括弧内に素材・仕様記載

---

## 3. システムアーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                     Vercel                          │
│  ┌─────────────────────────────────────────────┐   │
│  │           Next.js App (App Router)           │   │
│  │  ┌──────────────┐  ┌──────────────────────┐ │   │
│  │  │  公開サイト   │  │     管理画面          │ │   │
│  │  │  /search     │  │  /admin/*             │ │   │
│  │  │  /players    │  │  (Basic Auth保護)      │ │   │
│  │  │  /equipment  │  └──────────────────────┘ │   │
│  │  └──────────────┘                            │   │
│  │  ┌─────────────────────────────────────────┐ │   │
│  │  │         API Routes (Route Handlers)      │ │   │
│  │  │  /api/search  /api/players  /api/admin   │ │   │
│  │  └─────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐     ┌──────────────────────┐
│    Supabase     │     │    GitHub Actions     │
│  (PostgreSQL)   │     │  (週1回スクレイピング) │
│                 │◄────│  scraper.ts           │
│  - players      │     └──────────────────────┘
│  - equipment    │              │
│  - equipments   │              ▼
│    _history     │     ┌──────────────────────┐
│  - rackets      │     │  yarilog.com         │
│  - rubbers      │     │  (4ページ)            │
└─────────────────┘     └──────────────────────┘
```

---

## 4. データベース設計（Supabase / PostgreSQL）

### 4.1 テーブル一覧

| テーブル名 | 説明 |
|-----------|------|
| `players` | 選手マスタ |
| `rackets` | ラケットマスタ |
| `rubbers` | ラバーマスタ |
| `equipment_records` | 選手の用具記録（現在・過去含む） |
| `data_sources` | スクレイピング元管理 |

### 4.2 テーブル定義

#### players（選手マスタ）
```sql
CREATE TABLE players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ja       TEXT NOT NULL,           -- 日本語名（例: 張本智和）
  name_en       TEXT,                    -- 英語名（例: Harimoto Tomokazu）
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  nationality   TEXT,                    -- 国籍（例: 日本, 中国）
  world_ranking INT,                     -- 最新世界ランキング
  category      TEXT NOT NULL,           -- 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
  play_style    TEXT,                    -- 'shakehands_both' | 'shakehands_surface_pips' | 'penhold_pips' | 'defender'
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### rackets（ラケットマスタ）
```sql
CREATE TABLE rackets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,    -- 正規化されたラケット名
  name_aliases  TEXT[],                  -- 表記揺れ・別名リスト
  manufacturer  TEXT,                    -- メーカー（例: バタフライ, VICTAS）
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### rubbers（ラバーマスタ）
```sql
CREATE TABLE rubbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,    -- 正規化されたラバー名
  name_aliases  TEXT[],                  -- 表記揺れ・別名リスト
  manufacturer  TEXT,
  rubber_type   TEXT,                    -- 'inverted' | 'short_pips' | 'long_pips' | 'anti' | 'medium_pips'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### equipment_records（選手用具記録）
```sql
CREATE TABLE equipment_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  racket_id       UUID REFERENCES rackets(id),
  rubber_fore_id  UUID REFERENCES rubbers(id),
  rubber_back_id  UUID REFERENCES rubbers(id),
  racket_raw      TEXT,                  -- スクレイピング生データ
  rubber_fore_raw TEXT,                  -- スクレイピング生データ（厚さ含む）
  rubber_back_raw TEXT,                  -- スクレイピング生データ（厚さ含む）
  rubber_fore_thickness TEXT,            -- '特厚' | '厚' | '中' | '薄' | '1.8mm' など
  rubber_back_thickness TEXT,
  grip_type       TEXT,                  -- 'FL' | 'ST' | 'AN' | 'CN'
  is_current      BOOLEAN DEFAULT false, -- 現在の用具か
  valid_from      DATE,                  -- 使用開始年月
  valid_to        DATE,                  -- 使用終了年月（NULLなら現在）
  source_category TEXT NOT NULL,         -- 'japan_men' | 'world_men' | 'japan_women' | 'world_women'
  notes           TEXT,                  -- 特注情報など補足
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_equipment_records_player_id ON equipment_records(player_id);
CREATE INDEX idx_equipment_records_racket_id ON equipment_records(racket_id);
CREATE INDEX idx_equipment_records_rubber_fore ON equipment_records(rubber_fore_id);
CREATE INDEX idx_equipment_records_rubber_back ON equipment_records(rubber_back_id);
CREATE INDEX idx_equipment_records_is_current ON equipment_records(is_current);
```

#### data_sources（スクレイピング履歴）
```sql
CREATE TABLE data_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT NOT NULL,
  category    TEXT NOT NULL,
  scraped_at  TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT NOT NULL,             -- 'success' | 'failed' | 'partial'
  player_count INT,
  error_log   TEXT
);
```

### 4.3 全文検索対応

```sql
-- 選手名の全文検索インデックス
CREATE INDEX idx_players_name_search
  ON players USING gin(to_tsvector('simple', coalesce(name_ja,'') || ' ' || coalesce(name_en,'')));

-- ラケット・ラバー名の検索
CREATE INDEX idx_rackets_name_trgm ON rackets USING gin(name gin_trgm_ops);
CREATE INDEX idx_rubbers_name_trgm ON rubbers USING gin(name gin_trgm_ops);
```

---

## 5. ディレクトリ構成

```
tabletennis-db/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # トップ（検索フォーム）
│   │   ├── search/
│   │   │   └── page.tsx              # 検索結果ページ
│   │   ├── players/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # 選手詳細（用具履歴）
│   │   ├── equipment/
│   │   │   ├── rackets/
│   │   │   │   └── [id]/page.tsx     # ラケット詳細（使用選手一覧）
│   │   │   └── rubbers/
│   │   │       └── [id]/page.tsx     # ラバー詳細（使用選手一覧）
│   │   ├── admin/
│   │   │   ├── layout.tsx            # 管理画面レイアウト（認証チェック）
│   │   │   ├── page.tsx              # 管理ダッシュボード
│   │   │   ├── players/
│   │   │   │   ├── page.tsx          # 選手一覧・追加
│   │   │   │   └── [id]/page.tsx     # 選手編集
│   │   │   └── equipment/
│   │   │       └── page.tsx          # 用具マスタ管理
│   │   └── api/
│   │       ├── search/route.ts       # 統合検索API
│   │       ├── players/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── rackets/route.ts
│   │       ├── rubbers/route.ts
│   │       └── admin/
│   │           ├── players/route.ts
│   │           └── scrape/route.ts   # 手動スクレイピングトリガー
│   ├── components/
│   │   ├── search/
│   │   │   ├── SearchBar.tsx         # メイン検索バー
│   │   │   ├── SearchTabs.tsx        # 選手/ラケット/ラバー切り替え
│   │   │   └── SearchResults.tsx
│   │   ├── player/
│   │   │   ├── PlayerCard.tsx        # 選手カード（検索結果用）
│   │   │   ├── PlayerDetail.tsx      # 選手詳細（現在用具）
│   │   │   └── EquipmentHistory.tsx  # 用具履歴タイムライン
│   │   ├── equipment/
│   │   │   ├── EquipmentBadge.tsx    # ラバー/ラケット名バッジ
│   │   │   ├── ForeBackDisplay.tsx   # フォア・バック表示
│   │   │   └── UserList.tsx          # 用具の使用選手一覧
│   │   └── admin/
│   │       ├── PlayerForm.tsx
│   │       └── EquipmentForm.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # クライアントサイド用
│   │   │   └── server.ts             # サーバーサイド用
│   │   ├── scraper/
│   │   │   ├── index.ts              # スクレイパーエントリ
│   │   │   ├── parser.ts             # HTML→構造化データ変換
│   │   │   └── normalizer.ts         # 用具名の正規化
│   │   └── types.ts                  # 型定義
│   └── hooks/
│       ├── useSearch.ts
│       └── usePlayerDetail.ts
├── scripts/
│   └── scrape.ts                     # GitHub Actionsから呼ぶスクリプト
├── .github/
│   └── workflows/
│       └── weekly-scrape.yml         # 週1回更新ワークフロー
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 6. API設計

### 6.1 公開API

#### `GET /api/search`
統合検索エンドポイント。

**クエリパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `q` | string | 検索キーワード |
| `type` | `player\|racket\|rubber\|all` | 検索対象（デフォルト: `all`） |
| `current_only` | boolean | 現在使用のみ（デフォルト: false） |
| `gender` | `male\|female\|all` | 性別フィルター |
| `side` | `fore\|back\|both` | フォア/バック指定（ラバー検索時） |

**レスポンス例（ラバー名 "ザイア" で検索）:**
```json
{
  "players": [],
  "rackets": [],
  "rubbers": [
    {
      "id": "...",
      "name": "ザイア03",
      "current_users": [
        {
          "player_id": "...",
          "name_ja": "張本智和",
          "world_ranking": 3,
          "side": "fore",
          "thickness": "特厚",
          "valid_from": "2025-10"
        }
      ],
      "past_users": [
        {
          "player_id": "...",
          "name_ja": "戸上隼輔",
          "side": "back",
          "valid_from": "2024-04",
          "valid_to": "2025-02"
        }
      ]
    }
  ]
}
```

#### `GET /api/players/[id]`
選手詳細 + 用具履歴。

#### `GET /api/rackets`
ラケット一覧（検索・オートコンプリート用）。

#### `GET /api/rubbers`
ラバー一覧（検索・オートコンプリート用）。

### 6.2 管理API（要認証）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/admin/players` | 選手追加 |
| PUT | `/api/admin/players/[id]` | 選手情報更新 |
| DELETE | `/api/admin/players/[id]` | 選手削除 |
| POST | `/api/admin/equipment` | 用具記録追加 |
| PUT | `/api/admin/equipment/[id]` | 用具記録更新 |
| POST | `/api/admin/scrape` | 手動スクレイピング実行 |

---

## 7. スクレイピング設計

### 7.1 パース戦略

yarilog.com のページはテーブルではなくテキスト段落形式のため、正規表現＋ルールベースでパースする。

**パース対象テキストパターン:**
```
R：(.+?)\s+F：(.+?)\s+B：(.+)
```

**用具遍歴の検出:**
- `▼用具遍歴` セクション以降をパース
- `（YYYY/MM）` または `（YYYY/MM〜YYYY/MM）` で期間を抽出
- `↓` で区切られた各期間のデータを順次パース

### 7.2 名前正規化

同一用具の表記揺れを統一する正規化テーブルを管理。

**例:**
- `テナジー05` ↔ `Tenergy 05` ↔ `T05` → `テナジー05`
- `ディグニクス09C` ↔ `D09C` → `ディグニクス09C`

正規化ルールは `normalizer.ts` と Supabase の `name_aliases` カラムで管理。

### 7.3 差分更新ロジック

```
1. 各URLをスクレイピング
2. 既存DBの is_current=true レコードを取得
3. 新データと比較
   - 変更あり → 既存レコードを is_current=false, valid_to=今月 に更新
             → 新レコードを is_current=true で挿入
   - 変更なし → updated_at のみ更新
4. data_sources テーブルに実行ログを記録
```

---

## 8. 画面設計

### 8.1 トップページ（検索画面）

```
┌────────────────────────────────────┐
│  🏓 TableTennis DB                  │
│  卓球選手使用用具検索               │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🔍  選手名・ラケット・ラバー  │  │
│  └──────────────────────────────┘  │
│  [選手] [ラケット] [ラバー]         │
│                                    │
│  人気検索: ザイア テナジー05        │
│           張本智和 ディグニクス      │
└────────────────────────────────────┘
```

### 8.2 検索結果ページ（ラバー検索例: "ザイア"）

```
┌────────────────────────────────────┐
│ "ザイア" の検索結果                  │
│                                    │
│ ▼ ラバー                           │
│  ┌──────────────────────────────┐  │
│  │ ザイア03                      │  │
│  │ ■ 現在使用者 (12名)           │  │
│  │   張本智和  フォア WR3        │  │
│  │   [選手詳細→]                 │  │
│  │ ■ 過去使用者 (8名)            │  │
│  │   戸上隼輔  バック 〜2025/02  │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ ザイアエクスポート            │  │
│  │ ■ 現在使用者 (3名)           │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### 8.3 選手詳細ページ

```
┌────────────────────────────────────┐
│ 張本智和                           │
│ WR 3位  日本  男子                 │
│                                    │
│ ▼ 現在の使用用具                   │
│  ┌────────────────────────────┐   │
│  │ ラケット                    │   │
│  │ 張本智和インナーフォースALC  │   │
│  ├────────────┬───────────────┤   │
│  │  フォア     │  バック       │   │
│  │  ザイア03   │  ザイア03     │   │
│  │  [特厚]     │  [特厚]       │   │
│  └────────────┴───────────────┘   │
│                                    │
│ ▼ 用具遍歴                        │
│  2025/10〜現在                     │
│   R: 張本智和インナーフォースALC    │
│   F: ザイア03  B: ザイア03         │
│  ↑                                 │
│  2024/05〜2025/09                  │
│   R: 張本智和インナーフォースALC    │
│   F: ディグニクス09C  B: ザイア03  │
└────────────────────────────────────┘
```

### 8.4 管理画面

```
┌────────────────────────────────────┐
│ 管理画面                           │
│                                    │
│ [選手管理] [用具マスタ] [スクレイプ]│
│                                    │
│ ▼ 選手一覧                        │
│  [+ 選手追加]                      │
│  選手名     カテゴリ  最終更新      │
│  張本智和   日本男子  2026-05-20   │
│  [編集] [削除]                     │
└────────────────────────────────────┘
```

---

## 9. GitHub Actions ワークフロー

```yaml
# .github/workflows/weekly-scrape.yml
name: Weekly Equipment Scrape

on:
  schedule:
    - cron: '0 18 * * 0'  # 毎週日曜 03:00 JST
  workflow_dispatch:       # 手動実行も可能

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx ts-node scripts/scrape.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## 10. 認証・セキュリティ

### 10.1 管理画面認証

- **方式:** Supabase Auth（メール/パスワード）
- `/admin/*` は middleware でセッション確認
- 管理者ユーザーは Supabase Dashboard で手動管理

### 10.2 API保護

- 管理系 API Route は `Authorization` ヘッダーまたは Cookie でセッション確認
- GitHub Actions からの scrape は `SUPABASE_SERVICE_ROLE_KEY` を使用（Vercel を経由しない直接 Supabase 書き込み）

### 10.3 レート制限

- Vercel Edge Config または middleware で `/api/search` に1分60リクエスト制限

---

## 11. 環境変数

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...   # サーバー/スクリプトのみ
ADMIN_EMAIL=admin@example.com         # 管理者メール（初期設定用）
```

---

## 12. 開発フェーズ

### Phase 1 — 基盤構築（優先）
1. Supabase プロジェクト作成・スキーマ適用
2. Next.js プロジェクト初期化（App Router + TailwindCSS）
3. スクレイパー実装 (`scripts/scrape.ts`)
4. 初回データ投入（4ページ分）

### Phase 2 — 検索機能
5. 統合検索 API 実装
6. トップページ・検索結果ページ UI
7. 選手詳細ページ（現在用具 + 履歴）

### Phase 3 — 用具ページ・管理画面
8. ラケット/ラバー詳細ページ（使用選手一覧）
9. 管理画面（CRUD）
10. Supabase Auth 連携

### Phase 4 — 自動化・最適化
11. GitHub Actions ワークフロー
12. SEO対応（OGP、sitemap）
13. スマホ UI 調整・パフォーマンス最適化

---

## 13. 技術選定の補足

| 項目 | 選択 | 理由 |
|------|------|------|
| Supabase | PostgreSQL + RLS + Auth | 全文検索・リアルタイム・認証を一元管理 |
| App Router | Next.js 14+ | Server Components でSEO対応とDB直接アクセス |
| TailwindCSS | スタイリング | スマホ対応のレスポンシブを効率実装 |
| pg_trgm | あいまい検索 | 表記揺れ・部分一致に対応（例: "ザイア" → "ザイア03"） |
| ts-node スクリプト | スクレイピング | Vercel のサーバーレス制限なしに長時間実行可能 |
