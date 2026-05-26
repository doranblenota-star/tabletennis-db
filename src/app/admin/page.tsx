import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: playerCount },
    { count: racketCount },
    { count: rubberCount },
    { data: recentScrapes },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('rackets').select('*', { count: 'exact', head: true }),
    supabase.from('rubbers').select('*', { count: 'exact', head: true }),
    supabase.from('data_sources').select('*').order('scraped_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: '選手数', value: playerCount ?? 0, href: '/admin/players' },
    { label: 'ラケット数', value: racketCount ?? 0, href: '/admin/equipment' },
    { label: 'ラバー数', value: rubberCount ?? 0, href: '/admin/equipment' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(s => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border bg-white p-6 shadow-xs transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">
              {s.value.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">最近のスクレイピング</h2>
          <ScrapeButton />
        </div>
        {(recentScrapes ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">まだ実行していません</p>
        ) : (
          <div className="space-y-2">
            {(recentScrapes ?? []).map((s: { id: string; category: string; status: string; player_count: number | null; scraped_at: string; error_log: string | null }) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                <span
                  className={`h-2 w-2 rounded-full ${
                    s.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{s.category}</span>
                <span className="text-xs text-gray-400">{s.player_count ?? 0}名</span>
                <span className="text-xs text-gray-400">
                  {new Date(s.scraped_at).toLocaleString('ja-JP')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ScrapeButton() {
  return (
    <form action="/api/admin/scrape" method="POST">
      <button
        type="submit"
        className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
      >
        今すぐ更新
      </button>
    </form>
  )
}
