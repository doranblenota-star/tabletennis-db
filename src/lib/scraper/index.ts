import { createClient } from '@supabase/supabase-js'
import { parseYarilogPage, parseRubberWithThickness } from './parser'
import { normalizeRacketName, normalizeRubberName } from './normalizer'
import type { Category, ScrapedPlayer } from '@/lib/types'
import type { Database } from '@/lib/supabase/database.types'

type SupabaseClient = ReturnType<typeof createClient<Database>>

export const SCRAPE_TARGETS: { url: string; category: Category; label: string }[] = [
  { url: 'https://yarilog.com/equipment-japan-men/', category: 'japan_men', label: '日本男子' },
  { url: 'https://yarilog.com/equipment-world-men/', category: 'world_men', label: '世界男子' },
  { url: 'https://yarilog.com/equipment-japan-women/', category: 'japan_women', label: '日本女子' },
  { url: 'https://yarilog.com/equipment-world-women/', category: 'world_women', label: '世界女子' },
]

// ─── フェッチ ─────────────────────────────────────────────────────────────────

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
    // Node 18+ では signal タイムアウト対応
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return res.text()
}

// ─── ラケット upsert ──────────────────────────────────────────────────────────

export async function upsertRacket(
  supabase: SupabaseClient,
  raw: string
): Promise<string | null> {
  const name = normalizeRacketName(raw)
  if (!name) return null

  // まず既存を検索
  const { data: existing } = await supabase
    .from('rackets')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (existing) return existing.id as string

  // 新規挿入
  const { data, error } = await supabase
    .from('rackets')
    .insert({ name })
    .select('id')
    .single()

  if (error) {
    // 競合（並行挿入）の場合は再取得
    const { data: retry } = await supabase
      .from('rackets')
      .select('id')
      .eq('name', name)
      .maybeSingle()
    return (retry?.id as string) ?? null
  }
  return (data?.id as string) ?? null
}

// ─── ラバー upsert ────────────────────────────────────────────────────────────

export async function upsertRubber(
  supabase: SupabaseClient,
  raw: string
): Promise<{ id: string | null; thickness: string | null }> {
  if (!raw.trim()) return { id: null, thickness: null }

  const { name, thickness } = parseRubberWithThickness(raw)
  const normalized = normalizeRubberName(name)
  if (!normalized) return { id: null, thickness }

  const { data: existing } = await supabase
    .from('rubbers')
    .select('id')
    .eq('name', normalized)
    .maybeSingle()
  if (existing) return { id: existing.id as string, thickness }

  const { data, error } = await supabase
    .from('rubbers')
    .insert({ name: normalized })
    .select('id')
    .single()

  if (error) {
    const { data: retry } = await supabase
      .from('rubbers')
      .select('id')
      .eq('name', normalized)
      .maybeSingle()
    return { id: (retry?.id as string) ?? null, thickness }
  }
  return { id: (data?.id as string) ?? null, thickness }
}

// ─── 選手 upsert ──────────────────────────────────────────────────────────────

