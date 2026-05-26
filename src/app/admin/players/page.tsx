import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Player } from '@/lib/types'

type PlayerRow = Pick<Player, 'id' | 'name_ja' | 'name_en' | 'category' | 'world_ranking' | 'is_active' | 'updated_at'>

const CATEGORY_LABELS: Record<string, string> = {
  japan_men: '日本男子',
  world_men: '世界男子',
  japan_women: '日本女子',
  world_women: '世界女子',
}

export default async function AdminPlayersPage() {
  const supabase = await createClient()

  const { data: rawPlayers } = await supabase
    .from('players')
    .select('id, name_ja, name_en, category, world_ranking, is_active, updated_at')
    .order('world_ranking', { ascending: true, nullsFirst: false })
    .order('name_ja')
    .limit(200)
  const players = (rawPlayers ?? []) as unknown as PlayerRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">選手管理</h1>
        <Link
          href="/admin/players/new"
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
        >
          + 選手追加
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">選手名</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">カテゴリ</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">WR</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">最終更新</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {players.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{p.name_ja}</div>
                  {p.name_en && <div className="text-xs text-gray-400">{p.name_en}</div>}
                </td>
                <td className="px-4 py-3 text-gray-500">{CATEGORY_LABELS[p.category] ?? p.category}</td>
                <td className="px-4 py-3 text-gray-500">{p.world_ranking ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(p.updated_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/players/${p.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
