import { CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react'

const LABELS = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  wordpress: 'WordPress',
  facebook_comment: 'Bình luận tự động Facebook',
  linkedin_comment: 'Bình luận tự động LinkedIn',
}

const isComment = (key) => key.endsWith('_comment')

function Shell({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">{children}</div>
    </div>
  )
}

export default function PublishModal({ step, platforms, result, error, onConfirm, onCancel, onClose }) {
  const names = platforms.map(p => LABELS[p] || p)

  if (step === 'confirm') {
    return (
      <Shell>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-50 p-2 text-blue-600"><Send size={20} /></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Xác nhận đăng bài?</h3>
            <p className="mt-1 text-sm text-gray-600">
              Bài sẽ được đăng công khai ngay lên: <strong>{names.join(', ')}</strong>.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Tiếp tục chỉnh sửa
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700"
          >
            Đăng ngay
          </button>
        </div>
      </Shell>
    )
  }

  if (step === 'publishing') {
    return (
      <Shell>
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Đang đăng bài...</h3>
            <p className="text-sm text-gray-600">Đang gửi lên {names.join(', ')}. Vui lòng không đóng trang.</p>
          </div>
        </div>
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-50 p-2 text-red-600"><AlertTriangle size={20} /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Không đăng được bài</h3>
            <p className="mt-1 break-words text-sm text-gray-600">{error}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Quay lại chỉnh sửa
          </button>
        </div>
      </Shell>
    )
  }

  const entries = Object.entries(result?.results || {})
  const okNames = entries.filter(([p, r]) => r === 'ok' && !isComment(p)).map(([p]) => LABELS[p] || p)
  const allOk = result?.status === 'posted'
  const commentFailed = entries.some(([p, r]) => isComment(p) && r !== 'ok')

  return (
    <Shell>
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 ${allOk ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
          {allOk ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {allOk
              ? 'Đã đăng thành công'
              : okNames.length
                ? 'Đăng được một phần'
                : 'Đăng thất bại'}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {allOk
              ? `Bài đã được đăng lên ${okNames.join(', ')}.${commentFailed ? ' Bình luận tự động bị lỗi, xem bên dưới.' : ''}`
              : okNames.length
                ? `Đã đăng lên ${okNames.join(', ')}. Các nền tảng lỗi xem bên dưới.`
                : 'Không nền tảng nào đăng được. Xem lỗi bên dưới.'}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {entries.map(([platform, r]) => (
          <li key={platform} className="flex items-start gap-2 text-sm">
            {r === 'ok'
              ? <CheckCircle size={16} className="mt-0.5 shrink-0 text-green-600" />
              : <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />}
            <div className="min-w-0">
              <span className="font-medium text-gray-800">{LABELS[platform] || platform}</span>
              {r !== 'ok' && <p className="break-words text-xs text-red-600">{String(r).slice(0, 200)}</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700"
        >
          Xem danh sách bài đăng
        </button>
      </div>
    </Shell>
  )
}
