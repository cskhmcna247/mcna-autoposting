import { useEffect, useState } from 'react'
import { FileText, CheckCircle, Clock, AlertTriangle, FileEdit, XCircle } from 'lucide-react'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import { dashboard, platforms } from '../api/client'

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, draft: 0, pending: 0, posted: 0, failed: 0, rejected: 0 })
  const [recent, setRecent] = useState([])
  const [platformStatus, setPlatformStatus] = useState(null)

  useEffect(() => {
    dashboard.stats().then(setStats).catch(() => {})
    dashboard.recent(5).then(setRecent).catch(() => {})
    platforms.status().then(setPlatformStatus).catch(() => {})
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard icon={FileText} label="Tổng bài" value={stats.total} color="text-blue-600" />
        <StatCard icon={FileEdit} label="Bản nháp" value={stats.draft} color="text-gray-600" />
        <StatCard icon={Clock} label="Đang chờ" value={stats.pending} color="text-yellow-600" />
        <StatCard icon={CheckCircle} label="Đã đăng" value={stats.posted} color="text-green-600" />
        <StatCard icon={AlertTriangle} label="Thất bại" value={stats.failed} color="text-red-600" />
        <StatCard icon={XCircle} label="Từ chối" value={stats.rejected} color="text-orange-600" />
      </div>

      {platformStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Nền tảng</h3>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${platformStatus.facebook?.configured ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-600">Facebook</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${platformStatus.linkedin?.configured ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-600">LinkedIn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${platformStatus.wordpress?.configured ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-600">WordPress</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Bài đăng gần đây</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có bài đăng nào</p>
        ) : (
          <div className="space-y-3">
            {recent.map(post => (
              <div key={post.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{post.title || post.content?.slice(0, 60)}</p>
                  <p className="text-xs text-gray-400">{post.platforms} · {post.created_by || ''} · {post.created_at ? new Date(post.created_at).toLocaleDateString('vi-VN') : ''}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <PriorityBadge priority={post.priority} />
                  <StatusBadge status={post.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
