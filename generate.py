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

_CHANNEL_LABEL = {"site": "сайт", "telegram": "Telegram", "instagram": "Instagram"}


def p_publications(d: dict) -> str:
    """Публикации section — semantic Сайт↔TG↔IG linkage. Empty if absent."""
    pubs = d.get("publications", [])
    if not pubs:
        return ""
    items = []
    for p in pubs:
        label = _CHANNEL_LABEL.get(p.get("channel", ""), p.get("channel", ""))
        items.append(
            f'        <li><a href="{p["link"]}" class="pub" rel="noopener">'
            f'<span class="pub-channel">{label}</span>'
            f'<span class="pub-title">{p["title"]}</span></a></li>'
        )
    return (
        '    <section id="publications" aria-labelledby="publications-heading">\n'
        '      <h2 id="publications-heading">Публикации:</h2>\n'
        '      <ul class="publications-list">\n'
        + "\n".join(items) +
        '\n      </ul>\n'
        '    </section>'
    )


def p_site(d: dict) -> str:
    bio = d["bio"]
    cons = d["consultations"]
    events = d["events"]
    urls = d.get("urls", {})
    publications_html = p_publications(d)

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
  <script>
  // Solar-driven day/night theme. Closed-form Michalsky 1988 altitude.
  // Longitude ≈ -tzOffset/4 (15°/h). Latitude default 45° (temperate). No API, no geolocation prompt.
  (function(){{
    var r=Math.PI/180, now=new Date();
    var J=now.valueOf()/86400000 + 2440587.5 - 2451545.0;
    var L=(280.460+0.9856474*J)%360;
    var g=((357.528+0.9856003*J)%360)*r;
    var lam=(L+1.915*Math.sin(g)+0.020*Math.sin(2*g))*r;
    var eps=(23.439-4e-7*J)*r;
    var dec=Math.asin(Math.sin(eps)*Math.sin(lam));
    var ra=Math.atan2(Math.cos(eps)*Math.sin(lam), Math.cos(lam));
    var lon=-now.getTimezoneOffset()/4, lat=45;
    var gmst=(18.697374558+24.06570982441908*J)*15;
    var H=((gmst+lon)%360)*r - ra;
    var alt=Math.asin(Math.sin(lat*r)*Math.sin(dec)+Math.cos(lat*r)*Math.cos(dec)*Math.cos(H));
    document.documentElement.setAttribute('data-theme', alt>0 ? 'day' : 'night');
  }})();
  </script>
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

