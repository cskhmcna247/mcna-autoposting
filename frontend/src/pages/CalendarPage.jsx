import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import { posts } from '../api/client'

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [calendarPosts, setCalendarPosts] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    posts.calendar(start, end).then(r => setCalendarPosts(r.posts)).catch(() => {})
  }, [year, month])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  const postsByDay = {}
  calendarPosts.forEach(p => {
    if (p.scheduled_time) {
      const d = new Date(p.scheduled_time).getDate()
      if (!postsByDay[d]) postsByDay[d] = []
      postsByDay[d].push(p)
    }
  })

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const todayDate = today.getDate()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const selectedPosts = selected ? (postsByDay[selected] || []) : []

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Lịch đăng bài</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">{monthNames[month]} {year}</h3>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {dayNames.map(d => (
            <div key={d} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}

          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[80px]" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayPosts = postsByDay[day] || []
            const isToday = isCurrentMonth && day === todayDate
            const isSelected = selected === day

            return (
              <div
                key={day}
                onClick={() => setSelected(day === selected ? null : day)}
                className={`bg-white min-h-[80px] p-1.5 cursor-pointer transition-colors ${
                  isSelected ? 'ring-2 ring-blue-500 ring-inset' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}>
                  {day}
                </div>
                {dayPosts.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate ${
                      p.status === 'posted' ? 'bg-green-100 text-green-700' :
                      p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      p.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-50 text-red-600'
                    }`}
                  >
                    {p.title || p.content?.slice(0, 15)}
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <div className="text-xs text-gray-400">+{dayPosts.length - 3}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Ngày {selected}/{month + 1}/{year} — {selectedPosts.length} bài
          </h3>
          {selectedPosts.length === 0 ? (
            <p className="text-sm text-gray-400">Không có bài nào trong ngày này</p>
          ) : (
            <div className="space-y-3">
              {selectedPosts.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.title || p.content?.slice(0, 60)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.scheduled_time ? new Date(p.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {' · '}{p.platforms}{' · '}{p.created_by || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <PriorityBadge priority={p.priority} />
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Chú thích</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Bản nháp</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" /> Đang chờ</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200" /> Đã đăng</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Từ chối / Thất bại</div>
        </div>
      </div>
    </div>
  )
}
