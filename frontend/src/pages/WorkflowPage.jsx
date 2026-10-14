import { useEffect, useState } from 'react'
import { Play, Square, Clock, RefreshCw } from 'lucide-react'
import { workflow } from '../api/client'

export default function WorkflowPage() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [interval, setInterval_] = useState(60)

  const refresh = () => {
    workflow.status().then(r => setRunning(r.running)).catch(() => {})
    workflow.logs().then(r => setLogs(r.logs)).catch(() => {})
    workflow.getSchedule().then(setSchedule).catch(() => {})
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      workflow.status().then(r => {
        if (!r.running) {
          setRunning(false)
          refresh()
        }
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [running])

  const handleRun = async () => {
    await workflow.run()
    setRunning(true)
  }

  const handleSetSchedule = async () => {
    await workflow.setSchedule(interval)
    refresh()
  }

  const handleRemoveSchedule = async () => {
    await workflow.removeSchedule()
    refresh()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Workflow</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Chạy thủ công</h3>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {running ? <Square size={16} /> : <Play size={16} />}
              {running ? 'Đang chạy...' : 'Chạy workflow'}
            </button>
            <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-600">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className={`text-sm ${running ? 'text-green-600' : 'text-gray-400'}`}>
            {running ? 'Workflow đang xử lý...' : 'Sẵn sàng'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Lịch tự động</h3>
          {schedule?.active ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Clock size={16} />
                <span>Đang chạy: {schedule.trigger}</span>
              </div>
              <p className="text-xs text-gray-400">Lần chạy tiếp: {schedule.next_run}</p>
              <button onClick={handleRemoveSchedule} className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                Tắt lịch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={e => setInterval_(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-500">phút / lần</span>
              </div>
              <button onClick={handleSetSchedule} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Bật lịch tự động
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Logs</h3>
          <button onClick={refresh} className="text-xs text-blue-600 hover:underline">Làm mới</button>
        </div>
        <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
          {logs || 'Chưa có log'}
        </pre>
      </div>
    </div>
  )
}
