import { useEffect, useState } from 'react'
import { Shield, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import { users } from '../api/client'

export default function UsersPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'member' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    users.list().then(data => { setList(data.users); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await users.create(form)
      setShowForm(false)
      setForm({ email: '', password: '', display_name: '', role: 'member' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRoleToggle = async (user) => {
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`Đổi role "${user.display_name}" thành ${newRole === 'admin' ? 'Quản trị viên' : 'Thành viên'}?`)) return
    try {
      await users.updateRole(user.id, newRole)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || err.message)
    }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Xóa tài khoản "${user.display_name}" (${user.email})? Không thể hoàn tác!`)) return
    try {
      await users.delete(user.id)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || err.message)
    }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
        >
          {showForm ? <X size={16} /> : <UserPlus size={16} />}
          {showForm ? 'Đóng' : 'Thêm user'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Tạo tài khoản mới</h3>
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên hiển thị</label>
              <input value={form.display_name} onChange={set('display_name')} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Nguyễn Văn A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@mcna.vn" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu</label>
              <input type="password" value={form.password} onChange={set('password')} required minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vai trò</label>
              <select value={form.role} onChange={set('role')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="member">Thành viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all">
            {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-gray-400 text-sm">Đang tải...</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-gray-400 text-sm">Chưa có tài khoản nào</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Tên</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Vai trò</th>
                <th className="px-5 py-3">Ngày tạo</th>
                <th className="px-5 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.display_name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                      {u.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRoleToggle(u)}
                        title={u.role === 'admin' ? 'Hạ xuống Member' : 'Nâng lên Admin'}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ShieldCheck size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        title="Xóa tài khoản"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
