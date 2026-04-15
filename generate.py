#!/usr/bin/env python3
"""generate.py — Faithful projection: data.yaml → {site, telegram, channel_bio}.

Mathematical model:
  Data D = structured YAML (bio, consultations, events)
  Projection P: D → Format
  P is injective on content lines (no information loss).

Three projections from ONE source:
  P_site(D)     → index.html  (HTML with SEO, styles, booking)
  P_telegram(D) → telegram.txt (vertical text for channel post)
  P_bio(D)      → bio.txt     (short bio for channel/IG description)
"""
import yaml
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT / "data.yaml"
TEMPLATE = ROOT / "template.html"
STYLES = ROOT / "styles.css"


def load() -> dict:
    return yaml.safe_load(DATA.read_text(encoding="utf-8"))


# ── P_site: D → HTML ─────────────────────────────────────

def p_site(d: dict) -> str:
    bio = d["bio"]
    cons = d["consultations"]
    events = d["events"]
    urls = d.get("urls", {})

    # Bio section
    roles_html = "\n".join(f"    <p>{r};</p>" if i < len(bio["roles"]) - 1
                           else f"    <p>{r}.</p>"
                           for i, r in enumerate(bio.get("skills", [])))
    # Actually: roles and skills as pairs on separate lines
    role_lines = []
    for r in bio.get("roles", []):
        role_lines.append(f"    <p>{r};</p>")
    for i, s in enumerate(bio.get("skills", [])):
        sep = ";" if i < len(bio["skills"]) - 1 else "."
        role_lines.append(f"    <p>{s}{sep}</p>")

    inspire = "<br>".join(bio["inspire"].strip().splitlines())

    bio_html = f"""      <section id="about" aria-label="О себе">
    <p><span class="artist-highlight"><a href="{bio['artist']['link']}">{bio['artist']['text']}</a></span><br>•</p>
{chr(10).join(role_lines)}
    <p class="inspire">{inspire}<br>•</p>
    <p><a href="mailto:{bio['email']}">{bio['email']}</a></p>
      </section>"""

    # Consultations
    desc = "<br>".join(cons["description"].strip().splitlines())
    avail = "<br>".join(cons["availability"].strip().splitlines())
    cons_html = f"""    <section id="consultations" aria-labelledby="consultations-heading">
      <h2 id="consultations-heading">Консультации:</h2>
      <p>{desc}</p>
      <p class="price">{cons['price']}</p>
      <div id="booking">
        <div id="slots-loading" style="text-align:center;color:#999;margin:1rem 0">Загрузка...</div>
        <div id="slots" style="margin:1rem 0"></div>
        <input id="bk-name" placeholder="Имя" style="width:100%;padding:.6rem;border:1px solid #ddd;border-radius:.4rem;margin:.3rem 0;font-size:1rem">
        <input id="bk-contact" placeholder="Телефон, Telegram или Email" style="width:100%;padding:.6rem;border:1px solid #ddd;border-radius:.4rem;margin:.3rem 0;font-size:1rem">
        <button id="bk-btn" onclick="bkBook()" disabled style="width:100%;padding:.7rem;background:#111;color:#fff;border:none;border-radius:.5rem;font-size:1rem;cursor:pointer;margin-top:.5rem">Выберите время</button>
        <div id="bk-msg" style="text-align:center;margin-top:.5rem;color:#666"></div>
      </div>
      <script>
      var BK_API="https://script.google.com/macros/s/AKfycbzeulk8nVhROOmrnysLKRLGqM_naMEgVhtPl50ch_GCilibJ7MXv2rWlGlq1hz1SWc/exec";var bkSlot=null;
      fetch(BK_API+"?action=slots").then(function(r){return r.json()}).then(function(d){
        document.getElementById("slots-loading").style.display="none";
        var el=document.getElementById("slots");
        var days={};var wd={пн:"Пн",вт:"Вт",ср:"Ср",чт:"Чт",пт:"Пт"};
        d.slots.forEach(function(s){if(!days[s.date])days[s.date]=[];days[s.date].push(s)});
        var h="";for(var dt in days){var ss=days[dt];var p=dt.split("-");
        h+="<div style=\"margin:.5rem 0\"><b>"+parseInt(p[2])+"."+p[1]+"</b> ";
        ss.forEach(function(s){h+="<span onclick=\"bkPick(this,\'"+s.date+"\',\'"+s.time+"\')\""
        +" style=\"display:inline-block;padding:.3rem .8rem;margin:.15rem;border:1px solid #ddd;border-radius:.3rem;cursor:pointer\">"+s.time+"</span>"});
        h+="</div>"}el.innerHTML=h||"<p>Нет свободных окон</p>";
      }).catch(function(){document.getElementById("slots-loading").textContent=""});
      function bkPick(el,date,time){document.querySelectorAll("#slots span").forEach(function(s){s.style.background="";s.style.color=""});
        el.style.background="#111";el.style.color="#fff";bkSlot={date:date,time:time};
        document.getElementById("bk-btn").disabled=false;document.getElementById("bk-btn").textContent=time+" — Отправить заявку"}
      function bkBook(){var n=document.getElementById("bk-name").value;var c=document.getElementById("bk-contact").value;
        if(!n||!c||!bkSlot)return;document.getElementById("bk-btn").disabled=true;document.getElementById("bk-btn").textContent="...";
        var u=BK_API+"?name="+encodeURIComponent(n)+"&contact="+encodeURIComponent(c)+"&date="+bkSlot.date+"&time="+bkSlot.time;
        fetch(u).then(function(r){return r.json()}).then(function(d){
          if(d.ok){document.getElementById("bk-msg").textContent="Заявка отправлена! Ольга свяжется с вами для подтверждения.";}
          else if(d.error=="slot_taken"){document.getElementById("bk-msg").textContent="Время занято. Выберите другое.";document.getElementById("bk-btn").disabled=false}
          else document.getElementById("bk-msg").textContent="Ошибка. Попробуйте позже.";
        }).catch(function(){document.getElementById("bk-msg").textContent="Ошибка сети.";document.getElementById("bk-btn").disabled=false})}
      </script>
      <p class="availability">{avail}</p>
    </section>"""

    # Events — every line from data.yaml appears in HTML
    events_articles = []
    for ev in events:
        lines = [f'        <p class="event-date"><time>{ev["date"]}</time></p>',
                 f'        <p>{ev["title"]}</p>']
        for line in ev.get("lines", []):
            if line == "":
                continue  # empty lines are paragraph separators in telegram, not in HTML
            lines.append(f"        <p>{line}</p>")
        events_articles.append(
            "      <article class=\"event\">\n" +
            "\n".join(lines) +
            "\n      </article>")
    events_html = "\n".join(events_articles)

    # Social links
    ig_url = urls.get("instagram", "https://instagram.com/olga_rozet")
    tg_url = urls.get("telegram", "https://t.me/olga_rozet")

    return f"""<!DOCTYPE html>
<html lang="ru">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Ольга Розет — художник, дизайнер</title>
  <meta name="description" content="Ольга Розет — художник, искусствовед, дизайнер интерьеров. Консультации, путешествия, искусство.">
  <link rel="canonical" href="https://olgarozet.ru">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Ольга Розет">
  <meta property="og:description" content="Художник, искусствовед, дизайнер интерьеров">
  <meta property="og:url" content="https://olgarozet.ru">
  <meta property="og:image" content="https://olgarozet.ru/olga_footer.png">
  <meta property="og:locale" content="ru_RU">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Ольга Розет">
  <meta name="twitter:description" content="Художник, искусствовед, дизайнер интерьеров">
  <meta name="twitter:image" content="https://olgarozet.ru/olga_footer.png">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)">
  <script type="application/ld+json">{{
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "{bio['title']}",
    "alternateName": "Olga Rozet",
    "url": "https://olgarozet.ru",
    "image": "https://olgarozet.ru/olga_footer.png",
    "jobTitle": ["Художник", "Дизайнер", "Искусствовед"],
    "email": "{bio['email']}",
    "sameAs": ["{ig_url}", "{tg_url}"]
  }}</script>
  <link rel="stylesheet" href="styles.css">
</head>

<body>
  <div class="content-wrapper">
    <header>
      <h1>{bio['title']}</h1>
    </header>

    <main>
{bio_html}

{cons_html}

      <section id="events" aria-labelledby="events-heading">
        <h2 id="events-heading">СКОРО:</h2>
{events_html}
      </section>
    </main>
  </div>

  <footer>
    <div class="footer-content">
      <a href="{ig_url}" class="social-icon" aria-label="Instagram">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
      </a>
      <img src="olga_footer.png" alt="{bio['title']}" class="footer-portrait">
      <a href="{tg_url}" class="social-icon" aria-label="Telegram">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      </a>
    </div>
    <a href="#" class="scroll-top" aria-label="Наверх" onclick="window.scrollTo({{top:0,behavior:'smooth'}});return false;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
    </a>
  </footer>

  <script>
    const footer = document.querySelector('.footer-content');
    const observer = new IntersectionObserver((entries) => {{
      entries.forEach(entry => {{
        if (entry.isIntersecting) entry.target.classList.add('visible');
      }});
    }}, {{ threshold: 0.1 }});
    observer.observe(footer);
  </script>
</body>
</html>
"""


