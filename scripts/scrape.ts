/**
 * yarilog.com から卓球選手用具データをスクレイピングし Supabase に投入するスクリプト
 *
 * 使い方:
 *   npm run scrape                         # 全カテゴリ投入
 *   npm run scrape -- --dry-run            # DB 書き込みなしで動作確認
 *   npm run scrape -- --category japan_men # 特定カテゴリのみ
 *   npm run scrape -- --category japan_men world_men
 */

import { runScraper, fetchPage, SCRAPE_TARGETS } from '../src/lib/scraper/index'
import { parseYarilogPage } from '../src/lib/scraper/parser'
import type { Category } from '../src/lib/types'

// ─── CLI 引数パース ──────────────────────────────────────────────────────────

const args = process.argv.slice(2)

const isDryRun = args.includes('--dry-run')

const categoryIndex = args.indexOf('--category')
let selectedCategories: Category[] | undefined
if (categoryIndex !== -1) {
  const cats: string[] = []
  for (let i = categoryIndex + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) break
    cats.push(args[i])
  }
  const validCategories: Category[] = ['japan_men', 'world_men', 'japan_women', 'world_women']
  const invalid = cats.filter(c => !validCategories.includes(c as Category))
  if (invalid.length > 0) {
    console.error(`❌ 無効なカテゴリ: ${invalid.join(', ')}`)
    console.error(`   有効値: ${validCategories.join(', ')}`)
    process.exit(1)
  }
  selectedCategories = cats as Category[]
}

// ─── 環境変数チェック ────────────────────────────────────────────────────────

function checkEnv() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length > 0) {
    console.error('❌ 環境変数が未設定です:')
    missing.forEach(k => console.error(`   ${k}`))
    console.error('\n   .env.local を作成してください (.env.local.example を参照)')
    process.exit(1)
  }
}

// ─── 表示ユーティリティ ──────────────────────────────────────────────────────

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RED = '\x1b[31m'
const DIM = '\x1b[2m'

function clearLine() {
  process.stdout.write('\r\x1b[K')
}

