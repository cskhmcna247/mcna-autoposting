import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Pencil, Eye, X, Clock } from 'lucide-react'
import PriorityBadge from '../components/PriorityBadge'
import StatusBadge from '../components/StatusBadge'
import PostResult from '../components/PostResult'
import { posts } from '../api/client'
import { analyzeSeo, STATUS_LABEL, STATUS_COLOR } from '../lib/seoAnalysis'

const parseMeta = (raw) => { try { return JSON.parse(raw || '{}') || {} } catch { return {} } }

// Điểm SEO cho bài có đăng WordPress
const seoOf = (post) => {
  if (!(post.platforms || '').includes('wordpress')) return null
  return analyzeSeo({ ...parseMeta(post.wp_meta), title: post.title, image_url: post.image_url }, post.content || '')
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [preview, setPreview] = useState(null)

  const load = () => {
    posts.myReview()
      .then(d => { setList(d.posts); setRecent(d.recent || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Vừa duyệt xong bài đang được đăng ở nền -> tự cập nhật kết quả mỗi 5 giây
  const posting = recent.some(p =>
    p.status === 'pending' && (!p.scheduled_time || new Date(p.scheduled_time) <= new Date()))
  useEffect(() => {
    if (!posting) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [posting])

  const act = async (post, kind) => {
    const msg = kind === 'approve'
      ? (post.scheduled_time
          ? `Duyệt bài này? Bài sẽ được đăng lúc ${new Date(post.scheduled_time).toLocaleString('vi-VN')}.`
          : 'Duyệt bài này? Bài sẽ được đăng ngay.')
      : 'Từ chối bài này? Bài sẽ không được đăng.'
    if (!confirm(msg)) return
    setBusy(post.id)
    try {
      await (kind === 'approve' ? posts.approve(post.id) : posts.reject(post.id))
      setPreview(null)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Duyệt bài</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bài bạn viết sẽ nằm ở đây. Kiểm tra lại rồi bấm <b>Duyệt</b> để đăng. Bạn chỉ thấy và duyệt được bài do chính mình tạo.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">ID</th>
              <th className="text-left px-4 py-3 font-medium">Tiêu đề / Nội dung</th>
              <th className="text-left px-4 py-3 font-medium">Nền tảng</th>
              <th className="text-left px-4 py-3 font-medium">Ưu tiên</th>
              <th className="text-left px-4 py-3 font-medium">SEO</th>
              <th className="text-left px-4 py-3 font-medium">Lịch đăng</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map(post => {
              const seo = seoOf(post)
              return (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{post.id}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{post.title || post.content?.replace(/<[^>]+>/g, '').slice(0, 50)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{post.platforms}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={post.priority} /></td>
                  <td className="px-4 py-3 text-xs">
                    {seo
                      ? <span className="inline-flex items-center gap-1.5">
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[seo.status], display: 'inline-block' }} />
                          {STATUS_LABEL[seo.status]}
                        </span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {post.scheduled_time
                      ? <span className="inline-flex items-center gap-1"><Clock size={12} />{new Date(post.scheduled_time).toLocaleString('vi-VN')}</span>
                      : 'Đăng ngay khi duyệt'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setPreview(post)} title="Xem trước" className="p-1 text-gray-400 hover:text-indigo-600 rounded"><Eye size={16} /></button>
                      <button onClick={() => navigate(`/posts/${post.id}/edit`)} title="Sửa" className="p-1 text-gray-400 hover:text-indigo-600 rounded"><Pencil size={15} /></button>
                      <button disabled={busy === post.id} onClick={() => act(post, 'approve')} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50">
                        <CheckCircle size={14} /> Duyệt
                      </button>
                      <button disabled={busy === post.id} onClick={() => act(post, 'reject')} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded disabled:opacity-50">
                        <XCircle size={14} /> Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && list.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Không có bài nào chờ duyệt</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-1">Kết quả đăng bài của tôi</h3>
      <p className="text-sm text-gray-500 mb-3">
        Bài đã duyệt gần đây và kết quả trên từng nền tảng. Nếu có lỗi, bấm <b>Sao chép lỗi</b> rồi gửi cho quản trị viên.
      </p>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {recent.map(post => (
          <div key={post.id} className="px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-gray-400 text-sm">#{post.id}</span>
              <span className="text-gray-900 font-medium truncate flex-1">{post.title || post.content?.replace(/<[^>]+>/g, '').slice(0, 60)}</span>
              <StatusBadge status={post.status} />
              <span className="text-xs text-gray-400 whitespace-nowrap">{post.posted_at ? new Date(post.posted_at).toLocaleString('vi-VN') : ''}</span>
            </div>
            <PostResult post={post} />
          </div>
        ))}
        {!loading && recent.length === 0 && (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">Chưa có bài nào được duyệt</div>
        )}
      </div>

      {preview && (
        <div className="wp-preview-overlay" onClick={() => setPreview(null)}>
          <div className="wp-preview-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <span>Xem trước: {preview.title || '(Không có tiêu đề)'}</span>
              <button type="button" className="wp-link" onClick={() => setPreview(null)}><X size={18} /></button>
            </header>
            <div className="wp-preview-content">
              {preview.image_url && <img src={preview.image_url.split(',')[0]} alt="" style={{ marginBottom: 16 }} />}
              <h1 style={{ fontSize: 28, marginBottom: 16 }}>{preview.title}</h1>
              {/<\/(p|h\d|li)>/.test(preview.content || '')
                ? <div dangerouslySetInnerHTML={{ __html: preview.content }} />
                : <p style={{ whiteSpace: 'pre-wrap' }}>{preview.content}</p>}
              <div className="flex gap-2 mt-6">
                <button disabled={busy === preview.id} onClick={() => act(preview, 'approve')} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50">
                  <CheckCircle size={15} /> Duyệt
                </button>
                <button disabled={busy === preview.id} onClick={() => act(preview, 'reject')} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded disabled:opacity-50">
                  <XCircle size={15} /> Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
