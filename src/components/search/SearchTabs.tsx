'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const TABS = [
  { value: 'all', label: 'すべて' },
  { value: 'player', label: '選手' },
  { value: 'racket', label: 'ラケット' },
  { value: 'rubber', label: 'ラバー' },
] as const

interface Props {
  current: string
  query?: string
}

export default function SearchTabs({ current }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleTab(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', value)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
      {TABS.map(tab => (
        <button
          key={tab.value}
          onClick={() => handleTab(tab.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            current === tab.value
              ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
