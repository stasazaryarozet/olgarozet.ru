/**
 * Dela Presentation Engine — ПОВЕДЕНИЕ НАД ДОКУМЕНТОМ, а не второй рендерер.
 *
 * КОРЕНЬ (замер 2026-08-18): этот файл СОДЕРЖАЛ второй рендерер той же модели —
 * 259 строк из 670, шесть случаев по роду главы, собственный словарь классов и
 * собственную прозу («7-осевая матрица…», «Нажмите на любую ось…», «Формула
 * анализа интерьера:», «undefined» вместо имени карточки). Он ЗАМЕЩАЛ документ
 * при init: у читателя со скриптом не было ни одного <article>, и 67 из 227
 * единиц прозы модели до него не доезжали, хотя сервер их отдал.
 *
 * Теперь документ приходит СОБРАННЫМ (narrative_showcase.body из той же модели),
 * а этот файл лишь вешает на него поведение, цепляясь за те же координаты, что
 * рендерер уже проставил (`data-kind`, `data-role`, `data-field`). Вторая
 * ипостась — ЭФИР 16:9 — остаётся динамической: проектор строит кадр из модели,
 * и это не документ, а показ.
 */

(function () {
  'use strict';

  /* ── ЕДИНИЦА РЕЧИ ────────────────────────────────────────────────────────────────
   * Значение может быть строкой или ЕДИНИЦЕЙ {act, text}. Род акта объявлен Спекой
   * surface-provenance, и КАВЫЧКИ РИСУЕТ ПОКАЗ по роду — в данных их нет
   * (Inv-PROV-marks-follow-act). Словарь родов приезжает В МОДЕЛИ (`speech`). */
  let ACTS = {}, MARKS = ['', ''];
  function said(v) {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'object') return String(v);
    const kind = ACTS[v.act] || null;
    const text = v.text === undefined ? '' : String(v.text);
    return (kind && kind.quoted) ? MARKS[0] + text + MARKS[1] : text;
  }

  /* ЛЁГКАЯ ФОРМА НОСИТЕЛЯ — одна дверь адреса картинки: `light` выводит materialise
   * тем же _webp, каким документ строит <picture>. Область видимости — МОДУЛЬ. */
  const imgSrc = (s) => `img/${(s && (s.light || s.file)) || ''}`;

  /* ЧТО ПОКАЗЫВАЕТ ПРОЕКТОР: единица с носителем И со своей секундой. Кадр есть
   * момент записи; единица без времени (карточка, разворот) в эфир не идёт —
   * отбор ВЫВЕДЕН из данных, а не перечислен списком. */
  const projectable = (segments) => (segments || [])
    .filter(s => s && s.file && typeof s.seconds === 'number')
    .sort((a, b) => a.seconds - b.seconds);

  class PresentationEngine {
    constructor() {
      this.data = null;
      this.frames = [];
      this.state = { currentSlideIndex: 0, currentMode: 'editorial', hudVisible: true, lastScrollY: 0 };
      this.hudIdleTimer = null;
    }

    async init(dataPath = 'presentation_data.json') {
      try {
        const res = await fetch(dataPath);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        this.data = await res.json();
        const speech = this.data.speech || {};
        ACTS = speech.acts || {};
        MARKS = speech.draw_marks || ['', ''];
      } catch (err) {
        console.error('Failed to load presentation schema:', err);
        return;
      }

      this.frames = projectable(this.data.segments);
      this.cacheElements();
      this.nameSurface();
      this.renderBroadcastThumbnails();
      this.initTheme();
      this.bindEvents();
      this.updateSlideDisplay(0);

      // System API for Video Remounting & External Automation
      window.RozetPresentation = {
        goToSlide: (idx) => this.goToSlide(idx),
        setLectureTime: (sec) => this.setLectureTime(sec),
        setMode: (m) => this.setMode(m),
        frames: () => this.frames.length
      };
    }

    cacheElements() {
      this.el = {
        body: document.body,
        editorialView: document.getElementById('editorialView'),
        broadcastView: document.getElementById('broadcastView'),
        navBrand: document.getElementById('navBrand'),
        btnModeEditorial: document.getElementById('btnModeEditorial'),
        btnModeBroadcast: document.getElementById('btnModeBroadcast'),
        btnThemeToggle: document.getElementById('btnThemeToggle'),
        stageImg: document.getElementById('stageImg'),
        stageHud: document.getElementById('stageHud'),
        hudAuthor: document.getElementById('hudAuthor'),
        hudTimecode: document.getElementById('hudTimecode'),
        hudSlideCounter: document.getElementById('hudSlideCounter'),
        hudTag: document.getElementById('hudTag'),
        hudTitle: document.getElementById('hudTitle'),
        hudCite: document.getElementById('hudCite'),
        btnPrevSlide: document.getElementById('btnPrevSlide'),
        btnNextSlide: document.getElementById('btnNextSlide'),
        btnToggleHud: document.getElementById('btnToggleHud'),
        btnFullscreen: document.getElementById('btnFullscreen'),
        thumbsTrack: document.getElementById('thumbsTrack')
      };
    }

    /* ИМЯ ПОВЕРХНОСТИ ЧИТАЕТСЯ С ДОКУМЕНТА, а не составляется здесь: прежде хром
     * склеивал `${author} / ${title} · ${subtitle}` в коде — третье написание тех
     * же слов (и русская грамматика в нём ломалась: «Инструмент Ольга Розет»). */
    nameSurface() {
      const doc = this.el.editorialView;
      if (!doc) return;
      const text = (sel) => (doc.querySelector(sel) || {}).textContent || '';
      const title = text('h1');
      const subtitle = text('[data-field="subtitle"]');
      const author = text('[data-field="author"]');
      if (this.el.navBrand && title) {
        this.el.navBrand.textContent = [author, [title, subtitle].filter(Boolean).join(' · ')]
          .filter(Boolean).join(' / ');
      }
      if (this.el.hudAuthor && author) this.el.hudAuthor.textContent = author;
    }

    /* =========================================================================
       ЭФИР 16:9 — ПРОЕКТОР (не документ: кадр строится из модели)
       ========================================================================= */
    renderBroadcastThumbnails() {
      if (!this.el.thumbsTrack || !this.frames.length) return;
      this.el.thumbsTrack.innerHTML = '';
      this.frames.forEach((frame, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
        thumb.setAttribute('data-index', idx);
        thumb.setAttribute('title', `${frame.title} · ${frame.timecode || ''}`.trim());
        const img = document.createElement('img');
        img.src = imgSrc(frame);
        img.alt = frame.title || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        thumb.appendChild(img);
        thumb.addEventListener('click', () => this.goToSlide(idx));
        this.el.thumbsTrack.appendChild(thumb);
      });
    }

    updateSlideDisplay(index) {
      if (!this.frames.length || index < 0 || index >= this.frames.length) return;
      this.state.currentSlideIndex = index;
      const frame = this.frames[index];

      if (this.el.stageImg) {
        this.el.stageImg.style.opacity = '0';
        setTimeout(() => {
          this.el.stageImg.src = imgSrc(frame);
          this.el.stageImg.alt = frame.title || '';
          this.el.stageImg.style.opacity = '1';
        }, 60);
      }

      if (this.el.hudTimecode) this.el.hudTimecode.textContent = `⏱ ${frame.timecode || ''}`;
      // СЧЁТЧИК ЕСТЬ ПОЛОЖЕНИЕ В РЯДУ, а не имя единицы: имя у неё своё и не порядковое.
      if (this.el.hudSlideCounter) {
        this.el.hudSlideCounter.textContent =
          `${String(index + 1).padStart(2, '0')} / ${this.frames.length}`;
      }
      if (this.el.hudTag) this.el.hudTag.textContent = frame.tag || '';
      if (this.el.hudTitle) this.el.hudTitle.textContent = frame.title || '';
      if (this.el.hudCite) this.el.hudCite.textContent = said(frame.cite);

      if (this.el.thumbsTrack) {
        this.el.thumbsTrack.querySelectorAll('.thumb-item').forEach((t, i) => {
          t.classList.toggle('active', i === index);
          if (i === index) t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
      }

      [index + 1, index - 1].forEach(i => {
        if (i >= 0 && i < this.frames.length) { const im = new Image(); im.src = imgSrc(this.frames[i]); }
      });
    }

    goToSlide(index) { this.updateSlideDisplay(index); }
    nextSlide() { if (this.state.currentSlideIndex < this.frames.length - 1) this.goToSlide(this.state.currentSlideIndex + 1); }
    prevSlide() { if (this.state.currentSlideIndex > 0) this.goToSlide(this.state.currentSlideIndex - 1); }

    setLectureTime(seconds) {
      let matchIdx = 0;
      for (let i = 0; i < this.frames.length; i++) {
        if (seconds >= this.frames[i].seconds) matchIdx = i; else break;
      }
      if (matchIdx !== this.state.currentSlideIndex) this.goToSlide(matchIdx);
    }

    toggleHud() {
      this.state.hudVisible = !this.state.hudVisible;
      if (this.el.stageHud) this.el.stageHud.classList.toggle('hud-hidden', !this.state.hudVisible);
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn('Fullscreen error:', err));
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }

    /* =========================================================================
       КОНТРОЛЛЕР
       ========================================================================= */
    initTheme() {
      if (typeof window.__applyTheme === 'function') {
        window.__applyTheme();
      } else {
        document.documentElement.setAttribute('data-theme', localStorage.getItem('dela.theme.v1') || 'day');
      }
    }

    toggleTheme() {
      const next = (document.documentElement.getAttribute('data-theme') || 'day') === 'day' ? 'night' : 'day';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('dela.theme.v1', next); } catch (e) { /* приватный режим */ }
    }

    setMode(mode) {
      this.state.currentMode = mode;
      const broadcast = mode === 'broadcast';
      if (broadcast) this.state.lastScrollY = window.scrollY;
      this.el.body.className = broadcast ? 'mode-broadcast' : 'mode-editorial';
      if (this.el.editorialView) this.el.editorialView.classList.toggle('hidden', broadcast);
      if (this.el.broadcastView) this.el.broadcastView.classList.toggle('hidden', !broadcast);
      [[this.el.btnModeBroadcast, broadcast], [this.el.btnModeEditorial, !broadcast]].forEach(([btn, on]) => {
        if (!btn) return;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (broadcast) {
        this.updateSlideDisplay(this.state.currentSlideIndex);
      } else {
        window.requestAnimationFrame(() => window.scrollTo({ top: this.state.lastScrollY || 0, behavior: 'smooth' }));
      }
    }

    /* ШТАМП ЕДИНИЦЫ — ДВЕРЬ В ЭФИР. Подпись двери берётся с ХРОМА (кнопка режима),
     * а имя цели — с самой единицы: новой прозы в коде не рождается. */
    bindDocumentJumps() {
      const doc = this.el.editorialView;
      if (!doc) return;
      const home = new Map(this.frames.map((f, i) => [`doc-segments-${f.id}`, i]));
      const modeWord = (this.el.btnModeBroadcast && this.el.btnModeBroadcast.textContent || '').trim();
      doc.querySelectorAll('[data-kind="segment"] [data-role="stamp"]').forEach(stamp => {
        const holder = stamp.closest('[data-kind="segment"]');
        const idx = holder && home.get(holder.id);
        if (idx === undefined || idx === null) return;
        const name = (holder.querySelector('[data-role="title"]') || {}).textContent || '';
        stamp.setAttribute('role', 'button');
        stamp.setAttribute('tabindex', '0');
        stamp.setAttribute('aria-label', [modeWord, name].filter(Boolean).join(' — '));
        const go = (e) => { e.preventDefault(); this.setMode('broadcast'); this.goToSlide(idx); };
        stamp.addEventListener('click', go);
        stamp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
      });
    }

    bindEvents() {
      if (this.el.btnModeEditorial) this.el.btnModeEditorial.addEventListener('click', () => this.setMode('editorial'));
      if (this.el.btnModeBroadcast) this.el.btnModeBroadcast.addEventListener('click', () => this.setMode('broadcast'));
      if (this.el.btnThemeToggle) this.el.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
      if (this.el.btnPrevSlide) this.el.btnPrevSlide.addEventListener('click', () => this.prevSlide());
      if (this.el.btnNextSlide) this.el.btnNextSlide.addEventListener('click', () => this.nextSlide());
      if (this.el.btnToggleHud) this.el.btnToggleHud.addEventListener('click', () => this.toggleHud());
      if (this.el.btnFullscreen) this.el.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
      this.bindDocumentJumps();

      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if ('tTеЕ'.includes(e.key)) { this.toggleTheme(); return; }
        if ('mMьЬ'.includes(e.key)) { this.setMode(this.state.currentMode === 'editorial' ? 'broadcast' : 'editorial'); return; }
        if (this.state.currentMode !== 'broadcast') return;
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || 'jJоО'.includes(e.key)) {
          e.preventDefault(); this.nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || 'kKлЛ'.includes(e.key)) {
          e.preventDefault(); this.prevSlide();
        } else if ('hHрР'.includes(e.key)) {
          e.preventDefault(); this.toggleHud();
        } else if ('fFаА'.includes(e.key)) {
          e.preventDefault(); this.toggleFullscreen();
        } else if (e.key === 'Escape') {
          this.setMode('editorial');
        }
      });

      const resetHudIdle = () => {
        if (this.state.currentMode !== 'broadcast' || !this.el.broadcastView) return;
        this.el.broadcastView.classList.remove('hud-idle');
        clearTimeout(this.hudIdleTimer);
        this.hudIdleTimer = setTimeout(() => {
          if (this.state.currentMode === 'broadcast' && this.el.broadcastView) {
            this.el.broadcastView.classList.add('hud-idle');
          }
        }, 3500);
      };
      window.addEventListener('mousemove', resetHudIdle, { passive: true });
      window.addEventListener('touchstart', resetHudIdle, { passive: true });
    }
  }

  const engine = new PresentationEngine();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.init('presentation_data.json'));
  } else {
    engine.init('presentation_data.json');
  }
})();
