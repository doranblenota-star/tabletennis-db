'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface UserEntry {
  player_id: string
  name_ja: string
  world_ranking: number | null
  side?: 'fore' | 'back' | 'both'
  fore_thickness?: string | null
  back_thickness?: string | null
  valid_from?: string | null
  valid_to?: string | null
}

const SIDE = {
  fore: { label: 'フォア', cls: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  back: { label: 'バック', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  both: { label: '両面', cls: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
}

function fmt(d?: string | null) {
  return d ? d.slice(0, 7).replace('-', '/') : ''
}

function ThicknessTag({ u }: { u: UserEntry }) {
  if (u.side === 'both') {
    const f = u.fore_thickness
    const b = u.back_thickness
    if (!f && !b) return null
    const text =
      f === b
        ? (f ?? '')
        : [f && `F${f}`, b && `B${b}`].filter(Boolean).join('/')
    return (
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {text}
      </span>
    )
  }
  const t = u.fore_thickness ?? u.back_thickness
  if (!t) return null
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      {t}
    </span>
  )
}

function Row({ u, isPast }: { u: UserEntry; isPast: boolean }) {
  return (
    <Link
      href={`/players/${u.player_id}`}
      className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/40 dark:active:bg-gray-700/60"
    >
      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-blue-500">
        {u.world_ranking != null ? u.world_ranking : '−'}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-white">
        {u.name_ja}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        {u.side && (
          <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${SIDE[u.side].cls}`}>
            {SIDE[u.side].label}
          </span>
        )}
        <ThicknessTag u={u} />
        {isPast && u.valid_from && (
          <span className="hidden text-xs text-gray-400 sm:block">
            {fmt(u.valid_from)}
            {u.valid_to ? `〜${fmt(u.valid_to)}` : '〜'}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function UserTabsClient({
  currentUsers,
  pastUsers,
}: {
  currentUsers: UserEntry[]
  pastUsers: UserEntry[]
}) {
  const [tab, setTab] = useState<'current' | 'past'>('current')
  const shown = tab === 'current' ? currentUsers : pastUsers

  const tabs = [
    { key: 'current' as const, label: '現在使用', count: currentUsers.length },
    { key: 'past' as const, label: '過去使用', count: pastUsers.length },
  ]

  return (
    <div className="mt-5 border-t pt-5 dark:border-gray-700">
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {tabs.map(({ key, label, count }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-px text-xs font-bold ${
                  active
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-1">
        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">データなし</p>
        ) : (
          shown.map((u, i) => (
            <Row key={`${u.player_id}-${i}`} u={u} isPast={tab === 'past'} />
          ))
        )}
      </div>
    </div>
  )
}
