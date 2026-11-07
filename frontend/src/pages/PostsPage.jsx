import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import PostResult from '../components/PostResult'
import { posts } from '../api/client'

const tabs = ['all', 'draft', 'pending', 'posted', 'rejected', 'failed', 'deleted']
const tabLabels = {
  all: 'Tất cả',
  draft: 'Chờ duyệt',
  pending: 'Đang chờ',
  posted: 'Đã đăng',
  rejected: 'Từ chối',
  failed: 'Thất bại',
  deleted: 'Đã xóa trên trang',
}

export default function PostsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState({ posts: [], total: 0 })
  const [checking, setChecking] = useState(false)
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(0)
  const limit = 20

  const load = () => {
    const params = { limit, offset: page * limit }
    if (tab !== 'all') params.status = tab
    posts.list(params).then(setData).catch(() => {})
  }

  useEffect(() => { load() }, [tab, page])

  // Bài vừa tạo được đăng ở nền sau vài giây -> tự tải lại khi còn bài "Đang chờ" tới lượt đăng
  const hasDuePending = data.posts.some(p =>
    p.status === 'pending' && (!p.scheduled_time || new Date(p.scheduled_time) <= new Date()))
  useEffect(() => {
    if (!hasDuePending) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [hasDuePending, tab, page])

  const handleCheckDeleted = async () => {
    setChecking(true)
    try {
      const r = await posts.checkDeleted()
      if (r.skipped) alert('Hệ thống đang kiểm tra, vui lòng thử lại sau ít phút.')
      else alert(r.deleted ? `Phát hiện ${r.deleted} bài đã bị xóa trên trang.` : `Đã kiểm tra ${r.checked} bài, không có bài nào bị xóa.`)
      load()
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.detail || err.message))
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa bài đăng này?')) return
    await posts.delete(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bài đăng</h2>
        <div className="flex gap-2">
        <button
          onClick={handleCheckDeleted}
          disabled={checking}
          title="Kiểm tra các bài đã đăng trong 30 ngày còn trên Facebook/LinkedIn/WordPress không"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={checking ? 'animate-spin' : ''} /> {checking ? 'Đang kiểm tra...' : 'Kiểm tra bài bị xóa'}
        </button>
        <button
          onClick={() => navigate('/posts/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Tạo bài mới
        </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0) }}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              tab === t ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">ID</th>
              <th className="text-left px-4 py-3 font-medium">Tiêu đề / Nội dung</th>
              <th className="text-left px-4 py-3 font-medium">Nền tảng</th>
              <th className="text-left px-4 py-3 font-medium">Ưu tiên</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-3 font-medium">Người tạo</th>
              <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.posts.map(post => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{post.id}</td>
                <td className="px-4 py-3 text-gray-900 max-w-md">
                  <div className="truncate">{post.title || post.content?.replace(/<[^>]+>/g, '').slice(0, 50)}</div>
                  <div className="mt-1.5"><PostResult post={post} compact /></div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{post.platforms}</td>
                <td className="px-4 py-3"><PriorityBadge priority={post.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={post.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{post.created_by || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {post.created_at ? new Date(post.created_at).toLocaleDateString('vi-VN') : ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => navigate(`/posts/${post.id}/edit`)} className="p-1 text-gray-400 hover:text-indigo-600 rounded">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.posts.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Không có bài đăng</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.total > limit && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">Trước</button>
          <span className="px-3 py-1 text-sm text-gray-500">Trang {page + 1} / {Math.ceil(data.total / limit)}</span>
          <button disabled={(page + 1) * limit >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">Sau</button>
        </div>
      )}
    </div>
  )
}