# ── P_telegram: D → channel post text ────────────────────

def p_telegram(d: dict) -> str:
    """Telegram channel post. Vertical, poetic. Empty lines = paragraph breaks."""
    parts = ["СКОРО:", "", "•"]
    for ev in d["events"]:
        parts.append("")
        parts.append(ev["title"])
        for line in ev.get("lines", []):
            parts.append(line)
        parts.append("")
        parts.append("•")
    # Remove trailing •
    if parts and parts[-1] == "•":
        parts.pop()
    return "\n".join(parts)


# ── P_bio: D → short bio ─────────────────────────────────

def p_bio(d: dict) -> str:
    bio = d["bio"]
    lines = [bio["artist"]["text"]]
    lines.extend(f"{r};" for r in bio.get("roles", []))
    lines.extend(f"{s}." for s in bio.get("skills", []))
    lines.append(bio["inspire"].strip().splitlines()[0])
    lines.append(d["urls"].get("telegram_handle", "@olgaroset"))
    return "\n".join(lines)


# ── Main ─────────────────────────────────────────────────

if __name__ == "__main__":
    d = load()

    html = p_site(d)
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print(f"site: index.html")

    tg = p_telegram(d)
    (ROOT / "telegram.txt").write_text(tg, encoding="utf-8")
    print(f"telegram: telegram.txt")

    bio = p_bio(d)
    (ROOT / "bio.txt").write_text(bio, encoding="utf-8")
    print(f"bio: bio.txt")
