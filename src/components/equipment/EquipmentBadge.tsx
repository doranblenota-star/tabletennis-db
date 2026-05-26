import Link from 'next/link'

interface Props {
  name: string
  id?: string
  thickness?: string | null
  type?: 'racket' | 'rubber'
  side?: 'fore' | 'back'
}

const SIDE_COLORS = {
  fore: 'bg-red-50 text-red-700 border-red-200',
  back: 'bg-blue-50 text-blue-700 border-blue-200',
}

const SIDE_LABELS = { fore: 'F', back: 'B' }

export default function EquipmentBadge({ name, id, thickness, type = 'rubber', side }: Props) {
  const basePath = type === 'racket' ? '/equipment/rackets' : '/equipment/rubbers'
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 text-sm font-medium text-gray-800 shadow-xs transition hover:shadow-sm dark:bg-gray-800 dark:text-gray-200">
      {side && (
        <span
          className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${SIDE_COLORS[side]}`}
        >
          {SIDE_LABELS[side]}
        </span>
      )}
      {name}
      {thickness && (
        <span className="rounded bg-gray-100 px-1 text-xs text-gray-500 dark:bg-gray-700">
          {thickness}
        </span>
      )}
    </span>
  )

  if (id) {
    return <Link href={`${basePath}/${id}`}>{inner}</Link>
  }
  return inner
}
