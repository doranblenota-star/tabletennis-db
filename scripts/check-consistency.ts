/**
 * supabase/migrations/001_initial_schema.sql と
 * src/lib/supabase/database.types.ts の整合性を検証するスクリプト
 *
 * 使い方: npx tsx scripts/check-consistency.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const SQL_PATH = path.join(ROOT, 'supabase/migrations/001_initial_schema.sql')
const TYPES_PATH = path.join(ROOT, 'src/lib/supabase/database.types.ts')

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'

type Severity = 'ok' | 'warn' | 'error'

interface CheckResult {
  severity: Severity
  table: string
  column: string
  message: string
}

// ─── SQL パーサー（簡易） ─────────────────────────────────────────────────────

interface SqlColumn {
  name: string
  pgType: string
  nullable: boolean
  hasDefault: boolean
  checkValues?: string[]
}

interface SqlTable {
  name: string
  columns: SqlColumn[]
}

function parseSqlTables(sql: string): SqlTable[] {
  const tables: SqlTable[] = []
  // CREATE TABLE xxx (...) の中身を取り出す
  const tableRe = /CREATE\s+TABLE\s+(\w+)\s*\(([^;]+?)\);/gi
  let m: RegExpExecArray | null

  while ((m = tableRe.exec(sql)) !== null) {
    const tableName = m[1].toLowerCase()
    const body = m[2]
    const columns = parseSqlColumns(body)
    tables.push({ name: tableName, columns })
  }
  return tables
}

function parseSqlColumns(body: string): SqlColumn[] {
  const cols: SqlColumn[] = []

  // 行ごとに分割（カンマ区切り、ただし括弧内は無視）
  const lines = splitColDefs(body)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // テーブル制約（PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK...）はスキップ
    if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(trimmed)) continue

    const colMatch = trimmed.match(/^(\w+)\s+(.+)$/i)
    if (!colMatch) continue

    const colName = colMatch[1].toLowerCase()
    const rest = colMatch[2]

    // 型を取り出す
    const pgType = extractPgType(rest)
    const nullable = !rest.toUpperCase().includes('NOT NULL')
    const hasDefault = rest.toUpperCase().includes('DEFAULT')

    // CHECK IN (...) の値を取り出す
    const checkMatch = rest.match(/CHECK\s*\(\s*\w+\s+IN\s*\(([^)]+)\)\s*\)/i)
    let checkValues: string[] | undefined
    if (checkMatch) {
      checkValues = checkMatch[1]
        .split(',')
        .map(v => v.trim().replace(/^['"]|['"]$/g, ''))
    }

    cols.push({ name: colName, pgType, nullable, hasDefault, checkValues })
  }
  return cols
}

function extractPgType(def: string): string {
  // UUID, TEXT, INT, BOOLEAN, TIMESTAMPTZ, DATE などを取り出す
  const m = def.match(/^(UUID|TEXT|INT|INTEGER|BOOLEAN|BOOL|TIMESTAMPTZ|TIMESTAMP|DATE|BIGINT|JSONB)\b/i)
  return m ? m[1].toUpperCase() : 'UNKNOWN'
}

function splitColDefs(body: string): string[] {
  const result: string[] = []
  let depth = 0
  let current = ''

  for (const ch of body) {
    if (ch === '(') { depth++; current += ch }
    else if (ch === ')') { depth--; current += ch }
    else if (ch === ',' && depth === 0) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) result.push(current.trim())
  return result
}

// ─── TypeScript 型パーサー（簡易） ────────────────────────────────────────────

interface TsColumn {
  name: string
  tsType: string
  nullable: boolean
  optional: boolean
}

interface TsTable {
  name: string
  row: TsColumn[]
  insert: TsColumn[]
  update: TsColumn[]
}

function extractBalancedBlock(src: string, openBracePos: number): string | null {
  let depth = 0
  let start = -1
  for (let i = openBracePos; i < src.length; i++) {
    if (src[i] === '{') {
      if (depth === 0) start = i
      depth++
    } else if (src[i] === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        return src.slice(start + 1, i)
      }
    }
  }
  return null
}

function extractNamedBlock(src: string, name: string): string | null {
  const re = new RegExp(`\\b${name}:\\s*\\{`)
  const m = re.exec(src)
  if (!m || m.index === undefined) return null
  return extractBalancedBlock(src, m.index + m[0].length - 1)
}

function parseTsTypes(src: string): TsTable[] {
  const tables: TsTable[] = []

  // Tables: { ... } ブロックを取り出す (Database.public.Tables の中)
  const tablesMatch = /\bTables:\s*\{/.exec(src)
  if (!tablesMatch || tablesMatch.index === undefined) return tables

  const tablesInner = extractBalancedBlock(src, tablesMatch.index + tablesMatch[0].length - 1)
  if (!tablesInner) return tables

  // Tables ブロック内のトップレベルエントリを1つずつ解析
  let i = 0
  while (i < tablesInner.length) {
    while (i < tablesInner.length && /\s/.test(tablesInner[i])) i++
    if (i >= tablesInner.length) break

    const nameMatch = /^(\w+)\s*:\s*/.exec(tablesInner.slice(i))
    if (!nameMatch) { i++; continue }

    const tableName = nameMatch[1].toLowerCase()
    i += nameMatch[0].length

    while (i < tablesInner.length && tablesInner[i] !== '{') i++
    if (i >= tablesInner.length) break

    const tableContent = extractBalancedBlock(tablesInner, i)
    if (!tableContent) break

    const rowContent    = extractNamedBlock(tableContent, 'Row')
    const insertContent = extractNamedBlock(tableContent, 'Insert')
    const updateContent = extractNamedBlock(tableContent, 'Update')

    if (rowContent && insertContent && updateContent) {
      tables.push({
        name: tableName,
        row:    parseTsBlock(rowContent),
        insert: parseTsBlock(insertContent),
        update: parseTsBlock(updateContent),
      })
    }

    // このテーブルのブロックを読み飛ばす
    let depth = 0
    while (i < tablesInner.length) {
      if (tablesInner[i] === '{') depth++
      else if (tablesInner[i] === '}') { depth--; if (depth === 0) { i++; break } }
      i++
    }
  }

  return tables
}

