import EquipmentBadge from './EquipmentBadge'

interface EquipmentData {
  racket_id?: string | null
  racket_raw?: string | null
  rubber_fore_id?: string | null
  rubber_fore_raw?: string | null
  rubber_fore_thickness?: string | null
  rubber_back_id?: string | null
  rubber_back_raw?: string | null
  rubber_back_thickness?: string | null
  rackets?: { id: string; name: string } | null
  rubbers_fore?: { id: string; name: string } | null
  rubbers_back?: { id: string; name: string } | null
}

interface Props {
  equipment: EquipmentData
}

export default function ForeBackDisplay({ equipment: e }: Props) {
  const racketName = e.rackets?.name || e.racket_raw
  const foreName = e.rubbers_fore?.name || e.rubber_fore_raw
  const backName = e.rubbers_back?.name || e.rubber_back_raw

  return (
    <div className="space-y-2">
      {racketName && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-block w-14 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-center text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            ラケット
          </span>
          <EquipmentBadge
            name={racketName}
            id={e.rackets?.id}
            type="racket"
          />
        </div>
      )}
      {foreName && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-block w-14 shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-center text-xs font-bold text-red-600">
            フォア
          </span>
          <EquipmentBadge
            name={foreName}
            id={e.rubbers_fore?.id}
            thickness={e.rubber_fore_thickness}
            type="rubber"
            side="fore"
          />
        </div>
      )}
      {backName && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-block w-14 shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-center text-xs font-bold text-blue-600">
            バック
          </span>
          <EquipmentBadge
            name={backName}
            id={e.rubbers_back?.id}
            thickness={e.rubber_back_thickness}
            type="rubber"
            side="back"
          />
        </div>
      )}
    </div>
  )
}
