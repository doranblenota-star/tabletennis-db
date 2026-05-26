import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import type { ScrapedPlayer, ScrapedEquipmentEntry, Category, GripType } from '@/lib/types'
import { parseRubberWithThickness, parseDateRange } from './normalizer'

// ─── カテゴリ検出 ────────────────────────────────────────────────────────────

const CATEGORY_URLS: Record<string, Category> = {
  'equipment-japan-men': 'japan_men',
  'equipment-world-men': 'world_men',
  'equipment-japan-women': 'japan_women',
  'equipment-world-women': 'world_women',
}

function detectCategory(url: string): Category {
  for (const [key, cat] of Object.entries(CATEGORY_URLS)) {
    if (url.includes(key)) return cat
  }
  return 'japan_men'
}

// ─── HTML → テキスト変換 ──────────────────────────────────────────────────────

function htmlToLines($: CheerioAPI): string[] {
  const $content = $('.entry-content').first()
  if (!$content.length) return []

  // 不要要素を削除
  $content.find('img, script, style, noscript').remove()

  // [→用具遍歴] リンクを削除（外部ページへのリンク）
  $content.find('a').each((_, el) => {
    const text = $(el).text().trim()
    if (text.includes('用具遍歴') || text.startsWith('→') || text.startsWith('↗')) {
      $(el).remove()
    }
  })

  // <br> を改行に置換
  $content.find('br').replaceWith('\n')

  // 各 <p> の前後に改行を追加
  $content.find('p').each((_, el) => {
    $(el).prepend('\n').append('\n')
  })

  const raw = $content.text()
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.replace(/\t/g, ' ').trimEnd())
}

// ─── 選手ブロック分割 ────────────────────────────────────────────────────────

// 行が選手名行かどうか判定
// 条件: ・または●で始まり、R：を含まず、ある程度短い
const PLAYER_NAME_RE = /^[・●▶]\s*\S/

function isPlayerNameLine(line: string): boolean {
  const t = line.trim()
  if (!PLAYER_NAME_RE.test(t)) return false
  if (t.includes('R：') || t.includes('R:')) return false
  if (t.length > 60) return false
  return true
}

function splitIntoPlayerBlocks(lines: string[]): string[][] {
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    if (isPlayerNameLine(line) && line.trim().length > 1) {
      if (current.length > 0) {
        blocks.push(current)
      }
      current = [line.trim()]
    } else {
      current.push(line.trim())
    }
  }
  if (current.length > 0) blocks.push(current)

  // R：または R: を含むブロックのみ残す
  return blocks.filter(b => b.some(l => l.includes('R：') || l.includes('R:')))
}

// ─── 1行の用具情報パース ──────────────────────────────────────────────────────

interface ParsedEquipment {
  racket_raw: string | null
  rubber_fore_raw: string | null
  rubber_back_raw: string | null
  grip_type: GripType | null
}

function parseEquipmentLine(line: string): ParsedEquipment {
  const result: ParsedEquipment = {
    racket_raw: null,
    rubber_fore_raw: null,
    rubber_back_raw: null,
    grip_type: null,
  }

  // yarilog は全角コロン「：」を一貫して使用する
  // 半角コロン「:」は括弧内の説明文（例: (B:アウターALC)）にのみ使われる
  // → 全角コロンで分割することで誤検知を防ぐ
  //
  // ただし半角コロンのページも存在するため両方サポート
  // ルール: 直前が全角スペース・半角スペース・行頭の場合のみ区切り文字として扱う

  const segments = splitEquipmentSegments(line)

  for (const [key, value] of segments) {
    const v = value.trim()
    if (!v) continue
    switch (key) {
      case 'R':
        result.racket_raw = v
        break
      case 'F':
        result.rubber_fore_raw = v
        break
      case 'B':
        result.rubber_back_raw = v
        break
      case 'G':
        if (/^[A-Za-z]{2}$/.test(v)) {
          result.grip_type = v.toUpperCase() as GripType
        }
        break
    }
  }

  return result
}

function splitEquipmentSegments(line: string): [string, string][] {
  const segments: [string, string][] = []

  // 全角コロン「：」でのマーカー位置を検出
  // （先頭 or 空白の後に [RFBG] が続く場合）
  const markerRe = /(^|[\s　])([RFBG])：/g
  let match: RegExpExecArray | null
  const positions: { index: number; key: string }[] = []

  while ((match = markerRe.exec(line)) !== null) {
    const prefix = match[1]
    const key = match[2]
    // マーカー開始位置（prefix の分ずらす）
    positions.push({ index: match.index + prefix.length, key })
  }

  // 半角コロンフォールバック（全角が見つからない場合）
  if (positions.length === 0) {
    const fallback = /(^|[\s　])([RFBG]):/g
    while ((match = fallback.exec(line)) !== null) {
      const prefix = match[1]
      const key = match[2]
      positions.push({ index: match.index + prefix.length, key })
    }
  }

  for (let i = 0; i < positions.length; i++) {
    const { index, key } = positions[i]
    const colonWidth = line[index + 1] === '：' ? 2 : 1 // 全角コロンは2バイト分文字数1
    const valueStart = index + 1 + 1 // key(1文字) + コロン(1文字)
    const valueEnd = i + 1 < positions.length ? positions[i + 1].index : line.length
    const value = line.slice(valueStart, valueEnd).replace(/^\s+/, '')
    segments.push([key, value])
    void colonWidth
  }

  return segments
}

// ─── 選手ブロックパース ───────────────────────────────────────────────────────