function parseTsBlock(block: string): TsColumn[] {
  const cols: TsColumn[] = []
  const lineRe = /(\w+)(\??):\s*([^\n]+)/g
  let m: RegExpExecArray | null

  while ((m = lineRe.exec(block)) !== null) {
    const name = m[1]
    const optional = m[2] === '?'
    const rawType = m[3].trim().replace(/,$/, '')
    const nullable = rawType.includes('null')
    cols.push({ name, tsType: rawType, nullable, optional })
  }
  return cols
}

// ─── 整合性チェック ───────────────────────────────────────────────────────────

// PostgreSQL 型 → TypeScript 型の対応
const PG_TO_TS: Record<string, string[]> = {
  UUID:        ['string'],
  TEXT:        ['string'],
  INT:         ['number'],
  INTEGER:     ['number'],
  BIGINT:      ['number'],
  BOOLEAN:     ['boolean'],
  BOOL:        ['boolean'],
  TIMESTAMPTZ: ['string'],
  TIMESTAMP:   ['string'],
  DATE:        ['string'],
  JSONB:       ['Json', 'Record<string, unknown>'],
}

function checkConsistency(sqlTables: SqlTable[], tsTables: TsTable[]): CheckResult[] {
  const results: CheckResult[] = []

  for (const sqlTable of sqlTables) {
    const tsTable = tsTables.find(t => t.name === sqlTable.name)
    if (!tsTable) {
      results.push({
        severity: 'error',
        table: sqlTable.name,
        column: '—',
        message: `テーブル "${sqlTable.name}" が database.types.ts に存在しない`,
      })
      continue
    }

    for (const sqlCol of sqlTable.columns) {
      const tsCol = tsTable.row.find(c => c.name === sqlCol.name)
      if (!tsCol) {
        results.push({
          severity: 'error',
          table: sqlTable.name,
          column: sqlCol.name,
          message: `カラム "${sqlCol.name}" が Row 型に存在しない`,
        })
        continue
      }

      // NULL 整合性チェック
      if (sqlCol.nullable && !tsCol.nullable && !sqlCol.hasDefault) {
        results.push({
          severity: 'warn',
          table: sqlTable.name,
          column: sqlCol.name,
          message: `SQL は nullable だが TS 型に "| null" がない`,
        })
      }
      if (!sqlCol.nullable && tsCol.nullable && !['created_at','updated_at'].includes(sqlCol.name)) {
        results.push({
          severity: 'warn',
          table: sqlTable.name,
          column: sqlCol.name,
          message: `SQL は NOT NULL だが TS 型が nullable`,
        })
      }

      // 型互換性チェック
      // TS が string literal union の場合は TEXT/UUID/TIMESTAMPTZ 等と互換とみなす
      const isStringLiteralUnion = /^('[\w_]+'(\s*\|\s*'[\w_]+')*(\s*\|\s*null)?)$/.test(tsCol.tsType.trim())
      const expected = PG_TO_TS[sqlCol.pgType]
      if (expected && !isStringLiteralUnion && !expected.some(e => tsCol.tsType.includes(e))) {
        results.push({
          severity: 'warn',
          table: sqlTable.name,
          column: sqlCol.name,
          message: `型不一致: SQL=${sqlCol.pgType} → 期待 "${expected.join('|')}", TS="${tsCol.tsType}"`,
        })
      }

      // CHECK IN 値 vs TS union 型チェック
      if (sqlCol.checkValues) {
        for (const val of sqlCol.checkValues) {
          if (!tsCol.tsType.includes(`'${val}'`)) {
            results.push({
              severity: 'warn',
              table: sqlTable.name,
              column: sqlCol.name,
              message: `CHECK 値 '${val}' が TS union 型 "${tsCol.tsType}" に含まれていない可能性`,
            })
          }
        }
      }

      // 問題なし
      const noIssue = !results.find(r => r.table === sqlTable.name && r.column === sqlCol.name)
      if (noIssue) {
        results.push({
          severity: 'ok',
          table: sqlTable.name,
          column: sqlCol.name,
          message: '一致',
        })
      }
    }

    // TS に余分なカラムがないか
    for (const tsCol of tsTable.row) {
      const sqlCol = sqlTable.columns.find(c => c.name === tsCol.name)
      if (!sqlCol) {
        results.push({
          severity: 'warn',
          table: sqlTable.name,
          column: tsCol.name,
          message: `TS Row に "${tsCol.name}" があるが SQL テーブルに存在しない`,
        })
      }
    }
  }

  // TS にしかないテーブル
  for (const tsTable of tsTables) {
    if (!sqlTables.find(t => t.name === tsTable.name)) {
      results.push({
        severity: 'warn',
        table: tsTable.name,
        column: '—',
        message: `database.types.ts にテーブル "${tsTable.name}" があるが SQL に存在しない`,
      })
    }
  }

  return results
}

