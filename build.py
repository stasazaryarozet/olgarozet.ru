#!/usr/bin/env python3
"""
olgarozet.ru Site Generator — Архитектурная версия v2

Single Source of Truth:
    - ../config.yaml → ВСЕ данные (bio, контакты, события)
    
Генерирует:
    - index.html
    - ../channel_bio.txt (для Telegram)

Usage:
    python3 build.py           # Generate from config.yaml
    python3 build.py --legacy  # Use old content.md (deprecated)
"""
import sys
import re
import yaml
from pathlib import Path
from datetime import datetime

# Paths
ROOT = Path(__file__).parent
OLGA_ROOT = ROOT.parent
CONTENT = ROOT / 'content.md'
OUTPUT = ROOT / 'index.html'
CONFIG_PATH = OLGA_ROOT / 'config.yaml'

# Context Engine import
sys.path.insert(0, str(ROOT.parent.parent / 'engine'))
try:
    from context import Context
    CTX = Context(OLGA_ROOT)
    HAS_CONTEXT = True
except ImportError:
    CTX = None
    HAS_CONTEXT = False

# Load project config
def load_config():
    """Load project parameters from config.yaml."""
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return {}

CONFIG = load_config()

# ============================================================================
# TEMPLATES
# ============================================================================

# CSS загружается из внешнего файла
STYLES_PATH = ROOT / 'styles.css'

def get_css():
    """Load CSS from external file."""
    if STYLES_PATH.exists():
        return STYLES_PATH.read_text(encoding='utf-8')
    return ''


def get_footer():
    """Generate footer with social links from config."""
    urls = CONFIG.get('urls', {})
    instagram_url = urls.get('instagram', 'instagram.com/olga_rozet')
    telegram_url = urls.get('telegram_channel', 't.me/olga_rozet')
    
    # Ensure https://
    if not instagram_url.startswith('http'):
        instagram_url = 'https://' + instagram_url
    if not telegram_url.startswith('http'):
        telegram_url = 'https://' + telegram_url
    
    return f'''
  <footer>
    <div class="footer-content">
      <a href="{instagram_url}" class="social-icon" aria-label="Instagram">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>
      <img src="olga_footer.png" alt="Ольга Розет" class="footer-portrait">
      <a href="{telegram_url}" class="social-icon" aria-label="Telegram">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      </a>
    </div>
    <a href="#" class="scroll-top" aria-label="Наверх"
      onclick="window.scrollTo({{top:0,behavior:'smooth'}});return false;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </a>
  </footer>

  <script>
    const footer = document.querySelector('.footer-content');
    const observer = new IntersectionObserver((entries) => {{
      entries.forEach(entry => {{
        if (entry.isIntersecting) {{
          entry.target.classList.add('visible');
        }}
      }});
    }}, {{ threshold: 0.1 }});
    observer.observe(footer);
  </script>
'''



# ============================================================================
# CONTENT PARSING
# ============================================================================