export async function upsertPlayer(
  supabase: SupabaseClient,
  player: ScrapedPlayer
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('name_ja', player.name_ja)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('players')
      .update({
        world_ranking: player.world_ranking,
        name_en: player.name_en ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return existing.id as string
  }

  const gender = player.category.endsWith('women') ? 'female' : 'male'
  const { data, error } = await supabase
    .from('players')
    .insert({
      name_ja: player.name_ja,
      name_en: player.name_en,
      gender,
      category: player.category,
      world_ranking: player.world_ranking,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`  ⚠️  player insert error [${player.name_ja}]: ${error.message}`)
    return null
  }
  return (data?.id as string) ?? null
}

// ─── 用具記録 同期 ────────────────────────────────────────────────────────────

export async function syncEquipment(
  supabase: SupabaseClient,
  playerId: string,
  player: ScrapedPlayer,
  dryRun = false
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  // 既存の is_current=true レコードを取得
  const { data: existingCurrents } = await supabase
    .from('equipment_records')
    .select('id, racket_raw, rubber_fore_raw, rubber_back_raw')
    .eq('player_id', playerId)
    .eq('is_current', true)

  // 現在用具が変わっていたら既存の current を過去に移す
  const cur = player.current
  if (existingCurrents && existingCurrents.length > 0) {
    for (const existing of existingCurrents as Record<string, string | null>[]) {
      const unchanged =
        existing.racket_raw === cur.racket_raw &&
        existing.rubber_fore_raw === cur.rubber_fore_raw &&
        existing.rubber_back_raw === cur.rubber_back_raw
      if (!unchanged) {
        if (!dryRun) {
          await supabase
            .from('equipment_records')
            .update({ is_current: false, valid_to: cur.valid_from ?? new Date().toISOString().slice(0, 7) + '-01' })
            .eq('id', existing.id as string)
        }
      } else {
        // 変化なし: 更新不要
        skipped++
        // 現在用具はスキップ（重複挿入しない）
        // 履歴のみ処理
        await upsertHistoryEntries(supabase, playerId, player, dryRun)
        return { inserted, skipped }
      }
    }
  }

  // 現在用具を挿入
  if (cur.racket_raw || cur.rubber_fore_raw || cur.rubber_back_raw) {
    if (!dryRun) {
      const racketId = cur.racket_raw ? await upsertRacket(supabase, cur.racket_raw) : null
      const fore = cur.rubber_fore_raw ? await upsertRubber(supabase, cur.rubber_fore_raw) : { id: null, thickness: null }
      const back = cur.rubber_back_raw ? await upsertRubber(supabase, cur.rubber_back_raw) : { id: null, thickness: null }

      await supabase.from('equipment_records').insert({
        player_id: playerId,
        racket_id: racketId,
        rubber_fore_id: fore.id,
        rubber_back_id: back.id,
        racket_raw: cur.racket_raw,
        rubber_fore_raw: cur.rubber_fore_raw,
        rubber_back_raw: cur.rubber_back_raw,
        rubber_fore_thickness: fore.thickness,
        rubber_back_thickness: back.thickness,
        grip_type: cur.grip_type,
        is_current: true,
        valid_from: cur.valid_from,
        valid_to: null,
        source_category: player.category,
        notes: cur.notes,
      })
    }
    inserted++
  }

  // 履歴を挿入
  const histResult = await upsertHistoryEntries(supabase, playerId, player, dryRun)
  inserted += histResult.inserted
  skipped += histResult.skipped

  return { inserted, skipped }
}

async function upsertHistoryEntries(
  supabase: SupabaseClient,
  playerId: string,
  player: ScrapedPlayer,
  dryRun: boolean
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  // 既存の履歴 valid_from 一覧を取得（重複チェック用）
  const { data: existingHistory } = await supabase
    .from('equipment_records')
    .select('valid_from, racket_raw')
    .eq('player_id', playerId)
    .eq('is_current', false)

  const existingSet = new Set(
    (existingHistory ?? []).map(r => `${r.valid_from}__${r.racket_raw}`)
  )

  for (const entry of player.history) {
    if (!entry.racket_raw && !entry.rubber_fore_raw && !entry.rubber_back_raw) continue

    const key = `${entry.valid_from}__${entry.racket_raw}`
    if (existingSet.has(key)) {
      skipped++
      continue
    }

    if (!dryRun) {
      const racketId = entry.racket_raw ? await upsertRacket(supabase, entry.racket_raw) : null
      const fore = entry.rubber_fore_raw ? await upsertRubber(supabase, entry.rubber_fore_raw) : { id: null, thickness: null }
      const back = entry.rubber_back_raw ? await upsertRubber(supabase, entry.rubber_back_raw) : { id: null, thickness: null }

      await supabase.from('equipment_records').insert({
        player_id: playerId,
        racket_id: racketId,
        rubber_fore_id: fore.id,
        rubber_back_id: back.id,
        racket_raw: entry.racket_raw,
        rubber_fore_raw: entry.rubber_fore_raw,
        rubber_back_raw: entry.rubber_back_raw,
        rubber_fore_thickness: fore.thickness,
        rubber_back_thickness: back.thickness,
        grip_type: entry.grip_type,
        is_current: false,
        valid_from: entry.valid_from,
        valid_to: entry.valid_to,
        source_category: player.category,
        notes: entry.notes,
      })
    }
    inserted++
    existingSet.add(key)
  }

  return { inserted, skipped }
}

// ─── メイン実行関数 ───────────────────────────────────────────────────────────

export interface ScrapeOptions {
  categories?: Category[]
  dryRun?: boolean
  onProgress?: (info: {
    category: string
    label: string
    playerIndex: number
    playerTotal: number
    playerName: string
  }) => void
}

export interface ScrapeResult {
  success: boolean
  results: CategoryResult[]
}

export interface CategoryResult {
  category: Category
  label: string
  playerCount: number
  insertedRecords: number
  skippedRecords: number
  error?: string
  durationMs: number
}

export async function runScraper(options: ScrapeOptions = {}): Promise<ScrapeResult> {
  const { categories, dryRun = false, onProgress } = options

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const targets = categories
    ? SCRAPE_TARGETS.filter(t => categories.includes(t.category))
    : SCRAPE_TARGETS

  const results: CategoryResult[] = []

  for (const target of targets) {
    const startMs = Date.now()
    const startAt = new Date().toISOString()
    let insertedRecords = 0
    let skippedRecords = 0

    try {
      const html = await fetchPage(target.url)
      const players = parseYarilogPage(html, target.url)

      for (let i = 0; i < players.length; i++) {
        const player = players[i]
        onProgress?.({
          category: target.category,
          label: target.label,
          playerIndex: i,
          playerTotal: players.length,
          playerName: player.name_ja,
        })

        const playerId = await upsertPlayer(supabase, player)
        if (playerId) {
          const sync = await syncEquipment(supabase, playerId, player, dryRun)
          insertedRecords += sync.inserted
          skippedRecords += sync.skipped
        }
      }

      if (!dryRun) {
        await supabase.from('data_sources').insert({
          url: target.url,
          category: target.category,
          scraped_at: startAt,
          status: 'success',
          player_count: players.length,
        })
      }

      results.push({
        category: target.category,
        label: target.label,
        playerCount: players.length,
        insertedRecords,
        skippedRecords,
        durationMs: Date.now() - startMs,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      if (!dryRun) {
        await supabase.from('data_sources').insert({
          url: target.url,
          category: target.category,
          scraped_at: startAt,
          status: 'failed',
          error_log: msg,
        })
      }

      results.push({
        category: target.category,
        label: target.label,
        playerCount: 0,
        insertedRecords: 0,
        skippedRecords: 0,
        error: msg,
        durationMs: Date.now() - startMs,
      })
    }
  }

  return {
    success: results.every(r => !r.error),
    results,
  }
}
