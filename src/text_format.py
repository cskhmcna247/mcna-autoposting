import html
import re

_CONTACT_RE = re.compile(
    r"^\s*(?:[\U0001F4DE☎\U0001F310\U0001F4CD\U0001F4E7✉]"
    r"|(?:hotline|website|email|zalo)\s*:"
    r"|hà nội\s*:|tp\.?\s*hcm\s*:)",
    re.IGNORECASE,
)
_BULLET_RE = re.compile(r"^\s*(?:[-*•–]\s+|\d+[.)]\s+)")


def _keep_tight(prev, line):
    if _CONTACT_RE.match(prev) and _CONTACT_RE.match(line):
        return True
    if _BULLET_RE.match(prev) and _BULLET_RE.match(line):
        return True
    return False


def format_social_text(text):
    """Chen dong trong giua cac doan de bai Facebook/LinkedIn de doc.

    Cac dong lien he (📞 🌐 📍) va danh sach gach dau dong van giu sat nhau.
    Van ban da co dong trong thi giu nguyen (goi nhieu lan ket qua khong doi)."""
    if not text:
        return text

    lines = [l.rstrip() for l in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]

    out = []
    prev = None
    had_blank = False
    for line in lines:
        if not line.strip():
            had_blank = True
            continue
        if prev is not None and (had_blank or not _keep_tight(prev, line)):
            out.append("")
        out.append(line)
        prev = line
        had_blank = False

    return "\n".join(out).strip()


def html_to_text(value):
    """Doi HTML (noi dung WordPress) sang van ban thuan, moi doan cach nhau 1 dong trong."""
    if not value or "<" not in value:
        return value

    value = re.sub(r"(?i)<br\s*/?>", "\n", value)
    value = re.sub(r"(?i)</(p|div|h[1-6]|li|ul|ol|blockquote|tr)>", "\n\n", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def social_text(post):
    """Noi dung dung cho Facebook/LinkedIn: uu tien content_social, bo HTML, dan dong."""
    raw = post.get("content_social") or post.get("content") or ""
    return format_social_text(html_to_text(raw))
