#!/usr/bin/env python3
"""
MHE Generator v7: YAML → HTML
"""
import yaml
from pathlib import Path

CONTENT_PATH = Path(__file__).parent / "content" / "olga_v7.yaml"
INDEX_PATH = Path(__file__).parent / "index.html"
BOOK_PATH = Path(__file__).parent / "book" / "index.html"

def load_content():
    with open(CONTENT_PATH, encoding='utf-8') as f:
        return yaml.safe_load(f)

def generate_index(data):
    main = data['main']
    footer = data['footer']
    
    html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{main['title']}</title>
  <meta name="description" content="{main['subtitle']}">
  <link rel="stylesheet" href="style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="header-content">
      <div class="header-logo"><a href="/">{main['title']}</a></div>
      <nav class="header-nav"><a href="/book/">Подключить к делу</a></nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h1>{main['title']}</h1>
      <h2>{main['subtitle']}</h2>
    </div>
  </section>

  <section class="projects">
    <div class="container">
      <h2>{main['projects_title']}</h2>
      <div class="project">
        <h3><a href="{main['project_1']['url']}" target="_blank" rel="noopener">{main['project_1']['title']}</a></h3>
        <p>{main['project_1']['desc']}</p>
      </div>
      <div class="project">
        <h3><a href="{main['project_2']['url']}">{main['project_2']['title']}</a></h3>
        <p>{main['project_2']['desc']}</p>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <p><a href="mailto:{footer['email']}">{footer['email']}</a></p>
      <p><a href="{footer['instagram_url']}" target="_blank" rel="noopener">Instagram: {footer['instagram_handle']}</a></p>
    </div>
  </footer>
</body>
</html>'''
    
    INDEX_PATH.write_text(html, encoding='utf-8')
    print(f"✓ index.html")

def generate_book(data):
    book = data['book']
    footer = data['footer']
    
    html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{book['title']} — Ольга Розет</title>
  <meta name="description" content="{book['subtitle']}">
  <link rel="stylesheet" href="style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="header-content">
      <div class="header-logo"><a href="/">Ольга Розет</a></div>
      <nav class="header-nav"><a href="/book/">Подключить к делу</a></nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h1>{book['title']}</h1>
      <h2>{book['subtitle']}</h2>
    </div>
  </section>

  <section class="description">
    <div class="container">
      <p>{book['what_is_it']}</p>
    </div>
  </section>

  <section class="audience">
    <div class="container">
      <h2>{book['who_is_it_for']['title']}</h2>
      <p>{book['who_is_it_for']['desc']}</p>
    </div>
  </section>

  <section class="format">
    <div class="container">
      <h2>{book['format']['title']}</h2>
      <ul>
{''.join(f"        <li>{item}</li>\n" for item in book['format']['items'])}      </ul>
    </div>
  </section>

  <section class="payment">
    <div class="container">
      <h2>{book['payment']['title']}</h2>
      <p>{book['payment']['desc']}</p>
    </div>
  </section>

  <section class="booking">
    <div class="container">
      <h2>{book['booking']['title']}</h2>
      <p>{book['booking']['desc']}</p>
      <div class="cal-inline" data-url="https://cal.com/olga-rozet-u6bgb0/delo-40min?primary_color=111111&locale=ru" style="min-width:320px;height:700px;"></div>
      <script type="text/javascript" src="https://assets.cal.com/embed/embed.js" async></script>
    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <p><a href="mailto:{footer['email']}">{footer['email']}</a></p>
      <p><a href="{footer['instagram_url']}" target="_blank" rel="noopener">Instagram: {footer['instagram_handle']}</a></p>
    </div>
  </footer>
</body>
</html>'''
    
    BOOK_PATH.write_text(html, encoding='utf-8')
    print(f"✓ book/index.html")

print("=" * 60)
print("MHE Generator v7")
print("=" * 60)
data = load_content()
print(f"✓ content/olga_v7.yaml")
generate_index(data)
generate_book(data)
print("=" * 60)
