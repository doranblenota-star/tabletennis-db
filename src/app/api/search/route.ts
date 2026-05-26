import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const type = searchParams.get('type') || 'all'
  const currentOnly = searchParams.get('current_only') === 'true'
  const gender = searchParams.get('gender') || 'all'
  const side = searchParams.get('side') || 'both'

  // TODO: 一時的な env チェック — 確認後に削除
  console.log('[search] env check:', {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!q || q.length < 1) {
    return NextResponse.json({ players: [], rackets: [], rubbers: [] })
  }

  const supabase = await createClient()
  const pattern = `%${q}%`

  const [playersRes, racketsRes, rubbersRes] = await Promise.all([
    type === 'all' || type === 'player'
      ? supabase
          .from('players')
          .select(`
            id, name_ja, name_en, gender, nationality, world_ranking, category,
            equipment_records!inner (
              id, racket_id, rubber_fore_id, rubber_back_id,
              racket_raw, rubber_fore_raw, rubber_back_raw,
              rubber_fore_thickness, rubber_back_thickness,
              is_current, valid_from, valid_to,
              rackets ( id, name, manufacturer ),
              rubbers_fore:rubbers!equipment_records_rubber_fore_id_fkey ( id, name ),
              rubbers_back:rubbers!equipment_records_rubber_back_id_fkey ( id, name )
            )
          `)
          .or(`name_ja.ilike.${pattern},name_en.ilike.${pattern}`)
          .eq('equipment_records.is_current', true)
          .match(gender !== 'all' ? { gender } : {})
          .limit(20)
      : Promise.resolve({ data: [], error: null }),

    type === 'all' || type === 'racket'
      ? supabase
          .from('rackets')
          .select('id, name, manufacturer')
          .ilike('name', pattern)
          .limit(10)
      : Promise.resolve({ data: [], error: null }),

    type === 'all' || type === 'rubber'
      ? supabase
          .from('rubbers')
          .select('id, name, rubber_type, manufacturer')
          .ilike('name', pattern)
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ])

  // TODO: 一時的な Supabase エラーチェック — 確認後に削除
  if (rubbersRes.error) console.error('[search] rubbers query error:', rubbersRes.error.message, rubbersRes.error.code)

  // ラケット・ラバーの使用選手を取得
  const racketIds = (racketsRes.data ?? []).map((r: { id: string }) => r.id)
  const rubberIds = (rubbersRes.data ?? []).map((r: { id: string }) => r.id)

  const [racketUsersRes, rubberForeUsersRes, rubberBackUsersRes] = await Promise.all([
    racketIds.length > 0
      ? supabase
          .from('equipment_records')
          .select(`
            racket_id, is_current, valid_from, valid_to,
            players ( id, name_ja, name_en, world_ranking, gender )
          `)
          .in('racket_id', racketIds)
          .match(currentOnly ? { is_current: true } : {})
          .order('valid_from', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),

    rubberIds.length > 0
      ? supabase
          .from('equipment_records')
          .select(`
            rubber_fore_id, rubber_fore_thickness, is_current, valid_from, valid_to,
            players ( id, name_ja, name_en, world_ranking, gender )
          `)
          .in('rubber_fore_id', rubberIds)
          .match(currentOnly ? { is_current: true } : {})
          .order('valid_from', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),

    rubberIds.length > 0 && (side === 'both' || side === 'back')
      ? supabase
          .from('equipment_records')
          .select(`
            rubber_back_id, rubber_back_thickness, is_current, valid_from, valid_to,
            players ( id, name_ja, name_en, world_ranking, gender )
          `)
          .in('rubber_back_id', rubberIds)
          .match(currentOnly ? { is_current: true } : {})
          .order('valid_from', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ])

  // TODO: 一時的な Supabase エラーチェック — 確認後に削除
  if (rubberForeUsersRes.error) console.error('[search] rubberForeUsers query error:', rubberForeUsersRes.error.message, rubberForeUsersRes.error.code)
  if (rubberBackUsersRes.error) console.error('[search] rubberBackUsers query error:', rubberBackUsersRes.error.message, rubberBackUsersRes.error.code)

  // ラケット結果を組み立て
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rackets = (racketsRes.data ?? []).map((racket: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = (racketUsersRes.data ?? []).filter((u: any) => u.racket_id === racket.id)
    return {
      ...racket,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current_users: users.filter((u: any) => u.is_current).map((u: any) => ({
        player_id: u.players.id,
        name_ja: u.players.name_ja,
        name_en: u.players.name_en,
        world_ranking: u.players.world_ranking,
        gender: u.players.gender,
        valid_from: u.valid_from,
        valid_to: u.valid_to,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      past_users: users.filter((u: any) => !u.is_current).map((u: any) => ({
        player_id: u.players.id,
        name_ja: u.players.name_ja,
        name_en: u.players.name_en,
        world_ranking: u.players.world_ranking,
        gender: u.players.gender,
        valid_from: u.valid_from,
        valid_to: u.valid_to,
      })),
    }
  })

  // ラバー結果を組み立て
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rubbers = (rubbersRes.data ?? []).map((rubber: any) => {
    const foreUsers = (side === 'both' || side === 'fore')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (rubberForeUsersRes.data ?? []).filter((u: any) => u.rubber_fore_id === rubber.id)
      : []
    const backUsers = (side === 'both' || side === 'back')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (rubberBackUsersRes.data ?? []).filter((u: any) => u.rubber_back_id === rubber.id)
      : []

    const toUserEntry = (u: Record<string, unknown>, s: 'fore' | 'back') => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      player_id: (u.players as any).id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name_ja: (u.players as any).name_ja,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name_en: (u.players as any).name_en,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world_ranking: (u.players as any).world_ranking,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gender: (u.players as any).gender,
      side: s,
      thickness: s === 'fore' ? u.rubber_fore_thickness : u.rubber_back_thickness,
      valid_from: u.valid_from,
      valid_to: u.valid_to,
    })

    const allCurrentUsers = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...foreUsers.filter((u: any) => u.is_current).map((u: Record<string, unknown>) => toUserEntry(u, 'fore')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...backUsers.filter((u: any) => u.is_current).map((u: Record<string, unknown>) => toUserEntry(u, 'back')),
    ]
    const allPastUsers = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...foreUsers.filter((u: any) => !u.is_current).map((u: Record<string, unknown>) => toUserEntry(u, 'fore')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...backUsers.filter((u: any) => !u.is_current).map((u: Record<string, unknown>) => toUserEntry(u, 'back')),
    ]

    return {
      ...rubber,
      current_users: allCurrentUsers,
      past_users: allPastUsers,
    }
  })

  return NextResponse.json({
    players: playersRes.data ?? [],
    rackets,
    rubbers,
  })
}
