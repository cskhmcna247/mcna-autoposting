import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, ExternalLink, Copy, Loader2, Ban, Trash2 } from 'lucide-react'

const NAMES = { facebook: 'Facebook', linkedin: 'LinkedIn', wordpress: 'WordPress' }

// Đọc kết quả đăng: dạng mới là JSON {"results":[...]}, dữ liệu cũ chỉ có chuỗi trạng thái/lỗi
function parseResults(post) {
  const raw = post.error_message
  if (raw && raw !== 'None') {
    try {
      const j = JSON.parse(raw)
      if (Array.isArray(j?.results)) return j.results
    } catch { /* dữ liệu cũ */ }
  }
  const status = post.status || ''
  const platforms = (post.platforms || '').split(',').map(s => s.trim()).filter(Boolean)
  const oldErr = raw && raw !== 'None' ? raw : ''
  const errFor = (p) => {
    const line = oldErr.split(/\n|;/).find(l => l.toLowerCase().startsWith(p))
    return line || oldErr || 'Không có chi tiết lỗi (bài đăng trước khi có tính năng này).'
  }
  if (status === 'posted') return platforms.map(p => ({ platform: p, ok: true }))
  if (status.startsWith('partial')) {
    const okList = (status.match(/ok=([^ ]*)/)?.[1] || '').split(',').filter(Boolean)
    const failList = (status.match(/fail=([^ ]*)/)?.[1] || '').split(',').filter(Boolean)
    return [
      ...okList.map(p => ({ platform: p, ok: true })),
      ...failList.map(p => ({ platform: p, ok: false, message: `Đăng lên ${NAMES[p] || p} thất bại.`, detail: errFor(p) })),
    ]
  }
  if (status === 'failed') {
    return platforms.map(p => ({ platform: p, ok: false, message: `Đăng lên ${NAMES[p] || p} thất bại.`, detail: errFor(p) }))
  }
  return []
}

const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '')

export default function PostResult({ post, compact = false }) {
  const [openDetail, setOpenDetail] = useState({})
  const [copied, setCopied] = useState(false)
  const status = post.status || ''

  if (status === 'draft') return null
  if (status === 'rejected') {
    return <div className="flex items-center gap-1.5 text-xs text-gray-500"><Ban size={13} /> Đã từ chối, bài không được đăng.</div>
  }
  if (status === 'pending') {
    const future = post.scheduled_time && new Date(post.scheduled_time) > new Date()
    return future
      ? <div className="flex items-center gap-1.5 text-xs text-yellow-700"><Clock size={13} /> Đã duyệt, sẽ đăng lúc {fmt(post.scheduled_time)}</div>
      : <div className="flex items-center gap-1.5 text-xs text-yellow-700"><Loader2 size={13} className="animate-spin" /> Đang đăng bài...</div>
  }

  const results = parseResults(post)
  if (!results.length) return null
  const failed = results.filter(r => !r.ok)

  const copyReport = async () => {
    const text = [
      `[Báo lỗi đăng bài] ID ${post.id}: ${post.title || ''}`,
      `Người tạo: ${post.created_by || ''} | Thời gian: ${fmt(post.posted_at || post.created_at)}`,
      ...failed.map(r => `- ${NAMES[r.platform] || r.platform}: ${r.message || ''}\n  Chi tiết: ${r.detail || ''}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Sao chép nội dung dưới đây gửi quản trị viên:', text)
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {results.map(r => (
        <div key={r.platform}>
          <div className="flex items-start gap-1.5 flex-wrap">
            {r.ok && r.deleted
              ? <Trash2 size={14} className="text-gray-500 mt-0.5 shrink-0" />
              : r.ok
                ? <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                : <XCircle size={14} className="text-red-600 mt-0.5 shrink-0" />}
            <b className="font-medium text-gray-800">{NAMES[r.platform] || r.platform}:</b>
            {r.ok && r.deleted ? (
              <span className="text-gray-500">Đã bị xóa trên trang (phát hiện lúc {fmt(r.deleted_at)})</span>
            ) : r.ok ? (
              <>
                <span className="text-green-700">Đăng thành công</span>
                {r.link && (
                  <a href={r.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline">
                    Xem bài <ExternalLink size={11} />
                  </a>
                )}
                {r.comment && !r.comment.ok && (
                  <button type="button" className="text-orange-600 underline"
                    onClick={() => setOpenDetail(o => ({ ...o, [r.platform]: !o[r.platform] }))}>
                    (bình luận tự động lỗi)
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="text-red-700">{r.message}</span>
                {r.detail && (
                  <button type="button" className="text-gray-500 hover:text-gray-800 underline"
                    onClick={() => setOpenDetail(o => ({ ...o, [r.platform]: !o[r.platform] }))}>
                    {openDetail[r.platform] ? 'Ẩn chi tiết' : 'Chi tiết'}
                  </button>
                )}
              </>
            )}
          </div>
          {!r.ok && openDetail[r.platform] && (
            <pre className="ml-5 mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 whitespace-pre-wrap break-all">{r.detail}</pre>
          )}
          {r.ok && r.comment && !r.comment.ok && openDetail[r.platform] && (
            <pre className="ml-5 mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 whitespace-pre-wrap break-all">{r.comment.detail}</pre>
          )}
        </div>
      ))}
      {failed.length > 0 && (
        <div>
          <button type="button" onClick={copyReport}
            className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50">
            <Copy size={12} /> {copied ? 'Đã sao chép, gửi cho quản trị viên' : 'Sao chép lỗi để báo quản trị viên'}
          </button>
        </div>
      )}
    </div>
  )
}
