import { Suspense } from 'react'
import SearchBar from '@/components/search/SearchBar'
import SearchTabs from '@/components/search/SearchTabs'
import PlayerCard from '@/components/player/PlayerCard'
import UserList from '@/components/equipment/UserList'
import Link from 'next/link'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; current_only?: string; gender?: string }>
}

async function SearchResults({
  q,
  type,
  currentOnly,
  gender,
}: {
  q: string
  type: string
  currentOnly: boolean
  gender: string
}) {
  const params = new URLSearchParams({ q, type, gender })
  if (currentOnly) params.set('current_only', 'true')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/search?${params}`, { next: { revalidate: 300 } })

  if (!res.ok) return <p className="text-red-500">検索中にエラーが発生しました</p>

  const data = await res.json()
  const { players, rackets, rubbers } = data

  const total = players.length + rackets.length + rubbers.length

  if (total === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">「{q}」に一致する結果が見つかりませんでした</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {(type === 'all' || type === 'player') && players.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
            選手 <span className="text-sm font-normal text-gray-400">({players.length}件)</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {players.map((p: Parameters<typeof PlayerCard>[0]['player']) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        </section>
      )}

      {(type === 'all' || type === 'racket') && rackets.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
            ラケット <span className="text-sm font-normal text-gray-400">({rackets.length}件)</span>
          </h2>
          <div className="space-y-4">
            {rackets.map((r: { id: string; name: string; manufacturer?: string; current_users: Parameters<typeof UserList>[0]['users']; past_users: Parameters<typeof UserList>[0]['users'] }) => (
              <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center gap-2">
                  <Link
                    href={`/equipment/rackets/${r.id}`}
                    className="text-base font-bold text-gray-900 hover:text-blue-600 dark:text-white"
                  >
                    {r.name}
                  </Link>
                  {r.manufacturer && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700">
                      {r.manufacturer}
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <UserList users={r.current_users} label="現在使用者" />
                  <UserList users={r.past_users} label="過去使用者" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(type === 'all' || type === 'rubber') && rubbers.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
            ラバー <span className="text-sm font-normal text-gray-400">({rubbers.length}件)</span>
          </h2>
          <div className="space-y-4">
            {rubbers.map((r: { id: string; name: string; rubber_type?: string; manufacturer?: string; current_users: Parameters<typeof UserList>[0]['users']; past_users: Parameters<typeof UserList>[0]['users'] }) => (
              <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center gap-2">
                  <Link
                    href={`/equipment/rubbers/${r.id}`}
                    className="text-base font-bold text-gray-900 hover:text-blue-600 dark:text-white"
                  >
                    {r.name}
                  </Link>
                  {r.manufacturer && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700">
                      {r.manufacturer}
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <UserList users={r.current_users} label="現在使用者" />
                  <UserList users={r.past_users} label="過去使用者" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const q = params.q ?? ''
  const type = params.type ?? 'all'
  const currentOnly = params.current_only === 'true'
  const gender = params.gender ?? 'all'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 検索ヘッダー */}
      <div className="border-b border-gray-200 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-extrabold text-blue-500">
              🏓
            </Link>
            <div className="flex-1">
              <SearchBar defaultValue={q} />
            </div>
          </div>
          <Suspense>
            <SearchTabs current={type} query={q} />
          </Suspense>
        </div>
      </div>

      {/* 検索結果 */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {q ? (
          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-400">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="mt-3 text-sm">検索中...</p>
              </div>
            }
          >
            <SearchResults q={q} type={type} currentOnly={currentOnly} gender={gender} />
          </Suspense>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">
            選手名、ラケット名、またはラバー名を入力してください
          </p>
        )}
      </div>
    </div>
  )
}
