import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  const { data: records } = await supabase
    .from('equipment_records')
    .select(`
      *,
      rackets ( id, name, manufacturer ),
      rubbers_fore:rubbers!equipment_records_rubber_fore_id_fkey ( id, name, rubber_type ),
      rubbers_back:rubbers!equipment_records_rubber_back_id_fkey ( id, name, rubber_type )
    `)
    .eq('player_id', id)
    .order('is_current', { ascending: false })
    .order('valid_from', { ascending: false })

  return NextResponse.json({ player, equipment_records: records ?? [] })
}
