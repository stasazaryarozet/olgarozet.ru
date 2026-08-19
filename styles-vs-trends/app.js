/**
 * Dela Presentation Engine — ПОВЕДЕНИЕ НАД ДОКУМЕНТОМ, а не второй рендерер.
 *
 * КОРЕНЬ №1 (замер 2026-08-18): этот файл СОДЕРЖАЛ второй рендерер той же модели —
 * 259 строк из 670, шесть случаев по роду главы, собственный словарь классов и
 * собственную прозу. Он ЗАМЕЩАЛ документ при init: у читателя со скриптом не было
 * ни одного <article>. Теперь документ приходит СОБРАННЫМ (narrative_showcase.page
 * из той же модели), а этот файл лишь вешает на него поведение, цепляясь за те же
 * координаты, что рендерер уже проставил (`data-kind`, `data-role`, `data-field`).
 *
 * КОРЕНЬ №2 (замер 2026-08-19, принципал): ВТОРАЯ ПОДАЧА НЕ ИМЕЛА КООРДИНАТЫ.
 * Она звалась «Эфир 16:9» — словом о ФОРМАТЕ, а не о том, куда ведёт; жила
 * `classList.toggle('hidden')`; не имела ни адреса, ни истории, ни возврата
 * («из эфира оно меня не вернуло»); и со слайда некуда было уйти — ни в рассказ,
 * ни в запись. Всё это ОДИН дефект: подача была РЕЖИМОМ, а не видом над тем же
 * рядом единиц.
 *
 * ЛЕЧЕНИЕ. Подачи объявлены моделью (`views`); ключ подачи И ЕСТЬ её координата —
 * в разметке (`data-view` / `data-view-mount`), в оформлении (`body[data-view]`)
 * и в адресе (`#<ключ>/<единица>`). Переключение подачи СОХРАНЯЕТ текущую единицу
 * и пишется в историю, поэтому «назад» возвращает, а ссылка на слайд делится.
 * Имён подач в коде нет ни одного.
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

  /* АДРЕС ЕДИНИЦЫ В ДОКУМЕНТЕ — тот же, что проставил рендерер. Одно место. */
  const anchorOf = (frame) => `doc-segments-${frame.id}`;

  /* МАНИФЕСТАЦИЯ ОБЪЯВЛЕННОГО РОДА — из модели, а не из формулы адреса. */
  function manifest(unit, kind) {
    const at = (unit && unit.fragment && unit.fragment.at) || [];
    for (let i = 0; i < at.length; i++) if (at[i] && at[i].type === kind) return at[i];
    return null;
  }

  class PresentationEngine {
    constructor() {
      this.data = null;
      this.frames = [];
      this.views = [];                 // [ключ, …] в порядке объявления модели
      this.chrome = {};
      this.state = { currentSlideIndex: 0, view: '', hudVisible: true, lastScrollY: 0 };
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

      this.views = Object.keys(this.data.views || {});
      this.chrome = this.data.chrome || {};
      this.frames = projectable(this.data.segments);
      this.cacheElements();
      this.nameSurface();
      this.renderBroadcastThumbnails();
      this.bindEvents();
      this.updateSlideDisplay(0);
      this.applyLocation(false);       // адрес — источник начальной подачи

      // System API for Video Remounting & External Automation
      window.RozetPresentation = {
        goToSlide: (idx) => this.goToSlide(idx),
        setLectureTime: (sec) => this.setLectureTime(sec),
        setView: (v) => this.setView(v),
        frames: () => this.frames.length
      };
    }

    cacheElements() {
      const q = (s) => document.querySelector(s);
      this.el = {
        body: document.body,
        navBrand: q('#navBrand'),
        buttons: Array.from(document.querySelectorAll('[data-view]')),
        mounts: Array.from(document.querySelectorAll('[data-view-mount]')),
        stageImg: q('#stageImg'),
        stageHud: q('#stageHud'),
        hudAuthor: q('#hudAuthor'),
        hudTimecode: q('#hudTimecode'),
        hudSlideCounter: q('#hudSlideCounter'),
        hudTag: q('#hudTag'),
        hudTitle: q('#hudTitle'),
        hudCite: q('#hudCite'),
        hudInStory: q('#hudInStory'),
        hudInVideo: q('#hudInVideo'),
        btnPrevSlide: q('#btnPrevSlide'),
        btnNextSlide: q('#btnNextSlide'),
        btnToggleHud: q('#btnToggleHud'),
        btnFullscreen: q('#btnFullscreen'),
        thumbsTrack: q('#thumbsTrack'),
        broadcastView: q('[data-view-mount="' + (this.views[1] || '') + '"]')
      };
    }

    mount(view) {
      return this.el.mounts.filter(m => m.getAttribute('data-view-mount') === view)[0] || null;
    }

    /* ИМЯ ПОВЕРХНОСТИ ЧИТАЕТСЯ С ДОКУМЕНТА, а не составляется здесь: прежде хром
     * склеивал `${author} / ${title} · ${subtitle}` в коде — третье написание тех
     * же слов (и русская грамматика в нём ломалась: «Инструмент Ольга Розет»). */
    nameSurface() {
      const doc = this.mount(this.views[0]);
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
       ПОКАЗ — ПРОЕКТОР (не документ: кадр строится из модели)
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

      if (this.el.hudTimecode) this.el.hudTimecode.textContent = frame.timecode || '';
      // СЧЁТЧИК ЕСТЬ ПОЛОЖЕНИЕ В РЯДУ. Ведущий ноль («01 / 30») не несёт ничего —
      // лапидарность; связка «из» приезжает из модели, а не из кода.
      if (this.el.hudSlideCounter) {
        const of = this.chrome.of ? ` ${this.chrome.of} ` : ' / ';
        this.el.hudSlideCounter.textContent = `${index + 1}${of}${this.frames.length}`;
      }
      if (this.el.hudTag) this.el.hudTag.textContent = frame.tag || '';
      if (this.el.hudTitle) this.el.hudTitle.textContent = frame.title || '';
      if (this.el.hudCite) this.el.hudCite.textContent = said(frame.cite);

      // ДВЕ ДВЕРИ С КАЖДОГО СЛАЙДА (принципал 2026-08-19): в рассказ и в запись.
      // Обе — координаты, которые модель УЖЕ несёт; новых данных не заводится.
      if (this.el.hudInStory) this.el.hudInStory.setAttribute('href', '#' + anchorOf(frame));
      if (this.el.hudInVideo) {
        const v = manifest(frame, 'video');
        this.el.hudInVideo.hidden = !v;
        if (v) {
          this.el.hudInVideo.setAttribute('href', v.url);
          this.el.hudInVideo.textContent = v.label || this.chrome.in_video || v.url;
        }
      }

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

    goToSlide(index, record) {
      this.updateSlideDisplay(index);
      if (record !== false && this.state.view === this.views[1]) this.record(true);
    }
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
       ПОДАЧА — ВИД НАД ОДНИМ РЯДОМ ЕДИНИЦ, У КОТОРОГО ЕСТЬ КООРДИНАТА
       ========================================================================= */

    /** Адрес текущего положения: подача по умолчанию адресуется единицей, вторая —
     *  парой «подача/единица». Отсюда ссылка на слайд делится, а «назад» работает. */
    address(view, index) {
      const frame = this.frames[index] || null;
      if (view === this.views[0]) return frame ? '#' + anchorOf(frame) : location.pathname;
      return '#' + view + '/' + (frame ? frame.id : '');
    }

    record(replace) {
      const url = this.address(this.state.view, this.state.currentSlideIndex);
      const st = { view: this.state.view, unit: this.state.currentSlideIndex };
      try {
        if (replace) history.replaceState(st, '', url); else history.pushState(st, '', url);
      } catch (e) { /* file:// — история недоступна, поведение остаётся */ }
    }

    setView(view, push) {
      if (!view || this.views.indexOf(view) < 0 || view === this.state.view) return;
      const first = this.views[0];
      if (view !== first) this.state.lastScrollY = window.scrollY;
      this.state.view = view;
      // ОФОРМЛЕНИЕ ЧИТАЕТ ТУ ЖЕ КООРДИНАТУ: `body[data-view]`, а не второе слово.
      this.el.body.setAttribute('data-view', view);
      this.el.mounts.forEach(m =>
        m.classList.toggle('hidden', m.getAttribute('data-view-mount') !== view));
      this.el.buttons.forEach(b => {
        const on = b.getAttribute('data-view') === view;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (view !== first) {
        this.updateSlideDisplay(this.state.currentSlideIndex);
      } else {
        window.requestAnimationFrame(() => window.scrollTo({ top: this.state.lastScrollY || 0, behavior: 'smooth' }));
      }
      if (push !== false) this.record(false);
    }

    /** Адрес → положение. `#<подача>/<единица>` открывает вторую подачу на СВОЁМ
     *  слайде; всё прочее есть обычный якорь документа. */
    applyLocation(push) {
      const h = decodeURIComponent(location.hash || '').replace(/^#/, '');
      const cut = h.indexOf('/');
      const view = cut > 0 ? h.slice(0, cut) : '';
      if (view && this.views.indexOf(view) > 0) {
        const id = h.slice(cut + 1);
        const idx = this.frames.findIndex(f => f.id === id);
        if (idx >= 0) this.updateSlideDisplay(idx);
        this.setView(view, push);
        return true;
      }
      this.setView(this.views[0], push);
      return false;
    }

    /* ШТАМП ЕДИНИЦЫ — ДВЕРЬ В ПОКАЗ. Подпись двери берётся с ХРОМА (кнопка подачи),
     * а имя цели — с самой единицы: новой прозы в коде не рождается. */
    bindDocumentJumps() {
      const doc = this.mount(this.views[0]);
      if (!doc || this.views.length < 2) return;
      const stage = this.views[1];
      const home = new Map(this.frames.map((f, i) => [anchorOf(f), i]));
      const btn = this.el.buttons.filter(b => b.getAttribute('data-view') === stage)[0];
      const word = (btn && btn.textContent || '').trim();
      doc.querySelectorAll('[data-kind="segment"] [data-role="stamp"]').forEach(stamp => {
        const holder = stamp.closest('[data-kind="segment"]');
        const idx = holder && home.get(holder.id);
        if (idx === undefined || idx === null) return;
        const name = (holder.querySelector('[data-role="title"]') || {}).textContent || '';
        stamp.setAttribute('role', 'button');
        stamp.setAttribute('tabindex', '0');
        stamp.setAttribute('aria-label', [word, name].filter(Boolean).join(' — '));
        const go = (e) => { e.preventDefault(); this.goToSlide(idx, false); this.setView(stage); };
        stamp.addEventListener('click', go);
        stamp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
      });
    }

    /** ССЫЛКА В ДОКУМЕНТ ВОЗВРАЩАЕТ В ДОКУМЕНТ. Обход блоков («к содержанию»),
     *  «в рассказе» из плашки, любая внутренняя ссылка: цель лежит в подаче
     *  по умолчанию, значит переход к ней ЕСТЬ переход к ней — а не прыжок в
     *  скрытый узел, из которого читателя ничто не вернуло (принципал 2026-08-19). */
    bindReturns() {
      const first = this.views[0];
      document.addEventListener('click', (e) => {
        const a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || this.state.view === first) return;
        const id = a.getAttribute('href').slice(1);
        const target = id && document.getElementById(id);
        const doc = this.mount(first);
        if (!target || !doc || !doc.contains(target)) return;
        this.setView(first);
      });
    }

    /* ГРАНИЦА ФРАГМЕНТА ИСПОЛНЯЕТСЯ, А НЕ ТОЛЬКО ОБЪЯВЛЯЕТСЯ.
       Документ адресует интервал носителя стандартом (Media Fragments URI:
       `…m4a#t=НАЧАЛО,КОНЕЦ`), но КОНЕЦ чтут не все браузеры — начало чтут все.
       Необъявленная остановка обратила бы «обрыв не по месту» в «не
       останавливается вовсе», поэтому конец удерживается здесь. Интервал НЕ
       переписывается: он читается из того же адреса, что стоит в разметке —
       второго дома у границы нет. */
    bindFragments() {
      document.querySelectorAll('audio[src*="#t="]').forEach((a) => {
        const m = /#t=([\d.]+)(?:,([\d.]+))?/.exec(a.getAttribute('src') || '');
        if (!m) return;
        const t0 = parseFloat(m[1]);
        const t1 = m[2] === undefined ? NaN : parseFloat(m[2]);
        if (!isFinite(t1)) return;
        a.addEventListener('timeupdate', () => {
          if (a.currentTime >= t1) { a.pause(); a.currentTime = t1; }
        });
        a.addEventListener('play', () => {
          if (a.currentTime < t0 || a.currentTime >= t1) a.currentTime = t0;
        });
      });
    }

    /* УВЕЛИЧЕНИЕ — НАДСТРОЙКА НАД ЯКОРЕМ ДОКУМЕНТА, а не отдельная способность.
       Документ уже несёт <a data-role="zoom" href="…носитель…">: без скрипта ссылка
       открывает изображение, со скриптом оно показывается, не уводя со страницы.
       Один делегированный слушатель на документ — узлы могут появляться и исчезать. */
    bindZoom() {
      const dlg = document.createElement('dialog');
      dlg.setAttribute('data-role', 'zoom');
      const big = document.createElement('img');
      dlg.appendChild(big);
      document.body.appendChild(dlg);
      if (!dlg.showModal) return;                 // старый браузер — остаётся ссылка
      dlg.addEventListener('click', () => dlg.close());
      document.addEventListener('click', (e) => {
        const a = e.target && e.target.closest && e.target.closest('a[data-role="zoom"]');
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        const inner = a.querySelector('img');
        e.preventDefault();
        big.src = a.getAttribute('href');
        big.alt = (inner && inner.alt) || '';
        dlg.showModal();
      });
    }

    bindEvents() {
      this.el.buttons.forEach(b =>
        b.addEventListener('click', () => this.setView(b.getAttribute('data-view'))));
      if (this.el.btnPrevSlide) this.el.btnPrevSlide.addEventListener('click', () => this.prevSlide());
      if (this.el.btnNextSlide) this.el.btnNextSlide.addEventListener('click', () => this.nextSlide());
      if (this.el.btnToggleHud) this.el.btnToggleHud.addEventListener('click', () => this.toggleHud());
      if (this.el.btnFullscreen) this.el.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
      this.bindDocumentJumps();
      this.bindReturns();
      this.bindZoom();
      this.bindFragments();

      window.addEventListener('popstate', (e) => {
        const st = e.state;
        if (st && typeof st.unit === 'number') this.updateSlideDisplay(st.unit);
        if (st && st.view) this.setView(st.view, false);
        else this.applyLocation(false);
      });

      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        const first = this.views[0], stage = this.views[1];
        if ('mMьЬ'.includes(e.key) && stage) {
          this.setView(this.state.view === first ? stage : first); return;
        }
        if (this.state.view === first) return;
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || 'jJоО'.includes(e.key)) {
          e.preventDefault(); this.nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || 'kKлЛ'.includes(e.key)) {
          e.preventDefault(); this.prevSlide();
        } else if ('hHрР'.includes(e.key)) {
          e.preventDefault(); this.toggleHud();
        } else if ('fFаА'.includes(e.key)) {
          e.preventDefault(); this.toggleFullscreen();
        } else if (e.key === 'Escape') {
          this.setView(first);
        }
      });

      const resetHudIdle = () => {
        if (this.state.view === this.views[0] || !this.el.broadcastView) return;
        this.el.broadcastView.classList.remove('hud-idle');
        clearTimeout(this.hudIdleTimer);
        this.hudIdleTimer = setTimeout(() => {
          if (this.state.view !== this.views[0] && this.el.broadcastView) {
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
