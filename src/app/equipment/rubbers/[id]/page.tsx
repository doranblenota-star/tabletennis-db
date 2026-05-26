import { notFound } from 'next/navigation'
import Link from 'next/link'
import UserTabsClient, { type UserEntry } from '@/components/equipment/UserTabsClient'
import { createClient } from '@/lib/supabase/server'
import type { Rubber } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

const RUBBER_TYPE_JA: Record<string, string> = {
  inverted: '裏ソフト',
  short_pips: '表ソフト',
  long_pips: '粒高',
  anti: 'アンチ',
  medium_pips: '中間硬度粒',
}

interface RawEntry {
  player_id: string
  name_ja: string
  world_ranking: number | null
  side: 'fore' | 'back'
  fore_thickness: string | null
  back_thickness: string | null
  valid_from: string | null
  valid_to: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildForeEntry(r: any): RawEntry {
  return {
    player_id: r.players.id,
    name_ja: r.players.name_ja,
    world_ranking: r.players.world_ranking,
    side: 'fore',
    fore_thickness: r.rubber_fore_thickness ?? null,
    back_thickness: null,
    valid_from: r.valid_from,
    valid_to: r.valid_to,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildBackEntry(r: any): RawEntry {
  return {
    player_id: r.players.id,
    name_ja: r.players.name_ja,
    world_ranking: r.players.world_ranking,
    side: 'back',
    fore_thickness: null,
    back_thickness: r.rubber_back_thickness ?? null,
    valid_from: r.valid_from,
    valid_to: r.valid_to,
  }
}

function mergeByPlayer(fore: RawEntry[], back: RawEntry[]): UserEntry[] {
  const map = new Map<string, UserEntry>()

  for (const e of fore) {
    map.set(e.player_id, {
      player_id: e.player_id,
      name_ja: e.name_ja,
      world_ranking: e.world_ranking,
      side: 'fore',
      fore_thickness: e.fore_thickness,
      back_thickness: null,
      valid_from: e.valid_from,
      valid_to: e.valid_to,
    })
  }

  for (const e of back) {
    const existing = map.get(e.player_id)
    if (existing) {
      map.set(e.player_id, {
        player_id: existing.player_id,
        name_ja: existing.name_ja,
        world_ranking: existing.world_ranking,
        side: 'both',
        fore_thickness: existing.fore_thickness,
        back_thickness: e.back_thickness,
        valid_from: existing.valid_from,
        valid_to: existing.valid_to,
      })
    } else {
      map.set(e.player_id, {
        player_id: e.player_id,
        name_ja: e.name_ja,
        world_ranking: e.world_ranking,
        side: 'back',
        fore_thickness: null,
        back_thickness: e.back_thickness,
        valid_from: e.valid_from,
        valid_to: e.valid_to,
      })
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => (a.world_ranking ?? 9999) - (b.world_ranking ?? 9999)
  )
}

export default async function RubberPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rubberData, error } = await supabase
    .from('rubbers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !rubberData) notFound()
  const rubber = rubberData as unknown as Rubber

  const { data: rawForeRecords } = await supabase
    .from('equipment_records')
    .select('rubber_fore_thickness, is_current, valid_from, valid_to, players(id, name_ja, world_ranking)')
    .eq('rubber_fore_id', id)
    .order('valid_from', { ascending: false })
    .limit(100)

  const { data: rawBackRecords } = await supabase
    .from('equipment_records')
    .select('rubber_back_thickness, is_current, valid_from, valid_to, players(id, name_ja, world_ranking)')
    .eq('rubber_back_id', id)
    .order('valid_from', { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const foreRecords = (rawForeRecords ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backRecords = (rawBackRecords ?? []) as any[]

  const currentFore = foreRecords.filter(r => r.is_current).map(buildForeEntry)
  const currentBack = backRecords.filter(r => r.is_current).map(buildBackEntry)
  const pastFore = foreRecords.filter(r => !r.is_current).map(buildForeEntry)
  const pastBack = backRecords.filter(r => !r.is_current).map(buildBackEntry)

  const currentUsers = mergeByPlayer(currentFore, currentBack)
  const pastUsers = mergeByPlayer(pastFore, pastBack)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-500">🏓</Link>
          <span>/</span>
          <span>ラバー</span>
          <span>/</span>
          <span className="truncate text-gray-800 dark:text-white">{rubber.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border bg-white p-5 shadow-xs dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white sm:text-2xl">
                {rubber.name}
              </h1>
              {rubber.manufacturer && (
                <p className="mt-1 text-sm text-gray-400">{rubber.manufacturer}</p>
              )}
            </div>
            {rubber.rubber_type && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                {RUBBER_TYPE_JA[rubber.rubber_type] ?? rubber.rubber_type}
              </span>
            )}
          </div>

          <UserTabsClient currentUsers={currentUsers} pastUsers={pastUsers} />
        </div>
      </div>
    </div>
  )
}
