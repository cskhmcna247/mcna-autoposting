import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FileText, Play, Settings, LogOut, User, Users, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const isAdmin = user?.role === 'admin'

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/posts', icon: FileText, label: 'Bài đăng' },
    ...(isAdmin ? [
      { to: '/calendar', icon: Calendar, label: 'Lịch đăng' },
      { to: '/workflow', icon: Play, label: 'Workflow' },
      { to: '/users', icon: Users, label: 'Tài khoản' },
      { to: '/settings', icon: Settings, label: 'Cài đặt' },
    ] : []),
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <img src="/logo.png" alt="MCNA Technology School" className="h-14 w-auto mb-2" />
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Auto Posting</h1>
          <p className="text-xs text-gray-500">MCNA Dashboard</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAdmin ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <User size={16} className={isAdmin ? 'text-blue-600' : 'text-green-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.display_name || user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {isAdmin ? 'Quản trị viên' : 'Thành viên'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 mt-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
