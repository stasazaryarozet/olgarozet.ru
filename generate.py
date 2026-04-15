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
      <a href="{cons['link']}" class="cta">{cons['cta']}</a>
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


# ── P_booking: (D, slots.json) → booking/index.html ──────

def p_booking(d: dict) -> str:
    """Fourth projection: consultations config + slots → booking page.

    Reads booking.json (generated by System) for slot data.
    No API keys in output. Client reads static slots, POSTs to transport gate.
    """
    import json as _json
    cons = d["consultations"]
    slots_file = ROOT / "booking.json"
    if slots_file.exists():
        slots_data = _json.loads(slots_file.read_text())
    else:
        slots_data = {"slots": [], "user": ""}

    transport_url = slots_data.get("transport_url",
        "https://script.google.com/macros/s/AKfycbzeulk8nVhROOmrnysLKRLGqM_naMEgVhtPl50ch_GCilibJ7MXv2rWlGlq1hz1SWc/exec")
    slots_json = _json.dumps(slots_data.get("slots", []), ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Записаться — Ольга Розет</title>
<link rel="stylesheet" href="../styles.css">
<style>
.booking{{max-width:420px;margin:0 auto;padding:2.5rem 1.5rem 2rem}}
.booking h2{{font-size:1.3rem;text-align:center;font-weight:600;margin-bottom:.2rem}}
.sub{{text-align:center;color:#7d7d7d;font-size:.95rem}}
.tz{{text-align:center;color:#aaa;font-size:.8rem;margin-bottom:1.2rem}}
.day{{margin-bottom:.6rem}}
.day-label{{font-size:.85rem;color:#999;margin-bottom:.2rem}}
.t{{display:inline-block;padding:.35rem .9rem;margin:.12rem;border:1px solid #e5e5e5;border-radius:2rem;cursor:pointer;font-size:.9rem;transition:all .12s;user-select:none}}
.t:hover{{border-color:#999}}.t.on{{background:#1a1a1a;color:#fff;border-color:#1a1a1a}}
.more{{text-align:center;margin:.8rem 0}}
.more a{{color:#7d7d7d;font-size:.85rem;cursor:pointer}}
.bk-input{{display:block;width:100%;padding:.65rem .9rem;margin-bottom:.4rem;border:1px solid #e5e5e5;border-radius:.5rem;font-size:.95rem;font-family:inherit}}
.bk-input:focus{{border-color:#1a1a1a;outline:none}}
.bk-input.err{{border-color:#c00}}
.bk-btn{{display:block;width:100%;padding:.75rem;margin-top:.2rem;background:#1a1a1a;color:#fff;border:none;border-radius:.5rem;font-size:.95rem;font-weight:500;cursor:pointer;font-family:inherit}}
.bk-btn:hover{{background:#333}}.bk-btn:disabled{{background:#d0d0d0;cursor:default;pointer-events:none}}
.msg{{text-align:center;padding:1rem;line-height:1.5}}
.back{{text-align:center;margin-top:1.5rem}}
.back a{{color:#aaa;font-size:.85rem;text-decoration:none}}
.no-slots{{text-align:center;color:#999;padding:1.5rem 0}}
.no-slots a{{color:#7d7d7d}}
</style>
</head>
<body>
<div class="booking">
<h2>Консультация</h2>
<p class="sub">{cons.get('duration_min', 40)} мин · {cons['price']} · онлайн</p>
<p class="tz">время показано по вашему часовому поясу</p>
<div id="slots"></div>
<div class="more" id="more" style="display:none"><a onclick="showAll()">Показать все даты →</a></div>
<input class="bk-input" id="bk-name" placeholder="Имя" required minlength="2">
<input class="bk-input" id="bk-contact" placeholder="Телефон, Telegram или Email" required minlength="3">
<button class="bk-btn" id="bk-btn" type="button" onclick="book()" disabled>Выберите время</button>
<div class="msg" id="bk-msg"></div>
<p class="back"><a href="/">← Ольга Розет</a></p>
</div>
<script>
var API="{transport_url}";
var SLOTS={slots_json};
var slot=null,allDays=[],submitted=false;

(function(){{
var days={{}};
SLOTS.forEach(function(s){{
  var dt=new Date(s.start);
  var key=dt.toISOString().slice(0,10);
  if(!days[key])days[key]=[];
  days[key].push({{date:key,time:dt.toLocaleTimeString("ru",{{hour:"2-digit",minute:"2-digit",hour12:false}}),id:s.id,label:dt.toLocaleDateString("ru",{{weekday:"long",day:"numeric",month:"long"}})}});
}});
allDays=Object.keys(days).map(function(k){{return{{key:k,slots:days[k]}}}});
if(allDays.length===0){{
  document.getElementById("slots").innerHTML="<p class='no-slots'>Свободного времени нет.<br>Напишите: <a href='https://t.me/olgaroset'>@olgaroset</a></p>";
}}else{{
  render(7);
  if(allDays.length>7)document.getElementById("more").style.display="block";
}}
}})();

function render(n){{
var el=document.getElementById("slots");var h="";
allDays.slice(0,n).forEach(function(d){{
h+="<div class='day'><div class='day-label'>"+d.slots[0].label+"</div>";
d.slots.forEach(function(s){{h+="<span class='t' onclick='pick(this,\\""+s.date+"\\",\\""+s.time+"\\",\\""+s.id+"\\")'>"+s.time+"</span>";}});
h+="</div>";}});
el.innerHTML=h;
}}
function showAll(){{render(allDays.length);document.getElementById("more").style.display="none"}}
function pick(el,d,t,id){{
document.querySelectorAll(".t").forEach(function(s){{s.classList.remove("on")}});
el.classList.add("on");slot={{date:d,time:t,id:id}};
document.getElementById("bk-btn").disabled=false;
document.getElementById("bk-btn").textContent=t+" — ЗАПРОСИТЬ ВРЕМЯ";
}}
function ok(el,msg){{el.classList.add("err");document.getElementById("bk-msg").textContent=msg;el.focus();return false}}
function book(){{
if(submitted)return;
var nameEl=document.getElementById("bk-name");
var contactEl=document.getElementById("bk-contact");
var msgEl=document.getElementById("bk-msg");
nameEl.classList.remove("err");contactEl.classList.remove("err");msgEl.textContent="";
if(!slot)return ok(nameEl,"Выберите время");
var n=nameEl.value.trim(),c=contactEl.value.trim();
if(n.length<2)return ok(nameEl,"Введите имя (минимум 2 символа)");
if(c.length<3)return ok(contactEl,"Введите контакт");
if(!/[\\d@.]/.test(c))return ok(contactEl,"Введите телефон, email или Telegram");
var btn=document.getElementById("bk-btn");
btn.disabled=true;btn.textContent="Отправка...";
fetch(API+"?name="+encodeURIComponent(n)+"&contact="+encodeURIComponent(c)+"&date="+slot.date+"&time="+slot.time+"&id="+slot.id)
.then(function(r){{return r.json()}}).then(function(d){{
if(d.ok){{submitted=true;msgEl.innerHTML="<b>Заявка отправлена!</b><br>Ольга свяжется с вами для подтверждения.";
document.getElementById("slots").style.display="none";document.getElementById("more").style.display="none";
nameEl.style.display="none";contactEl.style.display="none";btn.style.display="none";}}
else{{msgEl.textContent=d.error==="name_required"?"Введите имя":d.error==="contact_required"?"Введите контакт":d.error==="contact_invalid"?"Некорректный контакт":"Ошибка. Попробуйте позже.";btn.disabled=false;btn.textContent="ЗАПРОСИТЬ ВРЕМЯ"}}
}}).catch(function(){{msgEl.textContent="Ошибка сети.";btn.disabled=false;btn.textContent="ЗАПРОСИТЬ ВРЕМЯ"}});
}}
</script>
</body>
</html>
"""


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

    booking = p_booking(d)
    (ROOT / "booking" / "index.html").write_text(booking, encoding="utf-8")
    print(f"booking: booking/index.html")
