// Chấm điểm SEO & khả năng đọc kiểu Yoast, chạy ngay trên trình duyệt.
// Mỗi tiêu chí trả về status: 'good' | 'ok' | 'bad' và một câu gợi ý tiếng Việt.

export const SEO_TITLE_SUFFIX = ' - MCNA'
export const TITLE_MAX = 60
export const DESC_MIN = 120
export const DESC_MAX = 156

const SCORE = { good: 9, ok: 6, bad: 3 }

export const slugify = (str) => (str || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const norm = (s) => (s || '').normalize('NFC').toLowerCase().trim()
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)

const countKw = (text, kw) => {
  if (!kw) return 0
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(kw)}(?![\\p{L}\\p{N}])`, 'giu')
  return (norm(text).match(re) || []).length
}
const hasKw = (text, kw) => countKw(text, kw) > 0

const splitSentences = (text) => text
  .split(/(?<=[.!?…])\s+|\n+/)
  .map(s => s.trim())
  .filter(s => countWords(s) > 0)

const parseHtml = (html) => {
  // Chèn khoảng trắng sau thẻ khối để chữ của 2 đoạn liền nhau không bị dính vào nhau
  const spaced = (html || '')
    .replace(/<\/(p|h[1-6]|li|div|td|th|blockquote|figcaption)>/gi, '$& ')
    .replace(/<br\s*\/?>/gi, ' ')
  const doc = new DOMParser().parseFromString(spaced, 'text/html')
  const body = doc.body
  const text = (body.textContent || '').replace(/\s+/g, ' ').trim()
  const paragraphs = [...body.querySelectorAll('p, li')]
    .map(p => (p.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  // Nội dung dán dạng text thuần (không có thẻ <p>) thì tách theo dòng
  const paras = paragraphs.length ? paragraphs : (html || '').split(/\n\s*\n|<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
  const headings = [...body.querySelectorAll('h2, h3')].map(h => (h.textContent || '').trim())
  const h1Count = body.querySelectorAll('h1').length
  const images = [...body.querySelectorAll('img')].map(i => i.getAttribute('alt') || '')
  const links = [...body.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))

  // Số từ giữa các tiêu đề con
  const sections = []
  let cur = 0
  const walk = (node) => {
    for (const el of node.children) {
      if (/^H[2-6]$/.test(el.tagName)) { sections.push(cur); cur = 0 } else if (el.children.length && !/^(P|LI)$/.test(el.tagName)) walk(el)
      else cur += countWords(el.textContent || '')
    }
  }
  walk(body)
  sections.push(cur)

  return { text, paras, headings, h1Count, images, links, sections }
}

const item = (id, status, label, text) => ({ id, status, label, text })

export function analyzeSeo(form, content, opts = {}) {
  const host = opts.host || 'mcna.vn'
  const kw = norm(form.focus_kw)
  const { text, paras, headings, h1Count, images, links } = parseHtml(content)
  const words = countWords(text)
  const seoTitle = form.seo_title || form.title || ''
  const metaDesc = form.meta_desc || ''
  const slug = form.slug || slugify(form.title)
  const kwSlug = slugify(kw)
  const featured = (form.image_url || '').split(',').filter(u => u.trim()).length > 0
  const out = []

  if (!kw) {
    out.push(item('kw', 'bad', 'Cụm từ khóa chính', 'Chưa nhập cụm từ khóa chính. Hãy nhập để được chấm điểm đầy đủ.'))
  } else {
    // Từ khóa trong tiêu đề SEO
    const t = norm(seoTitle)
    if (t.startsWith(kw)) out.push(item('kw_title', 'good', 'Từ khóa trong tiêu đề SEO', 'Tiêu đề SEO bắt đầu bằng từ khóa chính. Tốt!'))
    else if (t.includes(kw)) out.push(item('kw_title', 'ok', 'Từ khóa trong tiêu đề SEO', 'Tiêu đề SEO có từ khóa nhưng không ở đầu. Nên đưa từ khóa lên đầu tiêu đề.'))
    else out.push(item('kw_title', 'bad', 'Từ khóa trong tiêu đề SEO', 'Tiêu đề SEO chưa có từ khóa chính.'))

    // Từ khóa trong mô tả
    if (!metaDesc) out.push(item('kw_desc', 'bad', 'Từ khóa trong thẻ mô tả', 'Chưa có thẻ mô tả nên không chứa từ khóa.'))
    else if (hasKw(metaDesc, kw)) out.push(item('kw_desc', 'good', 'Từ khóa trong thẻ mô tả', 'Thẻ mô tả có chứa từ khóa chính. Tốt!'))
    else out.push(item('kw_desc', 'bad', 'Từ khóa trong thẻ mô tả', 'Thẻ mô tả chưa có từ khóa chính.'))

    // Từ khóa trong slug
    if (kwSlug && slug.includes(kwSlug)) out.push(item('kw_slug', 'good', 'Từ khóa trong đường dẫn', 'Đường dẫn có chứa từ khóa chính. Tốt!'))
    else out.push(item('kw_slug', 'ok', 'Từ khóa trong đường dẫn', `Đường dẫn chưa chứa từ khóa. Gợi ý: "${kwSlug}".`))

    // Từ khóa ở đoạn mở đầu
    if (!paras.length) out.push(item('kw_intro', 'bad', 'Từ khóa ở đoạn mở đầu', 'Chưa có nội dung.'))
    else if (hasKw(paras[0], kw)) out.push(item('kw_intro', 'good', 'Từ khóa ở đoạn mở đầu', 'Từ khóa xuất hiện ngay đoạn đầu tiên. Tốt!'))
    else out.push(item('kw_intro', 'bad', 'Từ khóa ở đoạn mở đầu', 'Đoạn đầu tiên chưa có từ khóa chính. Hãy nhắc tới từ khóa ngay phần mở bài.'))

    // Mật độ từ khóa
    const cnt = countKw(text, kw)
    // Cách tính giống Yoast: số lần xuất hiện / tổng số từ
    const density = words ? (cnt / words) * 100 : 0
    const d = density.toFixed(1)
    if (cnt === 0) out.push(item('density', 'bad', 'Mật độ từ khóa', 'Từ khóa chưa xuất hiện trong nội dung.'))
    else if (density > 3) out.push(item('density', 'bad', 'Mật độ từ khóa', `Từ khóa xuất hiện ${cnt} lần (${d}%), quá dày. Nên giảm xuống dưới 3%.`))
    else if (density < 0.5) out.push(item('density', 'ok', 'Mật độ từ khóa', `Từ khóa xuất hiện ${cnt} lần (${d}%), hơi ít. Nên đạt 0.5–3%.`))
    else out.push(item('density', 'good', 'Mật độ từ khóa', `Từ khóa xuất hiện ${cnt} lần (${d}%). Tốt!`))

    // Từ khóa trong tiêu đề con
    if (!headings.length) out.push(item('kw_sub', 'ok', 'Từ khóa trong tiêu đề con', 'Bài chưa có tiêu đề con H2/H3.'))
    else if (headings.some(h => hasKw(h, kw))) out.push(item('kw_sub', 'good', 'Từ khóa trong tiêu đề con', 'Có tiêu đề con H2/H3 chứa từ khóa. Tốt!'))
    else out.push(item('kw_sub', 'ok', 'Từ khóa trong tiêu đề con', 'Chưa có tiêu đề con H2/H3 nào chứa từ khóa.'))

    // Alt ảnh
    if (images.length && images.some(a => hasKw(a, kw))) out.push(item('kw_alt', 'good', 'Từ khóa trong alt ảnh', 'Có ảnh với thuộc tính alt chứa từ khóa. Tốt!'))
    else if (images.length) out.push(item('kw_alt', 'ok', 'Từ khóa trong alt ảnh', 'Ảnh trong bài chưa có alt chứa từ khóa. Bấm vào ảnh trong trình soạn thảo để thêm mô tả (alt).'))
  }

  // Độ dài tiêu đề SEO
  const fullTitleLen = seoTitle ? (seoTitle + SEO_TITLE_SUFFIX).length : 0
  if (!seoTitle) out.push(item('title_len', 'bad', 'Độ dài tiêu đề SEO', 'Chưa có tiêu đề.'))
  else if (fullTitleLen > TITLE_MAX) out.push(item('title_len', 'bad', 'Độ dài tiêu đề SEO', `Tiêu đề dài ${fullTitleLen} ký tự, Google sẽ cắt bớt. Nên ≤ ${TITLE_MAX}.`))
  else if (fullTitleLen < 40) out.push(item('title_len', 'ok', 'Độ dài tiêu đề SEO', `Tiêu đề hơi ngắn (${fullTitleLen} ký tự). Nên 40–${TITLE_MAX}.`))
  else out.push(item('title_len', 'good', 'Độ dài tiêu đề SEO', `Độ dài tiêu đề ${fullTitleLen} ký tự. Tốt!`))

  // Độ dài mô tả
  if (!metaDesc) out.push(item('desc_len', 'bad', 'Độ dài thẻ mô tả', 'Chưa có thẻ mô tả. Google sẽ tự lấy đoạn bất kỳ trong bài.'))
  else if (metaDesc.length > DESC_MAX) out.push(item('desc_len', 'bad', 'Độ dài thẻ mô tả', `Thẻ mô tả dài ${metaDesc.length} ký tự. Nên ≤ ${DESC_MAX}.`))
  else if (metaDesc.length < DESC_MIN) out.push(item('desc_len', 'ok', 'Độ dài thẻ mô tả', `Thẻ mô tả hơi ngắn (${metaDesc.length} ký tự). Nên ${DESC_MIN}–${DESC_MAX}.`))
  else out.push(item('desc_len', 'good', 'Độ dài thẻ mô tả', `Độ dài thẻ mô tả ${metaDesc.length} ký tự. Tốt!`))

  // Độ dài bài
  if (words >= 300) out.push(item('length', 'good', 'Độ dài nội dung', `Bài có ${words} từ. Tốt!`))
  else if (words >= 200) out.push(item('length', 'ok', 'Độ dài nội dung', `Bài có ${words} từ, hơi ngắn. Nên ≥ 300 từ.`))
  else out.push(item('length', 'bad', 'Độ dài nội dung', `Bài chỉ có ${words} từ. Nên viết ≥ 300 từ.`))

  // Liên kết
  const internal = links.filter(h => h.startsWith('/') || h.includes(host)).length
  const outbound = links.filter(h => /^https?:\/\//.test(h) && !h.includes(host)).length
  out.push(internal
    ? item('internal', 'good', 'Liên kết nội bộ', `Có ${internal} liên kết tới bài khác trên ${host}. Tốt!`)
    : item('internal', 'ok', 'Liên kết nội bộ', `Chưa có liên kết tới trang khác của ${host}. Nên thêm ít nhất 1.`))
  out.push(outbound
    ? item('outbound', 'good', 'Liên kết ra ngoài', `Có ${outbound} liên kết ra ngoài. Tốt!`)
    : item('outbound', 'ok', 'Liên kết ra ngoài', 'Chưa có liên kết tới nguồn bên ngoài.'))

  // Ảnh
  if (images.length || featured) {
    const noAlt = images.filter(a => !a.trim()).length
    if (noAlt) out.push(item('images', 'ok', 'Hình ảnh', `${noAlt} ảnh trong bài chưa có mô tả (alt).`))
    else out.push(item('images', 'good', 'Hình ảnh', 'Bài có hình ảnh. Tốt!'))
  } else out.push(item('images', 'bad', 'Hình ảnh', 'Bài chưa có ảnh nào. Hãy thêm ảnh đại diện hoặc ảnh trong bài.'))

  // H1
  if (h1Count > 0) out.push(item('h1', 'bad', 'Tiêu đề H1', `Nội dung có ${h1Count} thẻ H1. Tiêu đề bài đã là H1, trong bài chỉ nên dùng H2/H3.`))

  return finalize(out)
}

export function analyzeReadability(content) {
  const { text, paras, headings, sections } = parseHtml(content)
  const words = countWords(text)
  const out = []
  if (!words) return finalize([item('empty', 'bad', 'Nội dung', 'Chưa có nội dung để phân tích.')])

  // Độ dài câu (tiếng Việt tính theo âm tiết nên ngưỡng cao hơn tiếng Anh)
  const sentences = splitSentences(text)
  const longS = sentences.filter(s => countWords(s) > 30).length
  const pct = sentences.length ? Math.round(longS / sentences.length * 100) : 0
  if (pct <= 25) out.push(item('sentence', 'good', 'Độ dài câu', `${pct}% số câu dài hơn 30 từ. Tốt!`))
  else if (pct <= 35) out.push(item('sentence', 'ok', 'Độ dài câu', `${pct}% số câu dài hơn 30 từ. Nên ≤ 25%, hãy tách bớt câu dài.`))
  else out.push(item('sentence', 'bad', 'Độ dài câu', `${pct}% số câu dài hơn 30 từ, quá nhiều. Hãy tách câu cho dễ đọc.`))

  // Độ dài đoạn
  const longP = paras.filter(p => countWords(p) > 150).length
  if (!longP) out.push(item('paragraph', 'good', 'Độ dài đoạn văn', 'Không có đoạn nào quá dài. Tốt!'))
  else out.push(item('paragraph', longP > 1 ? 'bad' : 'ok', 'Độ dài đoạn văn', `${longP} đoạn dài hơn 150 từ. Hãy chia nhỏ đoạn.`))

  // Phân bố tiêu đề con
  if (words > 300 && !headings.length) {
    out.push(item('subheading', 'bad', 'Phân bố tiêu đề con', 'Bài dài nhưng chưa có tiêu đề con H2/H3. Hãy chia bài thành nhiều mục.'))
  } else if (words > 300) {
    const tooLong = sections.filter(n => n > 300).length
    out.push(tooLong
      ? item('subheading', 'ok', 'Phân bố tiêu đề con', `${tooLong} phần dài hơn 300 từ mà không có tiêu đề con.`)
      : item('subheading', 'good', 'Phân bố tiêu đề con', 'Tiêu đề con được phân bố đều. Tốt!'))
  }

  // Câu liên tiếp bắt đầu giống nhau
  let repeat = 0
  for (let i = 2; i < sentences.length; i++) {
    const f = (s) => norm(s).split(/\s+/)[0]
    if (f(sentences[i]) === f(sentences[i - 1]) && f(sentences[i]) === f(sentences[i - 2])) repeat++
  }
  out.push(repeat
    ? item('repeat', 'ok', 'Câu mở đầu lặp lại', `Có ${repeat} chỗ 3 câu liên tiếp bắt đầu bằng cùng một từ. Nên đổi cách mở câu.`)
    : item('repeat', 'good', 'Câu mở đầu lặp lại', 'Không có câu liên tiếp nào bắt đầu giống nhau. Tốt!'))

  return finalize(out)
}

function finalize(items) {
  const avg = items.length ? items.reduce((s, i) => s + SCORE[i.status], 0) / items.length : 0
  const score = Math.round(avg * 10) // 0–90
  const status = items.some(i => i.id === 'kw' || i.id === 'empty') ? 'bad' : score >= 70 ? 'good' : score >= 50 ? 'ok' : 'bad'
  return { items, score, status }
}

export const STATUS_LABEL = { good: 'Tốt', ok: 'OK', bad: 'Cần cải thiện' }
export const STATUS_COLOR = { good: '#7ad03a', ok: '#ee7c1b', bad: '#dc3232' }

// Thanh màu dưới ô tiêu đề / mô tả
export function lengthBar(len, min, max) {
  if (!len) return { pct: 0, color: STATUS_COLOR.bad }
  const pct = Math.min(100, (len / max) * 100)
  const color = len > max ? STATUS_COLOR.bad : len < min ? STATUS_COLOR.ok : STATUS_COLOR.good
  return { pct, color }
}
