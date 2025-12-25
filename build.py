#!/usr/bin/env python3
"""
olgarozet.ru Site Generator

Generates index.html from content.md using proper Markdown parsing.
Follows Single Source of Truth principle.

Usage:
    python3 build.py           # Generate index.html
    python3 build.py --watch   # Watch mode (future)
"""
import sys
import re
import json
from pathlib import Path
from datetime import datetime

try:
    import markdown2
except ImportError:
    print("Installing markdown2...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown2", "-q"])
    import markdown2


# Configuration
CONFIG = {
    "source": "content.md",
    "output": "index.html", 
    "template": "templates/base.html",
    "css": "style.css",
    "lang": "ru",
    "charset": "utf-8"
}


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


def render_markdown(text: str) -> str:
    """Convert Markdown to HTML using markdown2."""
    # Handle {.class} syntax for links before markdown processing
    # [text](url){.cta} -> <a href="url" class="cta">text</a>
    text = re.sub(
        r'\[([^\]]+)\]\(([^)]+)\)\{\.([^}]+)\}',
        r'<a href="\2" class="\3">\1</a>',
        text
    )
    
    return markdown2.markdown(
        text,
        extras=[
            'fenced-code-blocks',
            'tables',
            'header-ids',
            'strike',
            'task_list',
            'breaks'  # Convert line breaks to <br>
        ]
    )


def load_css() -> str:
    """Load and inline CSS."""
    css_path = Path(CONFIG["css"])
    if css_path.exists():
        return css_path.read_text(encoding='utf-8')
    return ""


def generate_html(metadata: dict, body_html: str) -> str:
    """Generate complete HTML document."""
    version = metadata.get('version', '1.0')
    updated = metadata.get('updated', datetime.now().strftime('%Y-%m-%d'))
    css = load_css()
    
    # Template - clean, semantic HTML5
    return f'''<!DOCTYPE html>
<html lang="{CONFIG['lang']}">
<head>
<meta charset="{CONFIG['charset']}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Ольга Розет — художник, искусствовед">
<meta name="theme-color" content="#ffffff">
<meta name="generator" content="olgarozet.ru build.py">
<meta name="version" content="{version}">
<meta name="updated" content="{updated}">
<title>Ольга Розет</title>
<style>
{css}
</style>
</head>
<body>
<main>
{body_html}
</main>
<footer>
<a href="https://instagram.com/olga_rozet" aria-label="Instagram">Instagram</a>
<a href="https://t.me/olga_rozet" aria-label="Telegram">Telegram</a>
</footer>
<div id="version" aria-hidden="true">v{version}</div>
</body>
</html>
'''


def build():
    """Main build function."""
    source = Path(CONFIG["source"])
    output = Path(CONFIG["output"])
    
    if not source.exists():
        print(f"❌ Source file not found: {source}")
        sys.exit(1)
    
    content = source.read_text(encoding='utf-8')
    metadata, body = parse_frontmatter(content)
    body_html = render_markdown(body)
    html = generate_html(metadata, body_html)
    
    output.write_text(html, encoding='utf-8')
    
    version = metadata.get('version', '1.0')
    print(f"✅ Generated {output} (v{version})")
    
    return 0


if __name__ == '__main__':
    sys.exit(build())
