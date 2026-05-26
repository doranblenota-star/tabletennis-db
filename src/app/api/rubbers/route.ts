import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const supabase = await createClient()

  let query = supabase.from('rubbers').select('id, name, rubber_type, manufacturer').order('name')

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
