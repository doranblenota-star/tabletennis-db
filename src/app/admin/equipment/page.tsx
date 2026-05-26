import { createClient } from '@/lib/supabase/server'

export default async function AdminEquipmentPage() {
  const supabase = await createClient()

  const [{ data: rackets }, { data: rubbers }] = await Promise.all([
    supabase.from('rackets').select('id, name, manufacturer').order('name').limit(200),
    supabase.from('rubbers').select('id, name, rubber_type, manufacturer').order('name').limit(200),
  ])

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用具マスタ</h1>

      <section>
        <h2 className="mb-4 text-base font-bold text-gray-700 dark:text-gray-200">
          ラケット（{(rackets ?? []).length}件）
        </h2>
        <div className="overflow-hidden rounded-2xl border bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">ラケット名</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">メーカー</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {(rackets ?? []).map((r: { id: string; name: string; manufacturer: string | null }) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.manufacturer ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-bold text-gray-700 dark:text-gray-200">
          ラバー（{(rubbers ?? []).length}件）
        </h2>
        <div className="overflow-hidden rounded-2xl border bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">ラバー名</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">種類</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">メーカー</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {(rubbers ?? []).map((r: { id: string; name: string; rubber_type: string | null; manufacturer: string | null }) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.rubber_type ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.manufacturer ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
