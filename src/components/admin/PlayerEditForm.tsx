'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Player } from '@/lib/types'

interface Props {
  player: Player | null
}

const CATEGORIES = [
  { value: 'japan_men', label: '日本男子' },
  { value: 'world_men', label: '世界男子' },
  { value: 'japan_women', label: '日本女子' },
  { value: 'world_women', label: '世界女子' },
]

export default function PlayerEditForm({ player }: Props) {
  const router = useRouter()
  const isNew = !player

  const [form, setForm] = useState({
    name_ja: player?.name_ja ?? '',
    name_en: player?.name_en ?? '',
    gender: player?.gender ?? 'male',
    nationality: player?.nationality ?? '',
    world_ranking: player?.world_ranking?.toString() ?? '',
    category: player?.category ?? 'japan_men',
    is_active: player?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      name_ja: form.name_ja,
      name_en: form.name_en || null,
      gender: form.gender,
      nationality: form.nationality || null,
      world_ranking: form.world_ranking ? parseInt(form.world_ranking) : null,
      category: form.category,
      is_active: form.is_active,
    }

    const { error: err } = isNew
      ? await supabase.from('players').insert(payload)
      : await supabase.from('players').update(payload).eq('id', player.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push('/admin/players')
    router.refresh()
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
  const labelClass = 'block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>選手名（日本語） *</label>
          <input
            className={inputClass}
            value={form.name_ja}
            onChange={e => update('name_ja', e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>選手名（英語）</label>
          <input
            className={inputClass}
            value={form.name_en}
            onChange={e => update('name_en', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>カテゴリ *</label>
          <select
            className={inputClass}
            value={form.category}
            onChange={e => update('category', e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>世界ランキング</label>
          <input
            className={inputClass}
            type="number"
            min="1"
            value={form.world_ranking}
            onChange={e => update('world_ranking', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>国籍</label>
          <input
            className={inputClass}
            value={form.nationality}
            onChange={e => update('nationality', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            id="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={e => update('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
            アクティブ
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? '保存中...' : isNew ? '追加する' : '保存する'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
