import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import { posts } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const tabs = ['all', 'draft', 'pending', 'posted', 'rejected', 'failed']
const tabLabels = {
  all: 'Tất cả',
  draft: 'Bản nháp',
  pending: 'Đang chờ',
  posted: 'Đã đăng',
  rejected: 'Từ chối',
  failed: 'Thất bại',
}

export default function PostsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [data, setData] = useState({ posts: [], total: 0 })
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(0)
  const limit = 20

  const load = () => {
    const params = { limit, offset: page * limit }
    if (tab !== 'all') params.status = tab
    posts.list(params).then(setData).catch(() => {})
  }

  useEffect(() => { load() }, [tab, page])

  const handleDelete = async (id) => {
    if (!confirm('Xóa bài đăng này?')) return
    await posts.delete(id)
    load()
  }

  const handleApprove = async (id) => {
    if (!confirm('Duyệt bài đăng này?')) return
    try {
      await posts.approve(id)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || err.message)
    }
  }

  const handleReject = async (id) => {
    if (!confirm('Từ chối bài đăng này?')) return
    try {
      await posts.reject(id)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bài đăng</h2>
        <button
          onClick={() => navigate('/posts/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Tạo bài mới
        </button>
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
                <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{post.title || post.content?.slice(0, 50)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{post.platforms}</td>
                <td className="px-4 py-3"><PriorityBadge priority={post.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={post.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{post.created_by || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {post.created_at ? new Date(post.created_at).toLocaleDateString('vi-VN') : ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {isAdmin && post.status === 'draft' && (
                      <>
                        <button onClick={() => handleApprove(post.id)} title="Duyệt" className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleReject(post.id)} title="Từ chối" className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
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
