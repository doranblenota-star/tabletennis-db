import Link from 'next/link'

interface UserEntry {
  player_id: string
  name_ja: string
  name_en: string | null
  world_ranking: number | null
  gender: string
  side?: 'fore' | 'back'
  thickness?: string | null
  valid_from: string | null
  valid_to: string | null
}

interface Props {
  users: UserEntry[]
  label: string
}

const SIDE_LABELS = { fore: 'フォア', back: 'バック' }
const SIDE_COLORS = {
  fore: 'bg-red-50 text-red-600',
  back: 'bg-blue-50 text-blue-600',
}

function formatDate(d: string | null) {
  return d ? d.slice(0, 7).replace('-', '/') : ''
}

export default function UserList({ users, label }: Props) {
  if (users.length === 0) return null

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-500">{label}（{users.length}名）</h4>
      <div className="space-y-1.5">
        {users.map((u, i) => (
          <Link
            key={`${u.player_id}-${i}`}
            href={`/players/${u.player_id}`}
            className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {u.world_ranking && (
              <span className="w-8 text-right text-xs font-bold text-blue-500">
                {u.world_ranking}
              </span>
            )}
            <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white">
              {u.name_ja}
            </span>
            {u.side && (
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SIDE_COLORS[u.side]}`}>
                {SIDE_LABELS[u.side]}
              </span>
            )}
            {u.thickness && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700">
                {u.thickness}
              </span>
            )}
            {u.valid_from && (
              <span className="text-xs text-gray-400">
                {formatDate(u.valid_from)}
                {u.valid_to ? `～${formatDate(u.valid_to)}` : '～'}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
