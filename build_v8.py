#!/usr/bin/env python3
"""MHE v8: Pure MD → HTML"""
from pathlib import Path
import re

MD = Path("content/olga_v8.md")
parts = MD.read_text(encoding='utf-8').split('\n---\n\n---\n\n')
main_md, book_md = parts[0].strip(), parts[1].strip()

def md2html(md):
    h = md
    h = re.sub(r'^# (.+)$', r'<h1>\1</h1>', h, flags=re.M)
    h = re.sub(r'^## (.+)$', r'<h2>\1</h2>', h, flags=re.M)
    h = re.sub(r'^### (.+)$', r'<h3>\1</h3>', h, flags=re.M)
    h = re.sub(r'^\* (.+)$', r'<li>\1</li>', h, flags=re.M)
    h = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2">\1</a>', h)
    
    lines = h.split('\n')
    result = []
    in_ul = False
    
    for line in lines:
        s = line.strip()
        if not s:
            if in_ul:
                result.append('</ul>')
                in_ul = False
            continue
        
        if s.startswith('<li>'):
            if not in_ul:
                result.append('<ul>')
                in_ul = True
            result.append(s)
        else:
            if in_ul:
                result.append('</ul>')
                in_ul = False
            if not s.startswith('<h') and not s == '---' and not s.startswith('<a'):
                result.append(f'<p>{s}</p>')
            else:
                result.append(s)
    
    if in_ul:
        result.append('</ul>')
    
    return '\n'.join(result).replace('---', '')

# Главная
Path("index.html").write_text(f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ольга Розет</title>
<link rel="stylesheet" href="style.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
<header class="site-header">
<div class="header-content">
<div class="header-logo"><a href="/">Ольга Розет</a></div>
<nav class="header-nav"><a href="/book/">Подключить к делу</a></nav>
</div>
</header>
<main class="container">
{md2html(main_md)}
</main>
</body>
</html>''', encoding='utf-8')

# /book/
Path("book/index.html").write_text(f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Подключить к делу — Ольга Розет</title>
<link rel="stylesheet" href="style.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
<header class="site-header">
<div class="header-content">
<div class="header-logo"><a href="/">Ольга Розет</a></div>
<nav class="header-nav"><a href="/book/">Подключить к делу</a></nav>
</div>
</header>
<main class="container">
{md2html(book_md)}
<div class="cal-embed" style="margin-top:3rem;min-height:700px"></div>
<script>(function (C, A, L) {{let p = function (a, ar) {{a.q.push(ar);}}; let d = C.document; C.Cal = C.Cal || function () {{let cal = C.Cal; let ar = arguments; if (!cal.loaded) {{cal.ns = {{}}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true;}} if (ar[0] === L) {{const api = function () {{p(api, arguments);}}; const namespace = ar[1]; api.q = api.q || []; typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar); return;}} p(cal, ar);}}; }})(window, "https://app.cal.com/embed/embed.js", "init");
Cal("init", {{origin:"https://cal.com"}});
Cal("inline", {{elementOrSelector:".cal-embed",calLink: "olga-rozet-u6bgb0/delo-40min",layout: "month_view"}});
Cal("ui", {{"theme":"light","styles":{{"branding":{{"brandColor":"#111111"}}}},"hideEventTypeDetails":false,"layout":"month_view"}});
</script>
</main>
</body>
</html>''', encoding='utf-8')

print("✓ index.html\n✓ book/index.html")
