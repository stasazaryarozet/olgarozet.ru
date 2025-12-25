#!/usr/bin/env python3
"""
olgarozet.ru Site Generator — Архитектурная версия

Single Source of Truth:
    - content.md → контент (intro, консультации, события)
    - templates/base.css → стили (inline в HTML)
    - templates/footer.html → footer с изображением и соцсетями

Генерирует index.html идентичный v2.5 с graffiti footer.

Usage:
    python3 build.py           # Generate index.html
    python3 build.py --check   # Validate without writing
"""
import sys
import re
from pathlib import Path
from datetime import datetime

# Paths
ROOT = Path(__file__).parent
CONTENT = ROOT / 'content.md'
OUTPUT = ROOT / 'index.html'

# ============================================================================
# TEMPLATES
# ============================================================================

# CSS вынесен в отдельную константу для читаемости
# Fluid typography: clamp(min, preferred, max)
CSS = '''
    :root {
      /* Fluid type scale */
      --font-size-base: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
      --font-size-h1: clamp(2.5rem, 1.5rem + 5vw, 7rem);
      --font-size-p: clamp(1rem, 0.95rem + 0.25vw, 1.35rem);
      
      /* Fluid spacing */
      --space-section: clamp(3rem, 2rem + 4vw, 6rem);
      --space-padding: clamp(1.2rem, 1rem + 2vw, 3rem);
      --space-top: clamp(3rem, 2rem + 8vh, 12vh);
      
      /* Layout */
      --max-width: min(50em, 90vw);
      
      /* Colors */
      --color-text: #1a1a1a;
      --color-accent: #ff0000;
      --color-muted: #666;
      --color-border: #ddd;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }

    html {
      font: 400 var(--font-size-base)/1.8 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased;
      scroll-behavior: smooth;
      overscroll-behavior: none;
    }

    body {
      color: var(--color-text);
      background: #fff;
      max-width: var(--max-width);
      margin: 0 auto;
      padding: var(--space-top) var(--space-padding) 0;
    }

    h1 {
      font-size: var(--font-size-h1);
      font-weight: clamp(200, 300 - 5vw, 300);
      margin-bottom: 0.5em;
      letter-spacing: -0.03em;
      color: var(--color-accent);
      line-height: 1;
    }

    .artist-highlight {
      color: var(--color-accent);
    }

    .artist-highlight a {
      color: inherit;
      text-decoration: none;
    }

    section {
      margin: var(--space-section) 0;
      padding-top: calc(var(--space-section) * 0.7);
      border-top: 1px solid var(--color-border);
    }

    section:first-of-type {
      border-top: none;
      padding-top: 0;
      margin-top: 0;
    }

    h2 {
      font-size: clamp(0.9rem, 0.85rem + 0.2vw, 1rem);
      font-weight: 500;
      margin-bottom: 0.8em;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    p {
      margin: 0.8em 0;
      font-size: var(--font-size-p);
    }

    a {
      color: inherit;
      text-decoration: none;
      border-bottom: 1px solid #ccc;
      transition: border-color 0.2s;
    }

    a:hover {
      border-color: var(--color-text);
    }

    .price {
      font-size: clamp(0.85rem, 0.8rem + 0.2vw, 1.15rem);
      color: var(--color-muted);
    }

    .cta {
      display: inline-block;
      margin-top: 0.5em;
      padding: clamp(0.5em, 0.4em + 0.3vw, 1.2rem) clamp(1em, 0.8em + 0.5vw, 2.5rem);
      background: var(--color-text);
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: clamp(0.9rem, 0.85rem + 0.2vw, 1.1rem);
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .cta:hover {
      opacity: 0.8;
      border: none;
    }

    .event {
      margin: clamp(1em, 0.8em + 0.5vw, 1.5rem) 0;
      padding: clamp(0.5em, 0.3em + 0.3vw, 1.5rem) 0;
    }

    .event-date {
      font-weight: 500;
      font-size: clamp(1rem, 0.95rem + 0.2vw, 1.2rem);
    }

    .event-details {
      font-size: clamp(0.9rem, 0.85rem + 0.15vw, 1.15rem);
      color: var(--color-muted);
      margin-top: 0.3em;
    }

    /* Footer */
    footer {
      margin: var(--space-section) calc(-1 * var(--space-padding)) 0;
      padding: 0;
      border: none;
      background: #fff;
    }

    .footer-content {
      position: relative;
      display: block;
      margin: 0;
      padding: 0;
    }

    .footer-portrait {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
      -webkit-mask-image: linear-gradient(to bottom,
          transparent 0%,
          black 10%,
          black 90%,
          transparent 100%);
      mask-image: linear-gradient(to bottom,
          transparent 0%,
          black 10%,
          black 90%,
          transparent 100%);
    }

    .social-icon {
      position: absolute;
      top: 25%;
      width: clamp(60px, 50px + 3vw, 80px);
      height: clamp(60px, 50px + 3vw, 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.95);
      border: none;
      transition: color 0.3s ease, transform 0.3s ease;
      filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.7));
      z-index: 10;
    }

    .social-icon:first-of-type {
      left: clamp(10%, 8% + 5vw, 20%);
    }

    .social-icon:last-of-type {
      right: clamp(10%, 8% + 5vw, 20%);
    }

    .social-icon:hover {
      color: #fff;
      transform: scale(1.15);
      border: none;
    }

    .social-icon svg {
      width: clamp(40px, 35px + 2vw, 72px);
      height: clamp(40px, 35px + 2vw, 72px);
    }

    .scroll-top {
      display: block;
      text-align: center;
      padding: 1em;
      color: #ccc;
      border: none;
      transition: color 0.3s;
    }

    .scroll-top:hover {
      color: var(--color-accent);
      border: none;
    }

    /* Desktop: full-width footer */
    @media (min-width: 768px) {
      footer {
        position: relative;
        left: 50%;
        right: 50%;
        margin-left: -50vw;
        margin-right: -50vw;
        width: 100vw;
      }

      .footer-content {
        width: 100vw;
        max-width: none;
      }

      .footer-portrait {
        width: 100vw;
        height: min(100vh, 80vw);
        object-fit: cover;
        object-position: center 20%;
        -webkit-mask-image: none;
        mask-image: none;
      }
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }
      *, *::before, *::after {
        transition-duration: 0.01ms !important;
      }
    }

    /* Dark mode ready */
    @media (prefers-color-scheme: dark) {
      :root {
        --color-text: #f0f0f0;
        --color-muted: #aaa;
        --color-border: #333;
      }
      body {
        background: #111;
      }
      .cta {
        background: #f0f0f0;
        color: #111;
      }
    }
'''

