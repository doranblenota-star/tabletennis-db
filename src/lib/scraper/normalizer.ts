// 用具名の正規化：表記揺れ→正規名
// キーは正規化前の揺れ表記、値は正規名
const RACKET_ALIASES: Record<string, string> = {
  // バタフライ
  'ビスカリア': 'ビスカリア',
  'Viscaria': 'ビスカリア',
  'ビスカリアスーパーALC': 'ビスカリアスーパーALC',
  '張本智和インナーフォースALC': '張本智和インナーフォーススーパーALC',
  '張本智和インナーフォーススーパーALC': '張本智和インナーフォーススーパーALC',
  '張本智和インナーフォーススーパーZLC': '張本智和インナーフォーススーパーZLC',
  '張本智和インナーフォースZLC': '張本智和インナーフォーススーパーZLC',
  'インナーフォースレイヤーALC': 'インナーフォースレイヤーALC',
  'インナーフォースALC': 'インナーフォースレイヤーALC',
  // VICTAS
  '剛力': '剛力',
  // Tibhar
  'ストラタス パワーウッド': 'ストラタスパワーウッド',
}

const RUBBER_ALIASES: Record<string, string> = {
  // バタフライ テナジー
  'テナジー05': 'テナジー05',
  'T05': 'テナジー05',
  'Tenergy 05': 'テナジー05',
  'Tenergy05': 'テナジー05',
  'テナジー05ハード': 'テナジー05ハード',
  'テナジー64': 'テナジー64',
  'テナジー80': 'テナジー80',
  // バタフライ ディグニクス
  'ディグニクス05': 'ディグニクス05',
  'D05': 'ディグニクス05',
  'ディグニクス80': 'ディグニクス80',
  'D80': 'ディグニクス80',
  'ディグニクス09C': 'ディグニクス09C',
  'D09C': 'ディグニクス09C',
  'Dignics 09C': 'ディグニクス09C',
  // バタフライ ザイア
  'ザイア03': 'ザイア03',
  'ZYOS03': 'ザイア03',
  'Zyla 03': 'ザイア03',
  // VICTAS
  'V>15エキストラ': 'V>15エキストラ',
  'VO>102': 'VO>102',
  // Nittaku
  'ファスタークG-1': 'ファスタークG-1',
  'ファスタークG1': 'ファスタークG-1',
  'モリストSP': 'モリストSP',
  'モリストSP AX': 'モリストSP AX',
}

export function normalizeRacketName(raw: string): string {
  const trimmed = cleanName(raw)
  return RACKET_ALIASES[trimmed] ?? trimmed
}

export function normalizeRubberName(raw: string): string {
  const trimmed = cleanName(raw)
  if (RUBBER_ALIASES[trimmed]) return RUBBER_ALIASES[trimmed]
  for (const [alias, canonical] of Object.entries(RUBBER_ALIASES)) {
    if (trimmed === alias) return canonical
  }
  return trimmed
}

function cleanName(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[→↓▼]/g, '')
    .trim()
}

// "ザイア03(特厚)" → { name: "ザイア03", thickness: "特厚" }
// "ファスタークG-1(特厚,特注50度？)" → { name: "ファスタークG-1", thickness: "特厚,特注50度？" }
export function parseRubberWithThickness(raw: string): {
  name: string
  thickness: string | null
} {
  const trimmed = raw.trim()
  // 末尾の (内容) を厚さとして取り出す（ただし G: が含まれていない場合のみ）
  const match = trimmed.match(/^(.+?)\(([^)]+)\)\s*$/)
  if (match) {
    const possibleThickness = match[2].trim()
    // G: が含まれる場合はラケット仕様なので厚さではない
    if (!possibleThickness.startsWith('G:') && !possibleThickness.startsWith('B:')) {
      return {
        name: normalizeRubberName(match[1].trim()),
        thickness: possibleThickness,
      }
    }
  }
  return { name: normalizeRubberName(trimmed), thickness: null }
}

// "2025/10" → "2025-10-01"
export function parseYearMonth(str: string): string | null {
  const match = str.trim().match(/(\d{4})[\/\-](\d{1,2})/)
  if (!match) return null
  return `${match[1]}-${match[2].padStart(2, '0')}-01`
}

// "(2024/5～2025/3)" → { from: "2024-05-01", to: "2025-03-01" }
// "(2020/9~2021/1~2022/1~7)" → { from: "2020-09-01", to: null } ※複数期間は from のみ使用
export function parseDateRange(str: string): {
  from: string | null
  to: string | null
} {
  const cleaned = str.replace(/[（(）)]/g, '').trim()
  const parts = cleaned.split(/[～~〜]/)
  const validParts = parts.map(parseYearMonth).filter(Boolean) as string[]
  if (validParts.length === 0) return { from: null, to: null }
  if (validParts.length === 1) return { from: validParts[0], to: null }
  return { from: validParts[0], to: validParts[validParts.length - 1] }
}
