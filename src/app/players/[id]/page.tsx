import { notFound } from 'next/navigation'
import Link from 'next/link'
import EquipmentHistory from '@/components/player/EquipmentHistory'
import ForeBackDisplay from '@/components/equipment/ForeBackDisplay'

interface Props {
  params: Promise<{ id: string }>
}

const CATEGORY_LABELS: Record<string, string> = {
  japan_men: '日本男子',
  world_men: '世界男子',
  japan_women: '日本女子',
  world_women: '世界女子',
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/players/${id}`, { next: { revalidate: 300 } })

  if (!res.ok) notFound()

  const { player, equipment_records } = await res.json()

  const currentRecord = equipment_records.find((r: { is_current: boolean }) => r.is_current)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ナビ */}
      <div className="border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-500">🏓</Link>
          <span>/</span>
          <span className="text-gray-800 dark:text-white">{player.name_ja}</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* プロフィール */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {player.name_ja}
              </h1>
              {player.name_en && (
                <p className="mt-0.5 text-sm text-gray-400">{player.name_en}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {player.world_ranking && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
                  WR {player.world_ranking}
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700">
                {CATEGORY_LABELS[player.category] ?? player.category}
              </span>
            </div>
          </div>

          {/* 現在用具 */}
          {currentRecord && (
            <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700">
              <h2 className="mb-3 text-sm font-semibold text-gray-500">現在の使用用具</h2>
              <ForeBackDisplay equipment={currentRecord} />
            </div>
          )}
        </div>

        {/* 用具履歴 */}
        <div>
          <h2 className="mb-4 text-base font-bold text-gray-800 dark:text-white">
            用具履歴
          </h2>
          <EquipmentHistory records={equipment_records} />
        </div>
      </div>
    </div>
  )
}
