import SearchBar from '@/components/search/SearchBar'
import Link from 'next/link'

const POPULAR_SEARCHES = [
  { label: 'ザイア03', type: 'rubber' },
  { label: 'テナジー05', type: 'rubber' },
  { label: 'ディグニクス09C', type: 'rubber' },
  { label: '張本智和', type: 'player' },
  { label: '早田ひな', type: 'player' },
  { label: 'ビスカリア', type: 'racket' },
]

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-2xl space-y-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            🏓 TableTennis DB
          </h1>
          <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
            卓球選手の使用用具を検索・比較できるデータベース
          </p>
        </div>

        <SearchBar autoFocus />

        <div>
          <p className="mb-3 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
            人気の検索
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.map(s => (
              <Link
                key={s.label}
                href={`/search?q=${encodeURIComponent(s.label)}&type=${s.type}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 shadow-xs transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
