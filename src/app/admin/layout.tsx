import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <Link href="/" className="text-lg font-extrabold text-blue-500">
            🏓 TableTennis DB
          </Link>
          <span className="text-sm text-gray-400">/</span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">管理画面</span>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-blue-500">ダッシュボード</Link>
            <Link href="/admin/players" className="text-sm text-gray-500 hover:text-blue-500">選手管理</Link>
            <Link href="/admin/equipment" className="text-sm text-gray-500 hover:text-blue-500">用具マスタ</Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </div>
    </div>
  )
}