function progressBar(current: number, total: number, width = 20): string {
  if (total === 0) return ''.padEnd(width, '─')
  const filled = Math.round((current / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ─── プレビューモード（--dry-run） ───────────────────────────────────────────

async function runPreview(categories?: Category[]) {
  console.log(`\n${BOLD}${YELLOW}🔍 DRY RUN モード — DB への書き込みは行いません${RESET}\n`)

  const targets = categories
    ? SCRAPE_TARGETS.filter(t => categories.includes(t.category))
    : SCRAPE_TARGETS

  for (const target of targets) {
    console.log(`${CYAN}📄 ${target.label}${RESET}  ${DIM}${target.url}${RESET}`)
    try {
      const html = await fetchPage(target.url)
      const players = parseYarilogPage(html, target.url)

      console.log(`   選手数: ${BOLD}${players.length}${RESET}名`)

      const withHistory = players.filter(p => p.history.length > 0)
      console.log(`   遍歴あり: ${withHistory.length}名`)

      // ラケット・ラバーのユニーク数
      const rackets = new Set<string>()
      const rubbers = new Set<string>()
      for (const p of players) {
        if (p.current.racket_raw) rackets.add(p.current.racket_raw)
        if (p.current.rubber_fore_raw) rubbers.add(p.current.rubber_fore_raw)
        if (p.current.rubber_back_raw) rubbers.add(p.current.rubber_back_raw)
        for (const h of p.history) {
          if (h.racket_raw) rackets.add(h.racket_raw)
          if (h.rubber_fore_raw) rubbers.add(h.rubber_fore_raw)
          if (h.rubber_back_raw) rubbers.add(h.rubber_back_raw)
        }
      }
      console.log(`   ラケット（ユニーク）: ${rackets.size}種`)
      console.log(`   ラバー（ユニーク）: ${rubbers.size}種`)

      // サンプル表示（最初の5名）
      console.log(`\n   ${DIM}── サンプル（先頭5名） ──${RESET}`)
      for (const p of players.slice(0, 5)) {
        const wr = p.world_ranking ? ` WR${p.world_ranking}` : ''
        console.log(`   ${BOLD}${p.name_ja}${RESET}${wr}`)
        if (p.current.racket_raw)     console.log(`     R: ${p.current.racket_raw}`)
        if (p.current.rubber_fore_raw) console.log(`     F: ${p.current.rubber_fore_raw}`)
        if (p.current.rubber_back_raw) console.log(`     B: ${p.current.rubber_back_raw}`)
        if (p.history.length > 0) {
          console.log(`     ${DIM}用具遍歴: ${p.history.length}件${RESET}`)
        }
      }
      console.log()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`   ${RED}❌ エラー: ${msg}${RESET}\n`)
    }
  }
}

// ─── メイン ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}🏓 TableTennis DB — データ投入スクリプト${RESET}`)
  console.log(`${'─'.repeat(50)}`)

  if (isDryRun) {
    await runPreview(selectedCategories)
    process.exit(0)
  }

  checkEnv()

  const targetLabels = selectedCategories
    ? SCRAPE_TARGETS.filter(t => selectedCategories!.includes(t.category)).map(t => t.label)
    : SCRAPE_TARGETS.map(t => t.label)

  console.log(`\n対象カテゴリ: ${CYAN}${targetLabels.join('、')}${RESET}`)
  console.log(`Supabase URL: ${DIM}${process.env.NEXT_PUBLIC_SUPABASE_URL}${RESET}\n`)

  let currentCategoryLabel = ''
  let lastProgressLine = ''

  const result = await runScraper({
    categories: selectedCategories,
    dryRun: false,
    onProgress({ label, playerIndex, playerTotal, playerName }) {
      if (label !== currentCategoryLabel) {
        if (lastProgressLine) {
          clearLine()
        }
        console.log(`\n${CYAN}📂 ${label}${RESET}`)
        currentCategoryLabel = label
      }

      const bar = progressBar(playerIndex, playerTotal)
      const pct = playerTotal > 0 ? Math.round((playerIndex / playerTotal) * 100) : 0
      const line = `  [${bar}] ${pct}% (${playerIndex + 1}/${playerTotal}) ${playerName}`
      clearLine()
      process.stdout.write(line)
      lastProgressLine = line
    },
  })

  // 最後の進捗行をクリア
  if (lastProgressLine) {
    clearLine()
  }

  // ─── 結果サマリー ────────────────────────────────────────────────────────

  console.log(`\n${BOLD}${'─'.repeat(50)}`)
  console.log(`📊 結果サマリー`)
  console.log(`${'─'.repeat(50)}${RESET}\n`)

  let totalPlayers = 0
  let totalInserted = 0
  let totalSkipped = 0
  let hasError = false

  for (const r of result.results) {
    const icon = r.error ? RED + '❌' : GREEN + '✅'
    console.log(`${icon} ${BOLD}${r.label}${RESET}${RESET}`)
    if (r.error) {
      console.log(`   ${RED}エラー: ${r.error}${RESET}`)
      hasError = true
    } else {
      console.log(`   選手数:         ${BOLD}${r.playerCount}${RESET} 名`)
      console.log(`   投入レコード:   ${GREEN}${r.insertedRecords}${RESET} 件`)
      console.log(`   スキップ:       ${DIM}${r.skippedRecords}${RESET} 件`)
      console.log(`   処理時間:       ${formatDuration(r.durationMs)}`)
    }
    console.log()
    totalPlayers += r.playerCount
    totalInserted += r.insertedRecords
    totalSkipped += r.skippedRecords
  }

  console.log(`${BOLD}${'─'.repeat(50)}${RESET}`)
  console.log(`合計選手数:       ${BOLD}${totalPlayers}${RESET} 名`)
  console.log(`合計投入レコード: ${GREEN}${BOLD}${totalInserted}${RESET} 件`)
  console.log(`合計スキップ:     ${DIM}${totalSkipped}${RESET} 件`)
  console.log(`${BOLD}${'─'.repeat(50)}${RESET}\n`)

  if (hasError) {
    console.log(`${YELLOW}⚠️  一部のカテゴリでエラーが発生しました${RESET}\n`)
    process.exit(1)
  } else {
    console.log(`${GREEN}${BOLD}✅ データ投入が完了しました${RESET}\n`)
  }
}

main().catch(err => {
  console.error(`\n${RED}${BOLD}Fatal error:${RESET}`, err)
  process.exit(1)
})
