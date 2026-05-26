import { notFound } from 'next/navigation'
import Link from 'next/link'
import UserTabsClient, { type UserEntry } from '@/components/equipment/UserTabsClient'
import { createClient } from '@/lib/supabase/server'
import type { Racket } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEntry(r: any): UserEntry {
  return {
    player_id: r.players.id,
    name_ja: r.players.name_ja,
    world_ranking: r.players.world_ranking,
    valid_from: r.valid_from,
    valid_to: r.valid_to,
  }
}

function dedupeByPlayer(entries: UserEntry[]): UserEntry[] {
  const map = new Map<string, UserEntry>()
  for (const e of entries) {
    if (!map.has(e.player_id)) map.set(e.player_id, e)
  }
  return Array.from(map.values()).sort(
    (a, b) => (a.world_ranking ?? 9999) - (b.world_ranking ?? 9999)
  )
}

export default async function RacketPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: racketData, error } = await supabase
    .from('rackets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !racketData) notFound()
  const racket = racketData as unknown as Racket

  const { data: rawRecords } = await supabase
    .from('equipment_records')
    .select('is_current, valid_from, valid_to, players(id, name_ja, world_ranking)')
    .eq('racket_id', id)
    .order('valid_from', { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = (rawRecords ?? []) as any[]

  const currentUsers = dedupeByPlayer(records.filter(r => r.is_current).map(buildEntry))
  const pastUsers = dedupeByPlayer(records.filter(r => !r.is_current).map(buildEntry))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-500">🏓</Link>
          <span>/</span>
          <span>ラケット</span>
          <span>/</span>
          <span className="truncate text-gray-800 dark:text-white">{racket.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border bg-white p-5 shadow-xs dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white sm:text-2xl">
              {racket.name}
            </h1>
            {racket.manufacturer && (
              <p className="mt-1 text-sm text-gray-400">{racket.manufacturer}</p>
            )}
          </div>

          <UserTabsClient currentUsers={currentUsers} pastUsers={pastUsers} />
        </div>
      </div>
    </div>
  )
}