FOOTER = '''
  <footer>
    <div class="footer-content">
      <a href="https://instagram.com/olga_rozet" class="social-icon" aria-label="Instagram">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>
      <img src="olga_footer.png" alt="Ольга Розет" class="footer-portrait">
      <a href="https://t.me/olga_rozet" class="social-icon" aria-label="Telegram">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      </a>
    </div>
    <a href="#" class="scroll-top" aria-label="Наверх"
      onclick="window.scrollTo({top:0,behavior:'smooth'});return false;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </a>
  </footer>

  <script>
    const footer = document.querySelector('.footer-content');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.2 });
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
    result = {'description': '', 'price': '', 'link': ''}
    
    lines = content.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if '₽' in line:
            # Extract price
            result['price'] = re.sub(r'[*]', '', line)
        elif 'cal.com' in line or 'Записаться' in line:
            # Extract link
            match = re.search(r'\((https?://[^)]+)\)', line)
            if match:
                result['link'] = match.group(1)
        elif not result['description']:
            result['description'] = line
    
    return result


def parse_events(content: str) -> list:
    """Parse events section."""
    events = []
    
    # Split by ### headers
    event_blocks = re.split(r'\n### ', content)
    
    for block in event_blocks:
        if not block.strip():
            continue
        
        lines = block.strip().split('\n')
        event = {'title': '', 'date': '', 'status': '', 'link': ''}
        
        if lines:
            event['title'] = lines[0].strip()
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            
            # Date (bold)
            if line.startswith('**') and ('января' in line or 'февраля' in line or 'марта' in line):
                event['date'] = re.sub(r'[*]', '', line)
            # Status (italic)
            elif line.startswith('*') and line.endswith('*'):
                event['status'] = line.strip('*')
            # Link
            elif 'http' in line:
                match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', line)
                if match:
                    event['link_text'] = match.group(1)
                    event['link'] = match.group(2)
            # Location
            elif '→' in line or 'Бухара' in line:
                event['location'] = line
        
        if event['title']:
            events.append(event)
    
    return events


# ============================================================================
# HTML GENERATION
# ============================================================================

def generate_intro_html(intro: list) -> str:
    """Generate intro section HTML."""
    html_parts = []
    for line in intro:
        # Handle special formatting
        if line.startswith('**') and 'Художник' in line:
            html_parts.append(f'    <p><span class="artist-highlight"><a href="art/">Художник</a></span>.</p>')
        elif line.startswith('['):
            # Email link
            match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', line)
            if match:
                html_parts.append(f'    <p><a href="{match.group(2)}">{match.group(1)}</a></p>')
        elif '—' in line and 'деньги' in line:
            # Multi-line with breaks
            html_parts.append(f'    <p>Вдохновляю —<br>за деньги<br>и без.</p>')
        else:
            html_parts.append(f'    <p>{line}</p>')
    
    return '\n'.join(html_parts)


def generate_events_html(events: list) -> str:
    """Generate events section HTML with proper semantics."""
    html_parts = []
    
    for event in events:
        html_parts.append('      <article class="event">')
        
        if event.get('date'):
            html_parts.append(f'        <p class="event-date"><time>{event["date"]}</time></p>')
        
        if event.get('title') and event.get('status'):
            html_parts.append(f'        <p>{event["title"]} · <em>{event["status"]}</em></p>')
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
    cons_html = f'''    <section id="consultations" aria-labelledby="consultations-heading">
      <h2 id="consultations-heading">Консультации</h2>
      <p>{cons.get('description', '40 минут. Подключить меня к вашему делу.')}</p>
      <p class="price">{cons.get('price', '15 000 ₽ · онлайн')}</p>
      <a href="{cons.get('link', 'https://cal.com/olgarozet/delo-40min')}" class="cta">Записаться</a>
    </section>'''
    
    # Events section
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
  
  <style>{CSS}
  </style>
</head>

<body>
  <!-- Version badge (dev only) -->
  <div aria-hidden="true" style="position:fixed;bottom:1rem;right:1rem;background:#000;color:#fff;padding:0.3rem 0.6rem;font-size:12px;border-radius:4px;opacity:0.7;z-index:9999;">v{version}</div>
  
  <header>
    <h1>Ольга Розет</h1>
  </header>

  <main>
    <section id="about" aria-label="О себе">
{intro_html}
    </section>

{cons_html}

    <section id="events" aria-labelledby="events-heading">
      <h2 id="events-heading">Ближайшее</h2>
{events_html}
    </section>
  </main>
{FOOTER}
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
    
    return 0


if __name__ == '__main__':
    sys.exit(build())
