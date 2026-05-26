import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlayerEditForm from '@/components/admin/PlayerEditForm'
import type { Player } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminPlayerEditPage({ params }: Props) {
  const { id } = await params

  if (id === 'new') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">選手追加</h1>
        <PlayerEditForm player={null} />
      </div>
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const player = data as unknown as Player

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        選手編集: {player.name_ja}
      </h1>
      <PlayerEditForm player={player} />
    </div>
  )
}
