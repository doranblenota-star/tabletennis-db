/**
 * Supabase 接続テスト＆テーブル確認スクリプト
 * 使い方: npm run check-db
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/database.types'

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'

function ok(msg: string) { console.log(`  ${GREEN}✅ ${msg}${RESET}`) }
function warn(msg: string) { console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`) }
function fail(msg: string) { console.log(`  ${RED}❌ ${msg}${RESET}`) }
function info(msg: string) { console.log(`  ${DIM}   ${msg}${RESET}`) }

async function main() {
  console.log(`\n${BOLD}🏓 TableTennis DB — Supabase 接続テスト${RESET}`)
  console.log('─'.repeat(50))

  // ── 1. 環境変数チェック ────────────────────────────────────────────────
  console.log(`\n${CYAN}[1] 環境変数${RESET}`)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url)     { fail('NEXT_PUBLIC_SUPABASE_URL が未設定'); process.exit(1) }
  if (!anon)    { fail('NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定'); process.exit(1) }
  if (!service) { fail('SUPABASE_SERVICE_ROLE_KEY が未設定'); process.exit(1) }

  ok(`NEXT_PUBLIC_SUPABASE_URL: ${url}`)
  ok(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anon.slice(0, 20)}...`)
  ok(`SUPABASE_SERVICE_ROLE_KEY: ${service.slice(0, 20)}...`)

  // ── 2. 接続テスト (anon key) ────────────────────────────────────────────
  console.log(`\n${CYAN}[2] 接続テスト (anon key)${RESET}`)
  const anonClient = createClient<Database>(url, anon)
  try {
    const { error } = await anonClient.from('players').select('id').limit(1)
    if (error) throw error
    ok('anon key で players テーブルに接続成功')
  } catch (e) {
    fail(`接続失敗: ${(e as Error).message}`)
    info('→ .env.local の値を確認してください')
    process.exit(1)
  }

  // ── 3. 接続テスト (service role) ────────────────────────────────────────
  console.log(`\n${CYAN}[3] 接続テスト (service_role key)${RESET}`)
  const serviceClient = createClient<Database>(url, service)
  try {
    const { error } = await serviceClient.from('players').select('id').limit(1)
    if (error) throw error
    ok('service_role key で接続成功')
  } catch (e) {
    fail(`接続失敗: ${(e as Error).message}`)
    process.exit(1)
  }

  // ── 4. テーブル存在確認 ───────────────────────────────────────────────────
  console.log(`\n${CYAN}[4] テーブル確認${RESET}`)
  const tables = ['players', 'rackets', 'rubbers', 'equipment_records', 'data_sources'] as const

  for (const table of tables) {
    try {
      const { error } = await serviceClient.from(table).select('id').limit(0)
      if (error) throw error
      ok(`${table}`)
    } catch (e) {
      fail(`${table}: ${(e as Error).message}`)
    }
  }

  // ── 5. RLS ポリシー確認 ──────────────────────────────────────────────────
  console.log(`\n${CYAN}[5] RLS 公開読み取りポリシー確認${RESET}`)
  for (const table of ['players', 'rackets', 'rubbers', 'equipment_records'] as const) {
    try {
      const { error } = await anonClient.from(table).select('id').limit(1)
      if (error) throw error
      ok(`${table} — anon で読み取り可能`)
    } catch (e) {
      warn(`${table} — 読み取り不可 (${(e as Error).message})`)
      info('→ RLS ポリシーが未設定の可能性があります')
    }
  }

  // ── 6. レコード件数 ──────────────────────────────────────────────────────
  console.log(`\n${CYAN}[6] データ件数${RESET}`)
  const counts: Record<string, number> = {}

  for (const table of tables) {
    const { count } = await serviceClient
      .from(table)
      .select('*', { count: 'exact', head: true })
    counts[table] = count ?? 0
  }

  const colW = 20
  console.log(`\n  ${'テーブル'.padEnd(colW)}件数`)
  console.log(`  ${'─'.repeat(30)}`)
  for (const [table, count] of Object.entries(counts)) {
    const hasData = count > 0
    const icon = hasData ? GREEN + '●' : YELLOW + '○'
    console.log(`  ${icon} ${RESET}${table.padEnd(colW)}${BOLD}${count.toLocaleString()}${RESET}`)
  }

  const totalPlayers = counts['players'] ?? 0
  if (totalPlayers === 0) {
    console.log(`\n${YELLOW}  ℹ️  データが未投入です。次を実行してください:${RESET}`)
    console.log(`${DIM}  npm run scrape${RESET}`)
  } else {
    console.log(`\n${GREEN}  ✅ データが投入済みです${RESET}`)
  }

  console.log(`\n${'─'.repeat(50)}\n`)
}

main().catch(err => {
  console.error(`\n${RED}Fatal:${RESET}`, err)
  process.exit(1)
})
