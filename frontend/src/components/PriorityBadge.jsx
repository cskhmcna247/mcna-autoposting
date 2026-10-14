const config = {
  high: { cls: 'bg-red-50 text-red-700 border-red-200', label: 'Cao' },
  medium: { cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'TB' },
  low: { cls: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Thấp' },
}

export default function PriorityBadge({ priority }) {
  const p = config[priority] || config.medium
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium border ${p.cls}`}>
      {p.label}
    </span>
  )
}
