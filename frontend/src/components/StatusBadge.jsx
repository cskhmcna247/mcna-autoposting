const colors = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  rejected: 'bg-red-50 text-red-600',
  partial: 'bg-orange-100 text-orange-800',
}

const labels = {
  draft: 'Bản nháp',
  pending: 'Đang chờ',
  posted: 'Đã đăng',
  failed: 'Thất bại',
  rejected: 'Từ chối',
  partial: 'Một phần',
}

export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  let key = s
  if (s.startsWith('partial')) key = 'partial'
  else if (s.startsWith('failed')) key = 'failed'
  const cls = colors[key] || 'bg-gray-100 text-gray-800'
  const label = labels[key] || status
  const tooltip = s.startsWith('partial') ? status : ''
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`} title={tooltip}>
      {label}
    </span>
  )
}
