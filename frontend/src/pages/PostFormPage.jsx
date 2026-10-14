import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, MessageSquareShare, Share2, Globe, ChevronUp, ChevronDown, ImagePlus, Pin, Eye, Calendar, Flag } from 'lucide-react'
import { Editor } from '@tinymce/tinymce-react'
import { posts, platforms } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const PLATFORM_CONFIG = {
  facebook: { label: 'Facebook', icon: MessageSquareShare },
  linkedin: { label: 'LinkedIn', icon: Share2 },
  wordpress: { label: 'WordPress', icon: Globe },
}

function MetaBox({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="wp-box">
      <button
        type="button"
        className="wp-box-head"
        onClick={() => setOpen(o => !o)}
        style={open ? undefined : { borderBottom: 0 }}
      >
        <h2>{title}</h2>
        {open ? <ChevronUp size={16} color="#50575e" /> : <ChevronDown size={16} color="#50575e" />}
      </button>
      {open && children}
    </div>
  )
}

const WP_META_DEFAULT = {
  slug: '', excerpt: '', tags: '',
  focus_kw: '', seo_title: '', meta_desc: '',
  toc_disable: false, toc_label: '', toc_position: '',
  toc_word_limit: '', toc_device: '', toc_align: '', toc_headings: '',
  toc_initial_hide: false, toc_hide_counter: false, toc_alt_titles: '', toc_exclude: '',
}
const WP_META_KEYS = Object.keys(WP_META_DEFAULT)

const parseMeta = (raw) => {
  try { return { ...WP_META_DEFAULT, ...(JSON.parse(raw || '{}') || {}) } } catch { return { ...WP_META_DEFAULT } }
}

