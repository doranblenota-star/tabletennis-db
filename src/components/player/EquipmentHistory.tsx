import ForeBackDisplay from '@/components/equipment/ForeBackDisplay'

interface EquipmentRecord {
  id: string
  is_current: boolean
  valid_from: string | null
  valid_to: string | null
  racket_raw: string | null
  rubber_fore_raw: string | null
  rubber_back_raw: string | null
  rubber_fore_thickness: string | null
  rubber_back_thickness: string | null
  rackets?: { id: string; name: string } | null
  rubbers_fore?: { id: string; name: string } | null
  rubbers_back?: { id: string; name: string } | null
}

interface Props {
  records: EquipmentRecord[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '不明'
  return dateStr.slice(0, 7).replace('-', '/')
}

export default function EquipmentHistory({ records }: Props) {
  const sorted = [...records].sort((a, b) => {
    if (a.is_current && !b.is_current) return -1
    if (!a.is_current && b.is_current) return 1
    const dateA = a.valid_from ?? ''
    const dateB = b.valid_from ?? ''
    return dateB.localeCompare(dateA)
  })

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400">用具記録がありません</p>
  }

  return (
    <div className="space-y-3">
      {sorted.map((record, i) => (
        <div
          key={record.id}
          className={`relative rounded-xl border p-4 ${
            record.is_current
              ? 'border-blue-200 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20'
              : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800'
          }`}
        >
          {/* タイムライン線 */}
          {i < sorted.length - 1 && (
            <div className="absolute -bottom-3 left-6 h-3 w-0.5 bg-gray-200 dark:bg-gray-600" />
          )}

          <div className="mb-3 flex items-center gap-2">
            {record.is_current ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                現在
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700">
                過去
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatDate(record.valid_from)}
              {record.valid_to ? ` ～ ${formatDate(record.valid_to)}` : record.is_current ? ' ～ 現在' : ''}
            </span>
          </div>

          <ForeBackDisplay equipment={record} />
        </div>
      ))}
    </div>
  )
}
