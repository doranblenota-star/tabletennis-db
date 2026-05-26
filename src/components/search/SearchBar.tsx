'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  defaultValue?: string
  autoFocus?: boolean
}

export default function SearchBar({ defaultValue = '', autoFocus = false }: Props) {
  const [value, setValue] = useState(defaultValue)
  const router = useRouter()

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const q = value.trim()
      if (!q) return
      router.push(`/search?q=${encodeURIComponent(q)}`)
    },
    [value, router]
  )

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        <svg
          className="absolute left-4 h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="選手名・ラケット・ラバーを検索..."
          autoFocus={autoFocus}
          className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-32 text-base shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          className="absolute right-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 active:scale-95"
        >
          検索
        </button>
      </div>
    </form>
  )
}
