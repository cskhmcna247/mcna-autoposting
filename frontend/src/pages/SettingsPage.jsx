import { useEffect, useState } from 'react'
import { platforms, settings } from '../api/client'

export default function SettingsPage() {
  const [config, setConfig] = useState(null)
  const [platformStatus, setPlatformStatus] = useState(null)
  const [verifyResult, setVerifyResult] = useState({})

  useEffect(() => {
    settings.get().then(setConfig).catch(() => {})
    platforms.status().then(setPlatformStatus).catch(() => {})
  }, [])

  const handleVerifyFb = async () => {
    setVerifyResult(r => ({ ...r, facebook: 'Đang kiểm tra...' }))
    const res = await platforms.verifyFacebook()
    setVerifyResult(r => ({ ...r, facebook: res.ok ? `OK - ${JSON.stringify(res.info)}` : `Lỗi: ${res.error}` }))
  }

  const handleVerifyLi = async () => {
    setVerifyResult(r => ({ ...r, linkedin: 'Đang kiểm tra...' }))
    const res = await platforms.verifyLinkedin()
    setVerifyResult(r => ({ ...r, linkedin: res.ok ? `OK - ${JSON.stringify(res.info)}` : `Lỗi: ${res.error}` }))
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Cài đặt</h2>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Nền tảng mạng xã hội</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${platformStatus?.facebook?.configured ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Facebook</p>
                  <p className="text-xs text-gray-400">Page ID: {platformStatus?.facebook?.page_id || 'N/A'}</p>
                </div>
              </div>
              <button onClick={handleVerifyFb} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Kiểm tra token
              </button>
            </div>
            {verifyResult.facebook && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{verifyResult.facebook}</p>}

            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${platformStatus?.linkedin?.configured ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">LinkedIn</p>
                  <p className="text-xs text-gray-400">{platformStatus?.linkedin?.configured ? 'Đã cấu hình' : 'Chưa cấu hình'}</p>
                </div>
              </div>
              <button onClick={handleVerifyLi} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Kiểm tra token
              </button>
            </div>
            {verifyResult.linkedin && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{verifyResult.linkedin}</p>}
          </div>
        </div>

        {config && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Nguồn nội dung</h3>
              <p className="text-sm text-gray-600">Đang dùng: <span className="font-medium text-gray-900">{config.content_source}</span></p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Database</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Loại:</span> <span className="text-gray-700">{config.database.type}</span></div>
                <div><span className="text-gray-400">Host:</span> <span className="text-gray-700">{config.database.host}</span></div>
                <div><span className="text-gray-400">Port:</span> <span className="text-gray-700">{config.database.port}</span></div>
                <div><span className="text-gray-400">DB:</span> <span className="text-gray-700">{config.database.name}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Lịch chạy</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Giờ chạy hàng ngày:</span> <span className="text-gray-700">{config.schedule.daily_time}</span></div>
                <div><span className="text-gray-400">Khoảng cách (phút):</span> <span className="text-gray-700">{config.schedule.hourly_interval}</span></div>
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-gray-400">Để thay đổi cài đặt, chỉnh sửa file <code className="bg-gray-100 px-1 rounded">.env</code> và khởi động lại server.</p>
      </div>
    </div>
  )
}