const slugify = (str) => (str || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const plainText = (html) => {
  const d = document.createElement('div')
  d.innerHTML = html || ''
  return (d.textContent || '').trim()
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
    ...WP_META_DEFAULT,
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [wpEditorMode, setWpEditorMode] = useState('visual')
  const [showPreview, setShowPreview] = useState(false)
  const [catTab, setCatTab] = useState('all')
  const [wpCategories, setWpCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)

  const imageUrls = form.image_url ? form.image_url.split(',').filter(u => u.trim()) : []

  const selected = useMemo(() => {
    const parts = form.platforms.split(',').map(p => p.trim()).filter(Boolean)
    return { facebook: parts.includes('facebook'), linkedin: parts.includes('linkedin'), wordpress: parts.includes('wordpress') }
  }, [form.platforms])

  const hasWordPress = selected.wordpress
  const hasSocial = selected.facebook || selected.linkedin
  const socialLabel = [selected.facebook && 'Facebook', selected.linkedin && 'LinkedIn'].filter(Boolean).join(' & ')

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
          ...parseMeta(post.wp_meta),
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

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const setBool = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.checked }))
  const tocHeadings = (form.toc_headings || '').split(',').filter(Boolean)
  const toggleTocHeading = (n) => {
    const cur = new Set(tocHeadings)
    const k = String(n)
    if (cur.has(k)) cur.delete(k)
    else cur.add(k)
    setForm(f => ({ ...f, toc_headings: [...cur].sort().join(',') }))
  }

  const getCurrentContent = () => (
    hasWordPress && wpEditorMode === 'visual' && editorRef.current
      ? editorRef.current.getContent()
      : form.content
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    const currentContent = getCurrentContent()
    const checkContent = hasWordPress ? plainText(currentContent) : currentContent.trim()
    if (!checkContent) {
      alert('Vui lòng nhập nội dung bài đăng')
      return
    }
    setLoading(true)
    try {
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
      if (hasSocial && form.comment_text) {
        data.comment_text = form.comment_text
      }
      if (hasWordPress) {
        const meta = {}
        WP_META_KEYS.forEach(k => { if (form[k]) meta[k] = form[k] })
        data.wp_meta = JSON.stringify(meta)
      }
      if (!isEdit) data.created_by = user?.display_name || ''
      if (isEdit) {
        await posts.update(id, data)
      } else {
        await posts.create(data)
      }
      navigate('/posts')
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
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
    } catch {
      alert('Upload ảnh thất bại')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // "Thêm tập tin phương tiện": chèn ảnh thẳng vào nội dung bài viết
  const handleInsertMedia = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const result = await posts.uploadImages(files)
      const html = result.urls.map(u => `<p><img src="${u}" alt="" /></p>`).join('')
      if (wpEditorMode === 'visual' && editorRef.current) {
        editorRef.current.insertContent(html)
      } else {
        setForm(f => ({ ...f, content: (f.content || '') + html }))
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
      posts.uploadImages([blobInfo.blob()])
        .then(result => {
          const url = result.urls?.[0]
          if (url) resolve(url)
          else reject('Upload thất bại')
        })
        .catch(() => reject('Upload thất bại'))
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

  const handleTrash = async () => {
    if (!isEdit) { navigate('/posts'); return }
    if (!confirm('Chuyển bài viết này vào thùng rác?')) return
    try {
      await posts.delete(id)
      navigate('/posts')
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.detail || err.message))
    }
  }

  const submitLabel = loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : isAdmin ? 'Xuất bản' : 'Lưu nháp'
  const wordCount = (() => {
    const t = plainText(form.content)
    return t ? t.split(/\s+/).length : 0
  })()

  return (
    <form onSubmit={handleSubmit} className="wp-wrap">
      <h1 className="wp-heading">{isEdit ? 'Sửa bài viết' : 'Thêm bài viết'}</h1>

      {!isEdit && !isAdmin && (
        <div style={{ background: '#fcf9e8', borderLeft: '4px solid #dba617', padding: '10px 12px', marginBottom: 16, boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
          Bài đăng của bạn sẽ ở trạng thái <strong>Bản nháp</strong> và cần Admin duyệt trước khi đăng.
        </div>
      )}

      <div className="wp-layout">
        {/* ===== Cột chính ===== */}
        <div className="wp-main">
          <input
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            className="wp-title"
            placeholder="Thêm tiêu đề"
          />

          {hasWordPress && (
            <>
              <div className="wp-editor-tools">
                <label className="wp-btn wp-media-btn" style={uploading ? { opacity: 0.5 } : undefined}>
                  <ImagePlus size={15} /> {uploading ? 'Đang tải lên...' : 'Thêm tập tin phương tiện'}
                  <input type="file" accept="image/*" multiple onChange={handleInsertMedia} style={{ display: 'none' }} />
                </label>
                <div className="wp-tabs">
                  <button type="button" className={`wp-tab ${wpEditorMode === 'visual' ? 'active' : ''}`} onClick={() => switchMode('visual')}>Trực quan</button>
                  <button type="button" className={`wp-tab ${wpEditorMode === 'html' ? 'active' : ''}`} onClick={() => switchMode('html')}>Văn bản</button>
                </div>
              </div>

              <div className="wp-editor-wrap">
                {wpEditorMode === 'visual' && (
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    onInit={(_evt, editor) => { editorRef.current = editor }}
                    initialValue={form.content}
                    onBlur={syncEditorToForm}
                    init={{
                      height: 500,
                      menubar: false,
                      plugins: 'table lists link image code autolink wordcount advlist media charmap fullscreen',
                      toolbar: 'blocks | bold italic | bullist numlist blockquote | alignleft aligncenter alignright | link | table image media | fullscreen | strikethrough hr forecolor backcolor | pastetext removeformat charmap | outdent indent | undo redo | code',
                      toolbar_mode: 'wrap',
                      content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 16px; line-height: 1.7; padding: 10px; }',
                      images_upload_handler: handleTinyMCEImageUpload,
                      automatic_uploads: true,
                      file_picker_types: 'image',
                      promotion: false,
                      branding: false,
                      license_key: 'gpl',
                      paste_data_images: true,
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
                    className="wp-textarea"
                    placeholder="Dán HTML từ WordPress, Gutenberg hoặc nguồn khác..."
                    spellCheck={false}
                  />
                )}
              </div>
              <div className="wp-wordcount">Số từ: {wordCount}</div>

              <MetaBox title="Yoast SEO">
                <div className="wp-box-body">
                  <label className="wp-label">Cụm từ khóa chính</label>
                  <input className="wp-field" value={form.focus_kw} onChange={set('focus_kw')} />

                  <div className="wp-label" style={{ marginTop: 16 }}>Google xem trước</div>
                  <div className="wp-serp">
                    <div className="wp-serp-url">{(window.__WP_HOST__ || 'mcna.vn')} › {form.slug || slugify(form.title) || 'duong-dan'}</div>
                    <div className="wp-serp-title">{form.seo_title || form.title || 'Tiêu đề SEO'} - MCNA</div>
                    <div className="wp-serp-desc">{form.meta_desc || plainText(form.content).slice(0, 155) || 'Mô tả sẽ hiển thị trong kết quả tìm kiếm.'}</div>
                  </div>

                  <label className="wp-label" style={{ marginTop: 16 }}>Tiêu đề SEO</label>
                  <input className="wp-field" value={form.seo_title} onChange={set('seo_title')} placeholder="Tiêu đề trang - Tiêu đề website" />

                  <label className="wp-label" style={{ marginTop: 16 }}>Đường dẫn</label>
                  <input className="wp-field" value={form.slug} onChange={set('slug')} placeholder={slugify(form.title)} />

                  <label className="wp-label" style={{ marginTop: 16 }}>
                    Thẻ mô tả <span style={{ color: '#646970', fontWeight: 400 }}>({form.meta_desc.length}/156)</span>
                  </label>
                  <textarea className="wp-field" style={{ minHeight: 80, padding: 8 }} value={form.meta_desc} onChange={set('meta_desc')} />
                </div>
              </MetaBox>

              <MetaBox title="Trích dẫn" defaultOpen={false}>
                <div className="wp-box-body">
                  <textarea className="wp-field" style={{ minHeight: 80, padding: 8 }} value={form.excerpt} onChange={set('excerpt')} />
                  <p style={{ color: '#646970', margin: '6px 0 0' }}>Đoạn trích là phần tóm tắt tùy chọn của nội dung bài viết.</p>
                </div>
              </MetaBox>

              <MetaBox title="Mục lục">
                <div className="wp-toc">
                  <div className="wp-toc-row">
                    <div className="wp-toc-label" />
                    <div className="wp-toc-field">
                      <label className="wp-toc-check">
                        <input type="checkbox" checked={!!form.toc_disable} onChange={setBool('toc_disable')} />
                        Tắt tính năng tự động chèn mục lục.
                      </label>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Nhãn tiêu đề</div>
                    <div className="wp-toc-field">
                      <input className="wp-field wp-toc-input" value={form.toc_label} onChange={set('toc_label')} />
                      <p className="wp-toc-help">Ví dụ: Nội dung, Mục lục, Nội dung trang</p>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Vị trí</div>
                    <div className="wp-toc-field">
                      <select className="wp-field wp-toc-select" value={form.toc_position} onChange={set('toc_position')}>
                        <option value="">Chọn vị trí</option>
                        <option value="before">Trước tiêu đề đầu tiên</option>
                        <option value="after">Sau tiêu đề đầu tiên</option>
                        <option value="top">Đầu bài viết</option>
                        <option value="bottom">Cuối bài viết</option>
                      </select>
                      <span className="wp-toc-help-inline">Chọn nơi bạn muốn hiển thị mục lục.</span>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Word Count Limit</div>
                    <div className="wp-toc-field">
                      <input type="number" min="0" className="wp-field wp-toc-small" value={form.toc_word_limit} onChange={set('toc_word_limit')} />
                      <span className="wp-toc-help-inline">Minimum word count to display TOC. Set to 0 for unlimited words (default).</span>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Giao diện:</div>
                    <div className="wp-toc-field">
                      <strong>GHI CHÚ:</strong>
                      <p className="wp-toc-help">Sử dụng các tùy chọn giao diện bên dưới sẽ ghi đè lên các cài đặt Giao diện toàn cầu.</p>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Thiết bị mục tiêu</div>
                    <div className="wp-toc-field">
                      <select className="wp-field wp-toc-select" value={form.toc_device} onChange={set('toc_device')}>
                        <option value="">Chọn</option>
                        <option value="all">Tất cả thiết bị</option>
                        <option value="desktop">Máy tính</option>
                        <option value="mobile">Di động</option>
                      </select>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Căn chỉnh</div>
                    <div className="wp-toc-field">
                      <select className="wp-field wp-toc-select" value={form.toc_align} onChange={set('toc_align')}>
                        <option value="">Không có (Mặc định)</option>
                        <option value="left">Trái</option>
                        <option value="center">Giữa</option>
                        <option value="right">Phải</option>
                      </select>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Nâng cao:</div>
                    <div className="wp-toc-field">
                      <strong>GHI CHÚ:</strong>
                      <p className="wp-toc-help">Sử dụng các tùy chọn nâng cao bên dưới sẽ ghi đè cài đặt nâng cao chung.</p>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Đề mục</div>
                    <div className="wp-toc-field">
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <label key={n} className="wp-toc-check" style={{ margin: '2px 0' }}>
                          <input type="checkbox" checked={tocHeadings.includes(String(n))} onChange={() => toggleTocHeading(n)} />
                          Tiêu đề mục {n} (h{n})
                        </label>
                      ))}
                      <p className="wp-toc-help">Chọn tiêu đề cần xem xét khi tạo mục lục. Bỏ chọn một tiêu đề sẽ loại trừ nó.</p>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Lượt xem ban đầu</div>
                    <div className="wp-toc-field">
                      <label className="wp-toc-check">
                        <input type="checkbox" checked={!!form.toc_initial_hide} onChange={setBool('toc_initial_hide')} />
                        Ẩn mục lục ban đầu.
                      </label>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Ẩn bộ đếm</div>
                    <div className="wp-toc-field">
                      <label className="wp-toc-check">
                        <input type="checkbox" checked={!!form.toc_hide_counter} onChange={setBool('toc_hide_counter')} />
                        Không hiển thị bộ đếm cho mục lục.
                      </label>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Tiêu đề thay thế</div>
                    <div className="wp-toc-field">
                      <textarea className="wp-field" style={{ minHeight: 200, padding: 8 }} value={form.toc_alt_titles} onChange={set('toc_alt_titles')} />
                      <p className="wp-toc-help">
                        Chỉ định chuỗi tiêu đề mục lục thay thế. Thêm tiêu đề cần thay thế và tiêu đề thay thế trên một dòng được phân tách bằng dấu <code>|</code>. Đặt từng tiêu đề gốc và tiêu đề thay thế bổ sung trên dòng riêng của nó.
                      </p>
                      <p className="wp-toc-help"><strong>Ví dụ:</strong></p>
                      <p className="wp-toc-help"><code>Level [1.1]|Đầu trang TOC thay thế</code> Thay thế mức [1.1] trong mục lục bằng đầu trang TOC thay thế.</p>
                      <p className="wp-toc-help"><strong>Lưu ý:</strong> Điều này phân biệt chữ hoa chữ thường.</p>
                    </div>
                  </div>

                  <div className="wp-toc-row">
                    <div className="wp-toc-label">Loại trừ các tiêu đề</div>
                    <div className="wp-toc-field">
                      <input className="wp-field wp-toc-input" style={{ maxWidth: '100%' }} value={form.toc_exclude} onChange={set('toc_exclude')} />
                      <p className="wp-toc-help">
                        Chỉ định các tiêu đề cần loại trừ khỏi mục lục bài viết. Phân tách nhiều tiêu đề bằng dấu gạch đứng <code>|</code>. Sử dụng dấu hoa thị <code>*</code> như ký tự đại diện để khớp với các văn bản khác.
                      </p>
                      <p className="wp-toc-help"><strong>Ví dụ:</strong></p>
                      <p className="wp-toc-help"><code>Fruit*</code> Bỏ qua các tiêu đề bắt đầu bằng "Fruit"</p>
                      <p className="wp-toc-help"><code>*Fruit Diet*</code> Bỏ qua các tiêu đề có chứa "Fruit Diet" ở đâu đó trong tiêu đề.</p>
                      <p className="wp-toc-help"><code>Cây Táo|Cam|Chuối Vàng</code> Bỏ qua các tiêu đề chính xác là "Apple Tree", "Oranges" hoặc "Yellow Bananas"</p>
                      <p className="wp-toc-help"><code>Lưu ý: Điều này không phân biệt chữ hoa chữ thường.</code></p>
                    </div>
                  </div>
                </div>
              </MetaBox>
            </>
          )}

          {!hasWordPress && hasSocial && (
            <div className="wp-box" style={{ marginTop: 20 }}>
              <div className="wp-box-head" style={{ cursor: 'default' }}>
                <h2>Nội dung {socialLabel}</h2>
              </div>
              <textarea
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                className="wp-textarea"
                style={{ fontFamily: 'inherit', fontSize: 14 }}
                placeholder="Nhập nội dung bài đăng..."
              />
            </div>
          )}

          {hasWordPress && hasSocial && (
            <div className="wp-box" style={{ marginTop: 20 }}>
              <div className="wp-box-head" style={{ cursor: 'default' }}>
                <h2>Nội dung {socialLabel}</h2>
                <span style={{ color: '#646970', fontSize: 12 }}>
                  {form.content_social ? 'Nội dung riêng' : 'Tự động lấy từ WordPress'}
                </span>
              </div>
              <textarea
                value={form.content_social}
                onChange={(e) => setForm(f => ({ ...f, content_social: e.target.value }))}
                className="wp-textarea"
                style={{ fontFamily: 'inherit', fontSize: 14, minHeight: 140 }}
                placeholder="Nội dung text cho mạng xã hội (để trống sẽ lấy từ WordPress, tự bỏ HTML)..."
              />
            </div>
          )}

          {hasSocial && (
            <div className="wp-box" style={{ marginTop: hasWordPress ? 0 : 20 }}>
              <div className="wp-box-head" style={{ cursor: 'default' }}>
                <h2>Bình luận tự động</h2>
                <span style={{ color: '#646970', fontSize: 12 }}>Facebook & LinkedIn</span>
              </div>
              <textarea
                value={form.comment_text}
                onChange={(e) => setForm(f => ({ ...f, comment_text: e.target.value }))}
                className="wp-textarea"
                style={{ fontFamily: 'inherit', fontSize: 14, minHeight: 90 }}
                placeholder="Nội dung comment sau khi đăng bài (VD: link đăng ký, link Zalo, link form...)"
              />
              <div className="wp-wordcount" style={{ border: 0, borderTop: '1px solid #dcdcde' }}>
                Tự động comment vào bài Facebook/LinkedIn sau khi đăng. Để trống = không comment.
              </div>
            </div>
          )}
        </div>

        {/* ===== Sidebar ===== */}
        <div className="wp-side">
          <MetaBox title="Xuất bản">
            <div className="wp-box-body">
              <div style={{ marginBottom: 10 }}>
                <button type="button" className="wp-btn" onClick={() => { syncEditorToForm(); setShowPreview(true) }}>Xem trước</button>
              </div>
              <div className="wp-row"><Pin size={15} /> Trạng thái: <b>{isEdit ? 'Chỉnh sửa' : isAdmin ? 'Xuất bản' : 'Bản nháp'}</b></div>
              <div className="wp-row"><Eye size={15} /> Hiển thị: <b>Công khai</b></div>
              <div className="wp-row">
                <Flag size={15} /> Ưu tiên:
                <select
                  value={form.priority}
                  onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="wp-field"
                  style={{ flex: 1 }}
                >
                  <option value="high">Cao — đăng trước</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp — đăng sau</option>
                </select>
              </div>
              <div className="wp-row" style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Calendar size={15} /> Lên lịch đăng:</span>
                <input
                  type="datetime-local"
                  value={form.scheduled_time}
                  onChange={(e) => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                  className="wp-field"
                />
                <span style={{ color: '#646970', fontSize: 12 }}>Để trống = đăng ngay khi workflow chạy</span>
              </div>
            </div>
            <div className="wp-publish-foot">
              <button type="button" className="wp-link-danger" onClick={handleTrash}>
                {isEdit ? 'Chuyển vào thùng rác' : 'Hủy'}
              </button>
              <button type="submit" disabled={loading} className="wp-btn wp-btn-primary">{submitLabel}</button>
            </div>
          </MetaBox>

          <MetaBox title="Nền tảng đăng">
            <div className="wp-box-body wp-platform">
              {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <label key={key}>
                    <input type="checkbox" checked={selected[key]} onChange={() => togglePlatform(key)} />
                    <Icon size={15} color="#50575e" /> {cfg.label}
                  </label>
                )
              })}
            </div>
          </MetaBox>

          {hasWordPress && (
            <MetaBox title="Danh mục">
              <div className="wp-box-body">
                <div className="wp-cat-tabs">
                  <button type="button" className={`wp-cat-tab ${catTab === 'all' ? 'active' : ''}`} onClick={() => setCatTab('all')}>Tất cả danh mục</button>
                  <button type="button" className={`wp-cat-tab ${catTab === 'selected' ? 'active' : ''}`} onClick={() => setCatTab('selected')}>Đã chọn</button>
                </div>
                <div className="wp-cat-list">
                  {loadingCats && <p style={{ color: '#646970' }}>Đang tải danh mục...</p>}
                  {wpCategories
                    .filter(cat => catTab === 'all' || selectedCatIds.includes(String(cat.id)))
                    .map(cat => (
                      <label key={cat.id}>
                        <input
                          type="checkbox"
                          checked={selectedCatIds.includes(String(cat.id))}
                          onChange={() => toggleCategory(cat.id)}
                        />
                        {cat.name}
                      </label>
                    ))}
                  {!loadingCats && wpCategories.length === 0 && <p style={{ color: '#646970' }}>Không tải được danh mục</p>}
                </div>
                {selectedCatIds.length === 0 && wpCategories.length > 0 && (
                  <p style={{ color: '#646970', fontSize: 12, margin: 0 }}>Không chọn = danh mục mặc định của WordPress</p>
                )}
              </div>
            </MetaBox>
          )}

          {hasWordPress && (
            <MetaBox title="Thẻ">
              <div className="wp-box-body">
                <input
                  className="wp-field"
                  value={form.tags}
                  onChange={set('tags')}
                  placeholder="Thẻ 1, thẻ 2, ..."
                />
                <p style={{ color: '#646970', margin: '6px 0 0' }}>Phân cách các thẻ bằng dấu phẩy</p>
              </div>
            </MetaBox>
          )}

          <MetaBox title="Ảnh đại diện">
            <div className="wp-box-body">
              {imageUrls.map((url, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <img src={url} alt={`Ảnh ${i + 1}`} style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 4 }} />
                  <button type="button" className="wp-link-danger" onClick={() => removeImage(i)}>Xóa ảnh đại diện</button>
                </div>
              ))}
              <label className="wp-link" style={{ display: 'inline-block' }}>
                {uploading ? 'Đang upload...' : imageUrls.length > 0 ? 'Thêm ảnh' : 'Đặt ảnh đại diện'}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
              <p style={{ color: '#646970', fontSize: 12, marginTop: 6 }}>
                {hasWordPress ? 'Ảnh đầu tiên là ảnh đại diện (Featured image) trên WordPress' : 'Ảnh đính kèm bài đăng'}
              </p>
            </div>
          </MetaBox>
        </div>
      </div>

      {showPreview && (
        <div className="wp-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="wp-preview-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <span>Xem trước: {form.title || '(Không có tiêu đề)'}</span>
              <button type="button" className="wp-link" onClick={() => setShowPreview(false)}><X size={18} /></button>
            </header>
            <div className="wp-preview-content">
              {imageUrls[0] && <img src={imageUrls[0]} alt="" style={{ marginBottom: 16 }} />}
              <h1 style={{ fontSize: 28, marginBottom: 16 }}>{form.title}</h1>
              {getCurrentContent()
                ? (hasWordPress
                    ? <div dangerouslySetInnerHTML={{ __html: getCurrentContent() }} />
                    : <p style={{ whiteSpace: 'pre-wrap' }}>{getCurrentContent()}</p>)
                : <p style={{ color: '#888' }}>Chưa có nội dung</p>}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