function parsePlayerBlock(lines: string[], category: Category): ScrapedPlayer | null {
  if (lines.length === 0) return null

  // 1行目: ・選手名　WRN (英語名)
  const nameLine = lines[0]
  const nameResult = parseNameLine(nameLine)
  if (!nameResult) return null

  let currentEquip: ParsedEquipment | null = null
  let currentValidFrom: string | null = null
  const historyEntries: ScrapedEquipmentEntry[] = []

  let inHistory = false
  let histEquip: ParsedEquipment | null = null
  let histFrom: string | null = null
  let histTo: string | null = null

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 用具遍歴セクション開始
    if (line.includes('▼') && line.includes('用具遍歴')) {
      inHistory = true
      continue
    }

    if (!inHistory) {
      // 日付行: (2025/10~2026/1) など
      if (!currentEquip) {
        const dateMatch = extractDateFromLine(line)
        if (dateMatch) {
          currentValidFrom = dateMatch.from
          continue
        }
      }
      // 用具行
      if (hasEquipment(line)) {
        currentEquip = parseEquipmentLine(line)
      }
    } else {
      // 履歴セクション
      const dateMatch = extractDateFromLine(line)
      if (dateMatch) {
        // 前のエントリを確定
        if (histEquip && hasAnyEquip(histEquip)) {
          historyEntries.push({
            ...histEquip,
            valid_from: histFrom,
            valid_to: histTo,
            notes: null,
          })
        }
        histEquip = null
        histFrom = dateMatch.from
        histTo = dateMatch.to
        continue
      }

      if (line.trim() === '↓' || line.trim() === '↑') {
        if (histEquip && hasAnyEquip(histEquip)) {
          historyEntries.push({
            ...histEquip,
            valid_from: histFrom,
            valid_to: histTo,
            notes: null,
          })
          histEquip = null
          histFrom = null
          histTo = null
        }
        continue
      }

      if (hasEquipment(line)) {
        histEquip = parseEquipmentLine(line)
      }
    }
  }

  // 最後の履歴エントリを確定
  if (histEquip && hasAnyEquip(histEquip)) {
    historyEntries.push({
      ...histEquip,
      valid_from: histFrom,
      valid_to: histTo,
      notes: null,
    })
  }

  if (!currentEquip) return null

  return {
    name_ja: nameResult.name_ja,
    name_en: nameResult.name_en,
    world_ranking: nameResult.world_ranking,
    category,
    current: {
      racket_raw: currentEquip.racket_raw,
      rubber_fore_raw: currentEquip.rubber_fore_raw,
      rubber_back_raw: currentEquip.rubber_back_raw,
      grip_type: currentEquip.grip_type,
      notes: null,
      valid_from: currentValidFrom,
    },
    history: historyEntries,
  }
}

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

interface NameResult {
  name_ja: string
  name_en: string | null
  world_ranking: number | null
}

function parseNameLine(line: string): NameResult | null {
  const cleaned = line
    .replace(/^[・●▶]\s*/, '')
    .trim()

  if (!cleaned || cleaned.length < 2) return null

  // WR番号を抽出
  const wrMatch = cleaned.match(/\s+WR\s*(\d+)/i)
  const world_ranking = wrMatch ? parseInt(wrMatch[1]) : null

  // 英語名を抽出 (名前の後ろの括弧)
  const enMatch = cleaned.match(/([^\s]+)\s*\(([A-Za-z][^)]+)\)/)
  let name_ja = cleaned
  let name_en: string | null = null

  if (enMatch) {
    name_en = enMatch[2].trim()
    // 英語名括弧を除去
    name_ja = cleaned.replace(/\s*\([A-Za-z][^)]+\)/, '')
  }

  // WR 表記を除去
  name_ja = name_ja.replace(/\s+WR\s*\d+.*/i, '').trim()
  // 更新日付を除去
  name_ja = name_ja.replace(/\s*[（(]\d{4}[^)）]*[）)].*/g, '').trim()

  if (!name_ja || name_ja.length < 2) return null

  return { name_ja, name_en, world_ranking }
}

function extractDateFromLine(line: string): { from: string | null; to: string | null } | null {
  const match = line.match(/[（(](\d{4}\/\d{1,2}[^）)]*)[）)]/)
  if (!match) return null
  return parseDateRange(match[1])
}

function hasEquipment(line: string): boolean {
  return line.includes('R：') || line.includes('R:')
}

function hasAnyEquip(e: ParsedEquipment): boolean {
  return !!(e.racket_raw || e.rubber_fore_raw || e.rubber_back_raw)
}

// ヘッダー行や説明行を選手として誤検知しないためのフィルター
const INVALID_NAME_PATTERNS = [
  /敬称略/,
  /^選手名/,
  /^ラケット/,
  /^ラバー/,
  /YouTuber/,
  /^例：/,
  /^※/,
]

function isValidPlayer(name: string): boolean {
  if (name.length < 2) return false
  for (const pattern of INVALID_NAME_PATTERNS) {
    if (pattern.test(name)) return false
  }
  return true
}

// ─── メインエクスポート ───────────────────────────────────────────────────────

export function parseYarilogPage(html: string, url: string): ScrapedPlayer[] {
  const $ = cheerio.load(html)
  const category = detectCategory(url)

  const lines = htmlToLines($)
  const blocks = splitIntoPlayerBlocks(lines)

  const players: ScrapedPlayer[] = []
  for (const block of blocks) {
    const player = parsePlayerBlock(block, category)
    if (player && isValidPlayer(player.name_ja)) {
      players.push(player)
    }
  }

  return players
}

export { parseRubberWithThickness }