// ─── メイン ──────────────────────────────────────────────────────────────────

function main() {
  console.log(`\n${BOLD}🔍 整合性チェック: migration SQL ↔ database.types.ts${RESET}`)
  console.log('─'.repeat(60))

  // ファイル読み込み
  if (!fs.existsSync(SQL_PATH)) {
    console.error(`${RED}❌ Not found: ${SQL_PATH}${RESET}`)
    process.exit(1)
  }
  if (!fs.existsSync(TYPES_PATH)) {
    console.error(`${RED}❌ Not found: ${TYPES_PATH}${RESET}`)
    process.exit(1)
  }

  const sqlSrc = fs.readFileSync(SQL_PATH, 'utf-8')
  const tsSrc  = fs.readFileSync(TYPES_PATH, 'utf-8')

  const sqlTables = parseSqlTables(sqlSrc)
  const tsTables  = parseTsTypes(tsSrc)

  console.log(`\n${CYAN}検出テーブル:${RESET}`)
  console.log(`  SQL:           ${sqlTables.map(t => t.name).join(', ')}`)
  console.log(`  database.types: ${tsTables.map(t => t.name).join(', ')}`)

  const results = checkConsistency(sqlTables, tsTables)

  // テーブルごとに表示
  const tables = [...new Set(results.map(r => r.table))]
  let errorCount = 0
  let warnCount = 0

  for (const table of tables) {
    const tableResults = results.filter(r => r.table === table)
    const hasError = tableResults.some(r => r.severity === 'error')
    const hasWarn  = tableResults.some(r => r.severity === 'warn')

    const icon = hasError ? `${RED}❌` : hasWarn ? `${YELLOW}⚠️ ` : `${GREEN}✅`
    console.log(`\n${icon}  ${BOLD}${table}${RESET}`)

    for (const r of tableResults) {
      if (r.severity === 'ok') {
        console.log(`  ${DIM}  ✓ ${r.column}${RESET}`)
      } else if (r.severity === 'warn') {
        console.log(`  ${YELLOW}  ⚠  ${r.column}: ${r.message}${RESET}`)
        warnCount++
      } else {
        console.log(`  ${RED}  ✗  ${r.column}: ${r.message}${RESET}`)
        errorCount++
      }
    }
  }

  // サマリー
  console.log(`\n${'─'.repeat(60)}`)
  if (errorCount === 0 && warnCount === 0) {
    console.log(`${GREEN}${BOLD}✅ 整合性チェック OK — エラー・警告なし${RESET}`)
  } else {
    if (errorCount > 0) console.log(`${RED}  ❌ エラー: ${errorCount}件${RESET}`)
    if (warnCount > 0)  console.log(`${YELLOW}  ⚠️  警告: ${warnCount}件${RESET}`)
  }

  // play_style の特記事項
  console.log(`\n${DIM}注: play_style は SQL に CHECK 制約がありますが、`)
  console.log(`  database.types.ts では "string | null" と定義されています。`)
  console.log(`  実用上の問題はありませんが、supabase gen types で再生成すると`)
  console.log(`  自動的に union 型になります。${RESET}`)
  console.log()

  if (errorCount > 0) process.exit(1)
}

main()