{publications_html}
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
    <a href="#" class="scroll-top" aria-label="Наверх" title="Наверх" onclick="window.scrollTo({{top:0,behavior:'smooth'}});return false;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4M5 11l7-7 7 7"/></svg>
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
    # Consultations: description + price + availability + booking link
    # All from data.yaml (single source)
    cons = d.get("consultations", {})
    if cons:
        parts.append("")
        parts.append("•")
        parts.append("")
        for line in cons["description"].strip().splitlines():
            stripped = line.strip()
            if stripped:
                parts.append(stripped)
        parts.append(cons["price"])
        parts.append("")
        for line in cons["availability"].strip().splitlines():
            stripped = line.strip()
            if stripped:
                parts.append(stripped)
        parts.append("")
        parts.append("olgarozet.ru/booking")
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

    UX optimized for minimal human effort:
    - Fitts's Law: 48px touch targets
    - Hick's Law: "ближайшее свободное" prominent, rest progressive
    - Progressive disclosure: form hidden until slot picked
    - CSS custom properties from site styles.css
    - prefers-reduced-motion respected
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
    desc_plain = cons["description"].strip().replace("\n", " ").replace("  ", " ")
    contact_email = cons.get("calendar_id", "o.g.rozet@gmail.com")

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Записаться — Ольга Розет</title>
<meta name="description" content="{desc_plain} — {cons['price']}">
<link rel="stylesheet" href="../styles.css">
<style>
.booking{{max-width:420px;margin:0 auto;padding:2.5rem 1.5rem 2rem}}
.booking h2{{font-size:clamp(1.1rem,1rem + 0.3vw,1.3rem);text-align:center;font-weight:600;margin-bottom:.15rem}}
.sub{{text-align:center;color:var(--color-muted,#666);font-size:.95rem}}
.tz{{text-align:center;color:#aaa;font-size:.8rem;margin-bottom:1rem}}

/* Step 1: slots */
.day{{margin-bottom:.8rem}}
.day-label{{font-size:.85rem;color:var(--color-muted,#666);margin-bottom:.3rem;font-weight:500}}
.slots-grid{{display:flex;flex-wrap:wrap;gap:.3rem}}
.t{{display:inline-flex;align-items:center;justify-content:center;
  min-width:3.5rem;min-height:3rem;padding:.5rem 1rem;
  border:1px solid var(--color-border,#ddd);border-radius:2rem;cursor:pointer;
  font-size:.95rem;transition:border-color .15s,background .15s,color .15s,transform .1s;
  user-select:none;-webkit-tap-highlight-color:transparent}}
.t:hover{{border-color:var(--color-text,#1a1a1a)}}
.t:focus-visible{{outline:2px solid var(--color-text,#1a1a1a);outline-offset:2px}}
.t:active{{transform:scale(.95)}}
.t.on{{background:var(--color-text,#1a1a1a);color:#fff;border-color:var(--color-text,#1a1a1a)}}
.more{{text-align:center;margin:.6rem 0}}
.more button{{background:none;border:none;color:var(--color-muted,#666);font-size:.85rem;
  cursor:pointer;font-family:inherit;padding:.5rem 1rem}}

/* Step 2: form (hidden until slot picked) */
.bk-form{{overflow:hidden;max-height:0;opacity:0;transition:max-height .35s ease,opacity .3s ease;margin-top:0}}
.bk-form.open{{max-height:20rem;opacity:1;margin-top:1rem}}
.bk-label{{display:block;font-size:.8rem;color:var(--color-muted,#666);margin-bottom:.15rem;margin-top:.4rem}}
.bk-input{{display:block;width:100%;padding:.75rem .9rem;border:1px solid var(--color-border,#ddd);
  border-radius:.5rem;font-size:.95rem;font-family:inherit;transition:border-color .15s}}
.bk-input:focus{{border-color:var(--color-text,#1a1a1a);outline:none}}
.bk-input.ok{{border-color:#2a7a2a}}
.bk-input.err{{border-color:#c00;animation:shake .3s}}
@keyframes shake{{0%,100%{{transform:translateX(0)}}25%{{transform:translateX(-4px)}}75%{{transform:translateX(4px)}}}}
.bk-btn{{display:block;width:100%;padding:.9rem;margin-top:.6rem;
  background:var(--color-text,#1a1a1a);color:#fff;border:none;border-radius:.5rem;
  font-size:.95rem;font-weight:500;cursor:pointer;font-family:inherit;
  min-height:3rem;letter-spacing:.03em;transition:background .15s,opacity .15s}}
.bk-btn:hover:not(:disabled){{background:#333}}
.bk-btn:focus-visible{{outline:2px solid var(--color-text,#1a1a1a);outline-offset:2px}}
.bk-btn:disabled{{background:#d0d0d0;cursor:default;pointer-events:none}}
.bk-btn.sending{{opacity:.7}}

/* Step 3: result */
.result{{text-align:center;padding:2rem 0;line-height:1.6}}
.result b{{display:block;font-size:1.1rem;margin-bottom:.5rem}}
.result .next{{color:var(--color-muted,#666);font-size:.9rem;margin-top:.5rem}}
.msg{{text-align:center;padding:.6rem;line-height:1.5;font-size:.9rem}}
.msg.error{{color:#c00}}
.back{{text-align:center;margin-top:1.5rem}}
.back a{{color:#aaa;font-size:.85rem;text-decoration:none;border:none}}
.no-slots{{text-align:center;color:var(--color-muted,#666);padding:1.5rem 0;line-height:1.6}}
.no-slots a{{color:var(--color-text,#1a1a1a)}}

@media (prefers-reduced-motion:reduce){{
  .bk-form{{transition:none}}.t{{transition:none}}.bk-input{{transition:none}}
  .bk-btn{{transition:none}}.bk-input.err{{animation:none}}
}}
</style>
</head>
<body>
<div class="booking" role="main">
<h2>Консультация</h2>
<p class="sub">{cons.get('duration_min', 40)} мин · {cons['price']} · онлайн</p>
<p class="tz" id="tz-note">выберите удобное время</p>

<noscript>
<div class="no-slots">
<p>{desc_plain}</p>
<p>Напишите для записи:</p>
<p><a href="https://t.me/olgaroset">@olgaroset</a> · <a href="mailto:{contact_email}">{contact_email}</a></p>
</div>
</noscript>

<div id="step-slots" role="listbox" aria-label="Выберите время"></div>
<div class="more" id="more" style="display:none">
  <button type="button" onclick="showAll()">ещё даты →</button>
</div>

<form class="bk-form" id="bk-form" onsubmit="return false" novalidate aria-label="Контактные данные">
  <label class="bk-label" for="bk-name">Имя</label>
  <input class="bk-input" id="bk-name" name="name" autocomplete="name"
         required minlength="2" aria-required="true">
  <label class="bk-label" for="bk-contact">Телефон, Telegram или Email</label>
  <input class="bk-input" id="bk-contact" name="contact"
         required minlength="3" aria-required="true">
  <button class="bk-btn" id="bk-btn" type="submit" disabled
          aria-disabled="true">Выберите время</button>
</form>

<div class="msg" id="bk-msg" role="status" aria-live="polite"></div>
<p class="back"><a href="/">← назад</a></p>
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
  days[key].push({{date:key,time:dt.toLocaleTimeString("ru",{{hour:"2-digit",minute:"2-digit",hour12:false}}),
    id:s.id,label:dt.toLocaleDateString("ru",{{weekday:"short",day:"numeric",month:"short"}})}});
}});
allDays=Object.keys(days).map(function(k){{return{{key:k,slots:days[k]}}}});
if(allDays.length===0){{
  document.getElementById("step-slots").innerHTML="<div class='no-slots'>Свободного времени нет.<br><a href='https://t.me/olgaroset'>Написать Ольге</a></div>";
}}else{{
  render(allDays.length);
}}
}})();

function render(n){{
var el=document.getElementById("step-slots");var h="";
allDays.slice(0,n).forEach(function(d,i){{
  h+="<div class='day' role='group' aria-label='"+d.slots[0].label+"'>";
  h+="<div class='day-label'>"+d.slots[0].label+"</div><div class='slots-grid'>";
  d.slots.forEach(function(s){{
    h+="<button type='button' class='t' role='option' aria-selected='false' ";
    h+="data-d='"+s.date+"' data-t='"+s.time+"' data-id='"+s.id+"'";
    h+=" aria-label='"+s.time+", "+d.slots[0].label+"'>"+s.time+"</button>";
  }});
  h+="</div></div>";
}});
el.innerHTML=h;
el.querySelectorAll(".t").forEach(function(b){{b.addEventListener("click",function(){{pick(this)}});}});
}}
function showAll(){{render(allDays.length);document.getElementById("more").style.display="none"}}
function pick(el){{
document.querySelectorAll(".t").forEach(function(s){{s.classList.remove("on");s.setAttribute("aria-selected","false")}});
el.classList.add("on");el.setAttribute("aria-selected","true");
slot={{date:el.dataset.d,time:el.dataset.t,id:el.dataset.id}};
var btn=document.getElementById("bk-btn");
btn.disabled=false;btn.setAttribute("aria-disabled","false");
btn.textContent=slot.time+" — записаться";
var form=document.getElementById("bk-form");
if(!form.classList.contains("open")){{
  form.classList.add("open");
  setTimeout(function(){{document.getElementById("bk-name").focus()}},350);
}}
}}

/* inline validation */
document.getElementById("bk-name").addEventListener("input",function(){{
  this.classList.toggle("ok",this.value.trim().length>=2);
  this.classList.remove("err");
}});
document.getElementById("bk-contact").addEventListener("input",function(){{
  var v=this.value.trim();
  this.classList.toggle("ok",v.length>=3&&/[\\d@.]/.test(v));
  this.classList.remove("err");
}});

document.getElementById("bk-form").addEventListener("submit",function(e){{e.preventDefault();book()}});
function book(){{
if(submitted)return;
var nameEl=document.getElementById("bk-name");
var contactEl=document.getElementById("bk-contact");
var msgEl=document.getElementById("bk-msg");
nameEl.classList.remove("err");contactEl.classList.remove("err");msgEl.textContent="";msgEl.className="msg";
if(!slot)return;
var n=nameEl.value.trim(),c=contactEl.value.trim();
if(n.length<2){{nameEl.classList.add("err");nameEl.focus();return}}
if(c.length<3||!/[\\d@.]/.test(c)){{contactEl.classList.add("err");contactEl.focus();return}}
var btn=document.getElementById("bk-btn");
btn.disabled=true;btn.classList.add("sending");btn.textContent="отправка...";
fetch(API+"?name="+encodeURIComponent(n)+"&contact="+encodeURIComponent(c)+"&date="+slot.date+"&time="+slot.time+"&id="+slot.id)
.then(function(r){{return r.json()}}).then(function(d){{
btn.classList.remove("sending");
if(d.ok){{submitted=true;
  document.getElementById("step-slots").style.display="none";
  document.getElementById("more").style.display="none";
  document.getElementById("bk-form").style.display="none";
  msgEl.className="msg";
  msgEl.innerHTML="<div class='result'><b>Заявка принята</b>"+slot.time+" · "+
    new Date(slot.date).toLocaleDateString("ru",{{day:"numeric",month:"long"}})+
    "<div class='next'>Ольга свяжется с вами для подтверждения</div></div>";
}}else{{
  var m={{"name_required":"Введите имя","contact_required":"Введите контакт",
    "contact_invalid":"Некорректный контакт","slot_taken":"Это время уже занято — выберите другое"}};
  msgEl.className="msg error";msgEl.textContent=m[d.error]||"Ошибка. Попробуйте позже.";
  btn.disabled=false;btn.textContent=slot.time+" — записаться"}}
}}).catch(function(){{btn.classList.remove("sending");msgEl.className="msg error";
  msgEl.textContent="Ошибка сети";btn.disabled=false;btn.textContent=slot.time+" — записаться"}});
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