def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Extract YAML frontmatter and return (metadata, body)."""
    if not content.startswith('---'):
        return {}, content
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content
    
    frontmatter = {}
    for line in parts[1].strip().split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            frontmatter[key.strip()] = value.strip()
    
    return frontmatter, parts[2].strip()


def parse_content(content_md: str) -> dict:
    """Parse content.md into structured data."""
    metadata, body = parse_frontmatter(content_md)
    
    # Split into sections by ## headers
    sections = re.split(r'\n## ', body)
    
    data = {
        'version': metadata.get('version', '2.5'),
        'intro': [],
        'consultations': {},
        'events': []
    }
    
    # Parse intro (before first ##)
    if sections:
        intro = sections[0]
        # Remove # header
        intro = re.sub(r'^# .+\n', '', intro)
        data['intro'] = [line.strip() for line in intro.strip().split('\n') if line.strip()]
    
    # Parse other sections
    for section in sections[1:]:
        lines = section.strip().split('\n')
        header = lines[0].strip()
        content = '\n'.join(lines[1:]).strip()
        
        if 'Консультаци' in header:
            data['consultations'] = parse_consultations(content)
        elif 'Ближайшее' in header:
            data['events'] = parse_events(content)
    
    return data


def parse_consultations(content: str) -> dict:
    """Parse consultations section."""
    result = {'description': [], 'price': '', 'link': ''}
    
    lines = content.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if '₽' in line:
            # Extract price
            result['price'] = re.sub(r'[*]', '', line)
        elif 'cal.com' in line or 'Записаться' in line or 'ЗАПИСАТЬСЯ' in line:
            # Extract link
            match = re.search(r'\((https?://[^)]+)\)', line)
            if match:
                result['link'] = match.group(1)
        else:
            result['description'].append(line)
    
    # Join description lines with <br>
    result['description'] = '<br>'.join(result['description'])
    return result


def parse_events(content: str) -> list:
    """Parse events section."""
    events = []
    
    # Find all ### headers and their content
    pattern = r'###\s+([^\n]+)\n(.*?)(?=###|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for title, body in matches:
        event = {
            'title': title.strip(),
            'date': '',
            'status': '',
            'link': '',
            'link_text': '',
            'location': ''
        }
        
        for line in body.strip().split('\n'):
            line = line.strip()
            if not line:
                continue
            
            # Date (bold) **text**
            if line.startswith('**') and line.endswith('**'):
                event['date'] = line.strip('*')
            # Status (italic) *text*
            elif line.startswith('*') and line.endswith('*') and not line.startswith('**'):
                event['status'] = line.strip('*')
            # Link [text](url)
            elif '[' in line and '](' in line:
                match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', line)
                if match:
                    event['link_text'] = match.group(1)
                    event['link'] = match.group(2)
            # Location (plain text with arrow or specific words)
            elif '→' in line or 'Бухара' in line or 'Самарканд' in line:
                event['location'] = line
        
        if event['title']:
            events.append(event)
    
    return events
    


# ============================================================================
# HTML GENERATION
# ============================================================================

def md_to_html(text: str) -> str:
    """Convert markdown inline formatting to HTML."""
    # Bold links: **[text](url)** -> <strong><a href="url">text</a></strong>
    text = re.sub(r'\*\*\[([^\]]+)\]\(([^)]+)\)\*\*', r'<strong><a href="\2">\1</a></strong>', text)
    # Regular links: [text](url) -> <a href="url">text</a>
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    # Bold: **text** -> <strong>text</strong>
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    # Italic: *text* -> <em>text</em>
    text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)
    return text


def generate_intro_html(intro: list) -> str:
    """Generate intro section HTML from markdown lines."""
    html_parts = []
    skip_next = 0
    
    for i, line in enumerate(intro):
        if skip_next > 0:
            skip_next -= 1
            continue
            
        # Check if this is the "Вдохновляю" block (spans multiple lines)
        if 'Вдохновляю' in line:
            # Collect all lines until email
            inspire_lines = [line.rstrip(' ')]
            j = i + 1
            while j < len(intro) and not intro[j].startswith('['):
                inspire_lines.append(intro[j].rstrip(' '))
                skip_next += 1
                j += 1
            html_parts.append(f'    <p class="inspire">{("<br>".join(inspire_lines)).replace("  ", "")}</p>')
            continue
        
        # Artist highlight (bold link) - bullet on next line like "без"
        if line.startswith('**') and '[' in line:
            html = md_to_html(line)
            # Remove strong tags and extract dot if present
            inner = html.replace("<strong>", "").replace("</strong>", "")
            if inner.endswith('.'):
                inner = inner[:-1]
                html_parts.append(f'    <p><span class="artist-highlight">{inner}</span><br>•</p>')
            else:
                html_parts.append(f'    <p><span class="artist-highlight">{inner}</span></p>')
            continue
        
        # Regular line - convert markdown
        html = md_to_html(line)
        html_parts.append(f'    <p>{html}</p>')
    
    return '\n'.join(html_parts)


def generate_events_html(events: list) -> str:
    """Generate events section HTML with proper semantics."""
    html_parts = []
    
    for event in events:
        html_parts.append('      <article class="event">')
        
        if event.get('date'):
            html_parts.append(f'        <p class="event-date"><time>{event["date"]}</time></p>')
        
        if event.get('title') and event.get('status'):
            html_parts.append(f'        <p>{event["title"]} · {event["status"]}</p>')
        elif event.get('title') and event.get('location'):
            html_parts.append(f'        <p>{event["title"]} · {event["location"]}</p>')
        elif event.get('title'):
            html_parts.append(f'        <p>{event["title"]}</p>')
        
        if event.get('link'):
            link_text = event.get('link_text', 'Подробнее →')
            html_parts.append(f'        <p class="event-details"><a href="{event["link"]}">{link_text}</a></p>')
        
        html_parts.append('      </article>')
    
    return '\n'.join(html_parts)


def generate_html(data: dict) -> str:
    """Generate complete index.html."""
    version = data.get('version', '2.5')
    
    # Intro section
    intro_html = generate_intro_html(data.get('intro', []))
    # Consultations section
    cons = data.get('consultations', {})
    availability_html = f'<p class="availability">{cons.get("current_availability", "")}</p>' if cons.get('current_availability') else ''
    cons_html = f'''    <section id="consultations" aria-labelledby="consultations-heading">
      <h2 id="consultations-heading">Консультации:</h2>
      <p>{cons.get('description', '40 минут. Подключить меня к вашему делу.')}</p>
      <p class="price">{cons.get('price', '15 000 ₽')}</p>
      <a href="{cons.get('link', 'https://cal.com/olgarozet/delo-40min')}" class="cta">Записаться</a>
      {availability_html}
    </section>'''
    
    # Events section
    events_title = data.get('events_section_title', 'Ближайшее').upper() + ':'
    events_html = generate_events_html(data.get('events', []))
    
    # JSON-LD structured data
    schema = '''{
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Ольга Розет",
    "alternateName": "Olga Rozet",
    "url": "https://olgarozet.ru",
    "image": "https://olgarozet.ru/olga_footer.png",
    "jobTitle": ["Художник", "Дизайнер", "Искусствовед"],
    "email": "o.g.rozet@gmail.com",
    "sameAs": [
      "https://instagram.com/olga_rozet",
      "https://t.me/olga_rozet"
    ]
  }'''
    
    # Assemble
    html = f'''<!DOCTYPE html>
<html lang="ru">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  
  <!-- SEO -->
  <title>Ольга Розет — художник, дизайнер</title>
  <meta name="description" content="Ольга Розет — художник, искусствовед, дизайнер интерьеров. Консультации, путешествия, искусство.">
  <link rel="canonical" href="https://olgarozet.ru">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Ольга Розет">
  <meta property="og:description" content="Художник, искусствовед, дизайнер интерьеров">
  <meta property="og:url" content="https://olgarozet.ru">
  <meta property="og:image" content="https://olgarozet.ru/olga_footer.png">
  <meta property="og:locale" content="ru_RU">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Ольга Розет">
  <meta name="twitter:description" content="Художник, искусствовед, дизайнер интерьеров">
  <meta name="twitter:image" content="https://olgarozet.ru/olga_footer.png">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  
  <!-- Theme -->
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)">
  
  <!-- Structured Data -->
  <script type="application/ld+json">{schema}</script>
  
  <style>{get_css()}
  </style>
</head>

<body>
  
  <div class="content-wrapper">
    <header>
      <h1 style="color: rgba(26, 26, 26, 0.75);">Ольга Розет</h1>
    </header>

    <main>
      <section id="about" aria-label="О себе">
{intro_html}
      </section>

{cons_html}

      <section id="events" aria-labelledby="events-heading">
        <h2 id="events-heading">{events_title}</h2>
{events_html}
      </section>
    </main>
  </div>
{get_footer()}
</body>

</html>
'''
    return html


# ============================================================================
# MAIN
# ============================================================================

def build():
    """Main build function."""
    if not CONTENT.exists():
        print(f"❌ content.md not found")
        return 1
    
    content_md = CONTENT.read_text(encoding='utf-8')
    data = parse_content(content_md)
    html = generate_html(data)
    
    if '--check' in sys.argv:
        print(f"✓ Would generate index.html (v{data.get('version')})")
        print(f"  Intro lines: {len(data.get('intro', []))}")
        print(f"  Events: {len(data.get('events', []))}")
        return 0
    
    OUTPUT.write_text(html, encoding='utf-8')
    print(f"✅ Generated index.html (v{data.get('version')})")
    
    # Generate channel_bio.txt from same source
    generate_channel_bio(data.get('intro', []))
    
    return 0


def build_from_config():
    """Build from unified config.yaml using Context Engine."""
    if not HAS_CONTEXT:
        print("❌ Context Engine not available")
        return build()  # Fallback to legacy
    
    # Get data from Context (inherits from parent configs)
    identity = CTX.get('identity', {})
    bio = CTX.get('bio', {})
    contacts = CTX.get('contacts', {})
    consultations = CTX.get('consultations', {})
    events = CTX.get('events', [])
    
    # Build intro lines for compatibility with existing generator
    intro = []
    
    # Artist line
    artist = bio.get('artist', 'ХУДОЖНИК')
    artist_link = bio.get('artist_link', 'art/')
    intro.append(f"**[{artist}]({artist_link})**.")
    
    # Roles
    roles = bio.get('roles', [])
    if roles:
        intro.append('; '.join(roles) + ';')
    
    # Skills
    skills = bio.get('skills', [])
    if skills:
        intro.append('; '.join(skills) + '.')
    
    # Inspire
    inspire = bio.get('inspire', '')
    if inspire:
        for line in inspire.strip().split('\n'):
            intro.append(line + '  ')  # Two spaces for line break
    
    # Dot separator
    intro.append('•')
    
    # Email
    email = contacts.get('email', '')
    if email:
        intro.append(f"[{email}](mailto:{email})")
    
    # Build data dict
    price_raw = consultations.get('price', 15000)
    if isinstance(price_raw, int):
        price_formatted = f"{price_raw:,}".replace(',', ' ')
    else:
        price_formatted = str(price_raw)
    
    data = {
        'version': '6.0',
        'intro': intro,
        'consultations': {
            'description': consultations.get('description', '').replace('\n', '<br>'),
            'price': f"{price_formatted} {consultations.get('currency', '₽')}",
            'current_availability': consultations.get('current_availability', '').strip().replace('\n', '<br>'),
            'link': consultations.get('link', ''),
            'cta': consultations.get('cta', 'ЗАПИСАТЬСЯ')
        },
        'events_section_title': CTX.get('events_section_title', 'Ближайшее'),
        'events': [
            {
                'title': e.get('title', ''),
                'date': e.get('date_range', ''),
                'status': e.get('status_text', ''),
                'location': e.get('subtitle', ''),
                'link': e.get('link', ''),
                'link_text': e.get('link_text', 'Подробнее →')
            }
            for e in events
        ]
    }
    
    html = generate_html(data)
    OUTPUT.write_text(html, encoding='utf-8')
    print(f"✅ Generated index.html (v{data.get('version')}) from config.yaml")
    
    # Generate channel_bio.txt
    generate_channel_bio_from_config()
    
    return 0


def generate_channel_bio(intro: list):
    """Generate channel_bio.txt for Telegram from intro."""
    bio_path = OLGA_ROOT / 'channel_bio.txt'
    
    # Get channel from config (for bio footer)
    telegram_channel = CONFIG.get('contacts', {}).get('telegram_channel', 'olga_rozet')
    telegram_handle = f'@{telegram_channel}'
    
    lines = []
    for line in intro:
        # Skip email lines
        if '@' in line and 'gmail' in line.lower():
            continue
        if 'mailto:' in line:
            continue
            
        # Remove markdown formatting
        clean = re.sub(r'\*\*\[([^\]]+)\]\([^)]+\)\*\*', r'\1', line)  # **[text](url)**
        clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)  # [text](url)
        clean = clean.replace('**', '').replace('*', '')
        clean = clean.strip()
        if clean:
            lines.append(clean)
    
    # Format for Telegram bio - add handle from config
    bio = '\n\n'.join(lines) + f'\n\n{telegram_handle}\n'
    
    bio_path.write_text(bio, encoding='utf-8')
    print(f"✅ Generated channel_bio.txt")


def generate_channel_bio_from_config():
    """Generate channel_bio.txt from unified config.yaml."""
    bio_path = OLGA_ROOT / 'channel_bio.txt'
    
    bio_data = CTX.get('bio', {})
    contacts = CTX.get('contacts', {})
    
    lines = []
    
    # Artist
    lines.append(bio_data.get('artist', 'ХУДОЖНИК'))
    
    # Roles + Skills
    roles = bio_data.get('roles', [])
    skills = bio_data.get('skills', [])
    if roles or skills:
        lines.append('; '.join(roles + skills))
    
    # Inspire (shortened for Telegram bio limit)
    inspire = bio_data.get('inspire', '')
    if inspire:
        # Take first line only for bio
        first_line = inspire.strip().split('\n')[0]
        lines.append(first_line)
    
    # Handle
    telegram_account = contacts.get('telegram_account', 'olgaroset')
    lines.append(f'@{telegram_account}')
    
    bio_text = '\n'.join(lines)
    bio_path.write_text(bio_text, encoding='utf-8')
    print(f"✅ Generated channel_bio.txt from config.yaml")


if __name__ == '__main__':
    if '--legacy' in sys.argv:
        sys.exit(build())
    else:
        sys.exit(build_from_config())

