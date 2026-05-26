import Link from 'next/link'
import ForeBackDisplay from '@/components/equipment/ForeBackDisplay'

interface PlayerCardProps {
  player: {
    id: string
    name_ja: string
    name_en: string | null
    gender: string
    world_ranking: number | null
    category: string
    equipment_records?: unknown[]
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  japan_men: '日本男子',
  world_men: '世界男子',
  japan_women: '日本女子',
  world_women: '世界女子',
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const currentEquip = Array.isArray(player.equipment_records)
    ? (player.equipment_records as Record<string, unknown>[]).find(r => r.is_current)
    : null

  return (
    <Link href={`/players/${player.id}`}>
      <div className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-xs transition hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 dark:text-white">
              {player.name_ja}
            </h3>
            {player.name_en && (
              <p className="text-xs text-gray-400">{player.name_en}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {player.world_ranking && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                WR {player.world_ranking}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700">
              {CATEGORY_LABELS[player.category] ?? player.category}
            </span>
          </div>
        </div>
        {currentEquip && (
          <div className="mt-3 border-t border-gray-50 pt-3 dark:border-gray-700">
            <ForeBackDisplay equipment={currentEquip as Parameters<typeof ForeBackDisplay>[0]['equipment']} />
          </div>
        )}
      </div>
    </Link>
  )
}
