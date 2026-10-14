import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Globe, MessageSquareShare, Share2, ChevronUp, ChevronDown, Clock, Image, Tag, Send, Save, Eye, MessageCircle } from 'lucide-react'
import { Editor } from '@tinymce/tinymce-react'
import { posts, platforms } from '../api/client'
import PublishModal from '../components/PublishModal'
import { useAuth } from '../contexts/AuthContext'

const PLATFORM_CONFIG = {
  facebook: { label: 'Facebook', icon: MessageSquareShare, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', check: 'accent-blue-600' },
  linkedin: { label: 'LinkedIn', icon: Share2, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', check: 'accent-sky-600' },
  wordpress: { label: 'WordPress', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', check: 'accent-blue-600' },
}

function SidebarPanel({ title, icon: Icon, defaultOpen = true, children, variant }) {
  const [open, setOpen] = useState(defaultOpen)
  const borderColor = variant === 'primary' ? 'border-blue-300' : 'border-gray-200'
  const headerBg = variant === 'primary' ? 'bg-blue-50 border-b border-blue-200' : 'bg-gray-50 border-b border-gray-200'
  const titleColor = variant === 'primary' ? 'text-blue-800' : 'text-gray-700'

  return (
    <div className={`border rounded-lg overflow-hidden ${borderColor}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 ${headerBg} hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className={titleColor} />}
          <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && <div className="p-3.5 bg-white">{children}</div>}
    </div>
  )
}

export default function PostFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = !!id
  const isAdmin = user?.role === 'admin'
  const editorRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    content_social: '',
    image_url: '',
    platforms: 'facebook,linkedin',
    scheduled_time: '',
    priority: 'medium',
    wp_category_ids: '',
    comment_text: '',
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [wpEditorMode, setWpEditorMode] = useState('visual')
  const [wpCategories, setWpCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [postStatus, setPostStatus] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [modal, setModal] = useState(null)
  const pendingData = useRef(null)

  const imageUrls = form.image_url ? form.image_url.split(',').filter(u => u.trim()) : []

  const selected = useMemo(() => {
    const parts = form.platforms.split(',').map(p => p.trim()).filter(Boolean)
    return { facebook: parts.includes('facebook'), linkedin: parts.includes('linkedin'), wordpress: parts.includes('wordpress') }
  }, [form.platforms])

  const hasWordPress = selected.wordpress
  const hasSocial = selected.facebook || selected.linkedin

  const togglePlatform = (platform) => {
    const parts = form.platforms.split(',').map(p => p.trim()).filter(Boolean)
    const idx = parts.indexOf(platform)
    if (idx >= 0) {
      if (parts.length <= 1) return
      parts.splice(idx, 1)
    } else {
      parts.push(platform)
    }
    setForm(f => ({ ...f, platforms: parts.join(',') }))
  }

  useEffect(() => {
    if (isEdit) {
      posts.get(id).then(post => {
        setPostStatus(post.status)
        setForm({
          title: post.title || '',
          content: post.content || '',
          content_social: post.content_social || '',
          image_url: post.image_url || '',
          platforms: post.platforms || 'facebook,linkedin',
          scheduled_time: post.scheduled_time ? post.scheduled_time.slice(0, 16) : '',
          priority: post.priority || 'medium',
          wp_category_ids: post.wp_category_ids || '',
          comment_text: post.comment_text || '',
        })
      })
    }
  }, [id])

  useEffect(() => {
    if (hasWordPress && wpCategories.length === 0 && !loadingCats) {
      setLoadingCats(true)
      platforms.wordpressCategories()
        .then(res => { if (res.ok) setWpCategories(res.categories) })
        .catch(() => {})
        .finally(() => setLoadingCats(false))
    }
  }, [hasWordPress])

  const selectedCatIds = useMemo(() => {
    if (!form.wp_category_ids) return []
    return form.wp_category_ids.split(',').filter(Boolean)
  }, [form.wp_category_ids])

  const toggleCategory = (catId) => {
    const cid = String(catId)
    const current = selectedCatIds.slice()
    const idx = current.indexOf(cid)
    if (idx >= 0) current.splice(idx, 1)
    else current.push(cid)
    setForm(f => ({ ...f, wp_category_ids: current.join(',') }))
  }

  const scheduledFuture = !!form.scheduled_time && new Date(form.scheduled_time) > new Date()
  const canPublish = isAdmin && (!isEdit || postStatus === 'draft' || (postStatus || '').startsWith('failed'))
  const publishNow = canPublish && !scheduledFuture

  let submitLabel = 'Lưu nháp'
  if (isAdmin) {
    submitLabel = publishNow ? 'Xuất bản' : scheduledFuture ? 'Hẹn giờ đăng' : 'Cập nhật'
  } else if (isEdit) {
    submitLabel = 'Cập nhật'
  }

  const buildData = () => {
    if (hasWordPress && wpEditorMode === 'visual' && editorRef.current) {
      setForm(f => ({ ...f, content: editorRef.current.getContent() }))
    }
    const currentContent = (hasWordPress && wpEditorMode === 'visual' && editorRef.current)
      ? editorRef.current.getContent()
      : form.content
    const checkContent = hasWordPress
      ? (() => { const d = document.createElement('div'); d.innerHTML = currentContent; return (d.textContent || '').trim() })()
      : currentContent.trim()
    if (!checkContent) {
      alert('Vui lòng nhập nội dung bài đăng')
      return null
    }
    const data = {
      title: form.title,
      content: currentContent,
      image_url: form.image_url,
      platforms: form.platforms,
      scheduled_time: form.scheduled_time || null,
      priority: form.priority,
    }
    if (hasWordPress && hasSocial && form.content_social) {
      data.content_social = form.content_social
    }
    if (hasWordPress && form.wp_category_ids) {
      data.wp_category_ids = form.wp_category_ids
    }
    data.comment_text = hasSocial && form.comment_text.trim() ? form.comment_text : null
    if (!isEdit && !savedId) data.created_by = user?.display_name || ''
    return data
  }

  const saveData = async (data) => {
    const existingId = id || savedId
    if (existingId) {
      await posts.update(existingId, data)
      return existingId
    }
    const created = await posts.create(data)
    setSavedId(created.id)
    return created.id
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = buildData()
    if (!data) return

    if (publishNow) {
      pendingData.current = data
      setModal({ step: 'confirm' })
      return
    }

    setLoading(true)
    try {
      await saveData(data)
      navigate('/posts')
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPublish = async () => {
    setModal({ step: 'publishing' })
    let postId
    try {
      postId = await saveData(pendingData.current)
    } catch (err) {
      setModal({ step: 'done', error: 'Không lưu được bài: ' + (err.response?.data?.detail || err.message) })
      return
    }
    try {
      const result = await posts.publish(postId)
      setModal({ step: 'done', result })
    } catch (err) {
      setModal({
        step: 'done',
        error: 'Bài đã được lưu nhưng đăng thất bại: ' + (err.response?.data?.detail || err.message),
      })
    }
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const result = await posts.uploadImages(files)
      const newUrls = [...imageUrls, ...result.urls]
      setForm(f => ({ ...f, image_url: newUrls.join(',') }))
      if (result.low_res?.length) {
        const list = result.low_res.map(i => `${i.name} (${i.width}x${i.height})`).join(', ')
        alert(`Ảnh có độ phân giải thấp, đăng lên Facebook dễ bị mờ/vỡ chữ: ${list}.\nNên dùng ảnh rộng từ ${result.min_width}px trở lên.`)
      }
    } catch {
      alert('Upload ảnh thất bại')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = (index) => {
    const newUrls = imageUrls.filter((_, i) => i !== index)
    setForm(f => ({ ...f, image_url: newUrls.join(',') }))
  }

  const handleTinyMCEImageUpload = (blobInfo) => {
    return new Promise((resolve, reject) => {
      const file = blobInfo.blob()
      posts.uploadImages([file])
        .then(result => {
          const url = result.urls?.[0]
          if (url) resolve(url)
          else reject('Upload that bai')
        })
        .catch(() => reject('Upload that bai'))
    })
  }

  const syncEditorToForm = () => {
    if (editorRef.current) {
      setForm(f => ({ ...f, content: editorRef.current.getContent() }))
    }
  }

  const switchMode = (mode) => {
    if (wpEditorMode === 'visual' && editorRef.current) {
      setForm(f => ({ ...f, content: editorRef.current.getContent() }))
    }
    setWpEditorMode(mode)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Chỉnh sửa bài đăng' : 'Thêm bài viết mới'}
        </h2>
      </div>

      {!isEdit && !isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          Bài đăng của bạn sẽ ở trạng thái <strong>Bản nháp</strong> và cần Admin duyệt trước khi đăng.
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Main content area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Title */}
          <input
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-400"
            placeholder="Thêm tiêu đề"
          />

          {/* WordPress visual editor */}
          {hasWordPress && (
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
              {/* Editor mode tabs */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-1">
                <div className="flex">
                  {[
                    { key: 'visual', label: 'Trực quan', icon: Eye },
                    { key: 'html', label: 'Mã', icon: null },
                  ].map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => switchMode(m.key)}
                      className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                        wpEditorMode === m.key
                          ? 'border-blue-500 text-blue-700 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('preview')}
                  className={`px-3 py-2 text-sm transition-colors ${
                    wpEditorMode === 'preview' ? 'text-blue-700 font-medium' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Xem trước
                </button>
              </div>

              {wpEditorMode === 'visual' && (
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js"
                  onInit={(_evt, editor) => { editorRef.current = editor }}
                  initialValue={form.content}
                  onBlur={syncEditorToForm}
                  init={{
                    height: 450,
                    menubar: 'file edit view insert format table',
                    plugins: 'table lists link image code autolink wordcount advlist media',
                    toolbar: 'blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist | table | link image media | code | removeformat',
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.7; padding: 8px; }',
                    images_upload_handler: handleTinyMCEImageUpload,
                    automatic_uploads: true,
                    file_picker_types: 'image',
                    promotion: false,
                    branding: false,
                    license_key: 'gpl',
                    paste_data_images: true,
                    table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
                    table_default_styles: { 'border-collapse': 'collapse', width: '100%' },
                    table_default_attributes: { border: '1' },
                    statusbar: true,
                    elementpath: true,
                  }}
                />
              )}

              {wpEditorMode === 'html' && (
                <textarea
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={18}
                  placeholder="Paste HTML từ WordPress, Gutenberg, hoặc nguồn khác..."
                  className="w-full px-4 py-3 text-sm font-mono focus:outline-none resize-y min-h-[400px]"
                  spellCheck={false}
                />
              )}

              {wpEditorMode === 'preview' && (
                <div className="px-6 py-5 min-h-[400px] prose prose-sm max-w-none overflow-x-auto">
                  {form.content ? (
                    <div dangerouslySetInnerHTML={{ __html: form.content }} />
                  ) : (
                    <p className="text-gray-400 italic">Chưa có nội dung</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Social-only editor (no WordPress) */}
          {!hasWordPress && hasSocial && (
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                {selected.facebook && <MessageSquareShare size={15} className="text-blue-600" />}
                {selected.linkedin && <Share2 size={15} className="text-sky-600" />}
                <span className="text-sm font-medium text-gray-700">
                  Nội dung {[selected.facebook && 'Facebook', selected.linkedin && 'LinkedIn'].filter(Boolean).join(' & ')}
                </span>
              </div>
              <textarea
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                rows={14}
                placeholder="Nhập nội dung bài đăng..."
                className="w-full px-4 py-3 text-sm focus:outline-none resize-y min-h-[300px]"
              />
            </div>
          )}

          {/* Social content when WordPress is also selected */}
          {hasWordPress && hasSocial && (
            <div className="border border-blue-200 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-blue-100 bg-blue-50">
                {selected.facebook && <MessageSquareShare size={15} className="text-blue-600" />}
                {selected.linkedin && <Share2 size={15} className="text-sky-600" />}
                <span className="text-sm font-medium text-blue-700">
                  Nội dung {[selected.facebook && 'Facebook', selected.linkedin && 'LinkedIn'].filter(Boolean).join(' & ')}
                </span>
                <span className="text-xs text-blue-400 ml-auto">
                  {form.content_social ? 'Nội dung riêng' : 'Tự động lấy từ WordPress'}
                </span>
              </div>
              <textarea
                value={form.content_social}
                onChange={(e) => setForm(f => ({ ...f, content_social: e.target.value }))}
                rows={6}
                placeholder="Nội dung text cho mạng xã hội (để trống sẽ lấy từ WordPress, tự bỏ HTML)..."
                className="w-full px-4 py-3 text-sm focus:outline-none resize-y min-h-[120px]"
              />
            </div>
          )}

          {/* Auto comment — ngay dưới nội dung social */}
          {hasSocial && (
            <div className="border border-amber-200 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-100 bg-amber-50">
                <MessageCircle size={15} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Bình luận tự động</span>
                <span className="text-xs text-amber-400 ml-auto">
                  Facebook & LinkedIn
                </span>
              </div>
              <textarea
                value={form.comment_text}
                onChange={(e) => setForm(f => ({ ...f, comment_text: e.target.value }))}
                rows={3}
                placeholder="Nội dung comment sau khi đăng bài (VD: link đăng ký, link Zalo, link form...)"
                className="w-full px-4 py-3 text-sm focus:outline-none resize-y min-h-[80px]"
              />
              <div className="px-4 pb-2.5">
                <p className="text-xs text-amber-500">
                  Tự động comment vào bài Facebook/LinkedIn sau khi đăng. Để trống = không comment.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Publish / Submit */}
          <SidebarPanel title="Xuất bản" icon={Send} variant="primary">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Trạng thái:</span>
                <span className="font-medium text-gray-700">
                  {isEdit ? 'Chỉnh sửa' : isAdmin ? 'Đăng & duyệt' : 'Bản nháp'}
                </span>
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-1 block">Độ ưu tiên</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="high">Cao — đăng trước</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp — đăng sau</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                  <Clock size={13} />
                  Hẹn giờ đăng
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_time}
                  onChange={(e) => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {isAdmin ? 'Để trống = đăng ngay khi bấm Xuất bản' : 'Để trống = đăng ngay khi workflow chạy'}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Đang lưu...' : submitLabel}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/posts')}
                  className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                >
                  Hủy
                </button>
              </div>
            </div>
          </SidebarPanel>

          {/* Platforms */}
          <SidebarPanel title="Nền tảng" icon={Globe}>
            <div className="space-y-1.5">
              {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                const active = selected[key]
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${
                      active ? cfg.bg : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => togglePlatform(key)}
                      className={`w-4 h-4 rounded ${cfg.check}`}
                    />
                    <Icon size={15} className={active ? cfg.color : 'text-gray-400'} />
                    <span className={`text-sm ${active ? 'font-medium text-gray-800' : 'text-gray-500'}`}>{cfg.label}</span>
                  </label>
                )
              })}
            </div>
          </SidebarPanel>

          {/* WordPress categories */}
          {hasWordPress && (
            <SidebarPanel title="Danh mục" icon={Tag}>
              {loadingCats && <p className="text-xs text-gray-400">Đang tải danh mục...</p>}
              {wpCategories.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {wpCategories.map(cat => {
                    const active = selectedCatIds.includes(String(cat.id))
                    return (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleCategory(cat.id)}
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                        <span className={`text-sm ${active ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                          {cat.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
              {!loadingCats && wpCategories.length === 0 && (
                <p className="text-xs text-gray-400">Không tải được danh mục</p>
              )}
              {selectedCatIds.length === 0 && wpCategories.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">Không chọn = mặc định WordPress</p>
              )}
            </SidebarPanel>
          )}

          {/* Featured image */}
          <SidebarPanel title="Ảnh đại diện" icon={Image}>
            <div>
              {imageUrls.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt={`Anh ${i + 1}`}
                        className="w-full h-auto rounded-lg border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center mb-3">
                  <Image size={28} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-xs text-gray-400">Chưa có ảnh</p>
                </div>
              )}

              <label className={`block w-full text-center px-3 py-2 bg-gray-100 text-sm rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? 'Đang upload...' : imageUrls.length > 0 ? 'Thêm ảnh' : 'Đặt ảnh đại diện'}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>

              <p className="text-xs text-gray-400 mt-1.5">
                {hasWordPress ? 'Featured image cho WordPress' : 'Ảnh đính kèm bài đăng'}
              </p>
            </div>
          </SidebarPanel>
        </div>
      </div>

      {modal && (
        <PublishModal
          step={modal.step}
          platforms={form.platforms.split(',').map(p => p.trim()).filter(Boolean)}
          result={modal.result}
          error={modal.error}
          onConfirm={handleConfirmPublish}
          onCancel={() => setModal(null)}
          onClose={() => navigate('/posts')}
        />
      )}
    </form>
  )
}
