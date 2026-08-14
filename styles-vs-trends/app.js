/**
 * Dela Universal Presentation Projection Engine
 * Архитектура: Модель (JSON Schema) ──► Рендерер (Editorial / Broadcast) ──► Контроллер (State / Hotkeys / API)
 * 
 * Inv-REUSABLE: Полное отсутствие хардкода. Все элементы интерфейса выводятся
 * из декларативной спецификации presentation_data.json.
 */

(function () {
  'use strict';

  class PresentationEngine {
    constructor() {
      this.data = null;
      this.state = {
        currentSlideIndex: 0,
        currentMode: 'editorial', // 'editorial' | 'broadcast'
        hudVisible: true,
        activeAxis: 'temporal',
        lastScrollY: 0
      };
      this.el = {};
      this.hudIdleTimer = null;
    }

    async init(dataPath = 'presentation_data.json') {
      try {
        const res = await fetch(dataPath);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        this.data = await res.json();
      } catch (err) {
        console.error('Failed to load presentation schema:', err);
        return;
      }

      this.cacheElements();
      this.renderEditorialView();
      this.renderBroadcastThumbnails();
      this.initTheme();
      this.bindEvents();
      this.selectMatrixAxis(Object.keys(this.data.axes)[0] || 'temporal');
      this.updateSlideDisplay(0);

      // System API for Video Remounting & External Automation
      window.RozetPresentation = {
        goToSlide: (idx) => this.goToSlide(idx),
        setLectureTime: (sec) => this.setLectureTime(sec),
        setMode: (m) => this.setMode(m),
        toggleTheme: () => this.toggleTheme(),
        getSlidesCount: () => (this.data.slides ? this.data.slides.length : 0),
        getCurrentSlide: () => this.data.slides[this.state.currentSlideIndex],
        getSchema: () => this.data
      };
    }

    cacheElements() {
      this.el = {
        body: document.body,
        navBrand: document.getElementById('navBrand'),
        btnModeEditorial: document.getElementById('btnModeEditorial'),
        btnModeBroadcast: document.getElementById('btnModeBroadcast'),
        btnThemeToggle: document.getElementById('btnThemeToggle'),
        editorialView: document.getElementById('editorialView'),
        broadcastView: document.getElementById('broadcastView'),
        
        // Broadcast stage elements
        stageImg: document.getElementById('stageImg'),
        stageHud: document.getElementById('stageHud'),
        hudAuthor: document.getElementById('hudAuthor'),
        hudTimecode: document.getElementById('hudTimecode'),
        hudSlideCounter: document.getElementById('hudSlideCounter'),
        hudTag: document.getElementById('hudTag'),
        hudTitle: document.getElementById('hudTitle'),
        hudCite: document.getElementById('hudCite'),
        
        // Broadcast controls
        btnPrevSlide: document.getElementById('btnPrevSlide'),
        btnNextSlide: document.getElementById('btnNextSlide'),
        btnToggleHud: document.getElementById('btnToggleHud'),
        btnFullscreen: document.getElementById('btnFullscreen'),
        thumbsTrack: document.getElementById('thumbsTrack')
      };
    }

    /* =========================================================================
       LAYER 1: EDITORIAL VIEW DYNAMIC RENDERER
       ========================================================================= */
    renderEditorialView() {
      const meta = this.data.meta || {};
      const axes = this.data.axes || {};
      const chapters = this.data.chapters || [];
      const slidesMap = new Map((this.data.slides || []).map(s => [s.id, s]));

      // 1. Top Nav Brand
      if (this.el.navBrand) {
        this.el.navBrand.innerHTML = `
          <span class="brand-author">${meta.author || ''}</span>
          <span class="brand-sep">/</span>
          <span class="brand-title">${meta.title || ''} · ${meta.subtitle || ''}</span>
        `;
      }

      if (this.el.hudAuthor) {
        this.el.hudAuthor.textContent = meta.author || 'Ольга Розет';
      }

      let html = '';

      // 2. Hero Section
      html += `
        <section class="hero-section">
          <div class="hero-pretitle">${meta.pretitle || ''}</div>
          <h1 class="hero-h1">${meta.title || ''}</h1>
          <p class="hero-subtitle">${meta.subtitle || ''}</p>
          
          <div class="hero-meta-staccato">
            ${(meta.staccato || []).map(line => `<div class="staccato-line">${line}</div>`).join('')}
          </div>

          <div class="hero-badges">
            ${(meta.badges || []).map(b => `<span class="badge">${b}</span>`).join('')}
          </div>
        </section>
      `;

      // 3. 7-Axis Interactive Matrix Section
      html += `
        <section class="matrix-interactive-section" id="matrixSection">
          <div class="section-badge">Инструмент ${meta.author || ''}</div>
          <h2 class="section-title">7-осевая матрица анализа интерьера</h2>
          <p class="section-desc">Нажмите на любую ось, чтобы увидеть, как категория материализуется в объектах, цветах и фактурах 2026 года.</p>

          <div class="matrix-grid" id="matrixButtonsGrid" role="tablist" aria-label="Оси матрицы анализа">
            ${Object.entries(axes).map(([key, a], idx) => `
              <button class="matrix-axis-btn ${idx === 0 ? 'active' : ''}" data-axis="${key}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}">
                <span class="axis-num">${String(a.order || idx + 1).padStart(2, '0')}</span>
                <span class="axis-name">${a.shortTitle || a.title}</span>
                <span class="axis-hint">${a.hint || ''}</span>
              </button>
            `).join('')}
          </div>

          <div class="matrix-detail-card" id="matrixDetailCard" aria-live="polite">
            <div class="detail-header">
              <span class="detail-tag" id="detailTag"></span>
              <h3 class="detail-title" id="detailTitle"></h3>
            </div>
            <p class="detail-text" id="detailText"></p>
            <div class="detail-quote" id="detailQuote"></div>
            <div class="detail-slides-ref" id="detailSlidesRef"></div>
          </div>
        </section>
      `;

      // 4. Chapter Navigation Strip
      html += `
        <nav class="chapter-nav" aria-label="Навигация по главам">
          ${chapters.map(c => `<a href="#${c.id}" class="chap-link">${c.navLabel}</a>`).join('')}
        </nav>
      `;

      // 5. Chapters Content
      chapters.forEach(c => {
        html += `<section class="content-chapter" id="${c.id}">`;
        html += `
          <div class="chapter-header">
            <span class="chapter-num">${c.num}</span>
            <h2 class="chapter-title">${c.title}</h2>
            <div class="chapter-cite">${c.cite}</div>
            ${c.audio ? `
              <div class="audio-player-box-inline">
                <div class="audio-label">${c.audio.label}</div>
                <audio controls preload="none" src="${c.audio.src}"></audio>
              </div>
            ` : ''}
          </div>
        `;

        // Case A: Slides Grid
        if (c.type === 'slides_grid') {
          html += '<div class="slides-flow-grid">';
          (c.slideIds || []).forEach(sId => {
            const slide = slidesMap.get(sId);
            if (slide) {
              html += `
                <div class="slide-card" id="slide-${slide.id}">
                  <div class="slide-img-box">
                    <img src="img/${slide.file}" alt="Слайд ${slide.id}: ${slide.title}" loading="lazy" decoding="async">
                    <button class="btn-zoom-slide" data-slide="${slide.id}" title="Открыть в 16:9">Слайд ${String(slide.id).padStart(2, '0')}</button>
                  </div>
                  <div class="slide-caption">
                    <strong>${slide.tag}:</strong> ${slide.title}
                  </div>
                </div>
              `;
            }
          });
          html += '</div>';
        }

        // Case B: Feature Slide
        else if (c.type === 'feature_slide') {
          const slide = slidesMap.get(c.slideId);
          html += `
            <div class="feature-slide-row">
              <div class="feature-slide-media">
                <img src="img/${slide ? slide.file : ''}" alt="${slide ? slide.title : ''}" loading="lazy" decoding="async">
              </div>
              <div class="feature-slide-text">
                <h3>${slide ? slide.title : ''}</h3>
                <p>${c.text || ''}</p>
                ${c.staccato ? `
                  <div class="staccato-box">
                    ${c.staccato.map(s => `<div>${s}</div>`).join('')}
                  </div>
                ` : ''}
                <div class="timecode-pill" data-slide-id="${c.slideId}" title="Перейти к слайду в 16:9">${c.timecode || ''}</div>
              </div>
            </div>
          `;
        }

        // Case C: Designers Showcase
        else if (c.type === 'designers_showcase') {
          html += '<div class="designers-showcase">';
          (c.designers || []).forEach(d => {
            const slide = slidesMap.get(d.slideId);
            html += `
              <div class="designer-card">
                <div class="designer-media">
                  <img src="img/${slide ? slide.file : ''}" alt="${d.name}" loading="lazy" decoding="async">
                </div>
                <div class="designer-info">
                  <span class="designer-tag">${d.tag}</span>
                  <h4>${d.name}</h4>
                  <p>${d.desc}</p>
                </div>
              </div>
            `;
          });
          html += '</div>';
        }

        // Case D: Curators Duo
        else if (c.type === 'curators_duo') {
          html += '<div class="curators-duo">';
          (c.curators || []).forEach(cur => {
            const slide = slidesMap.get(cur.slideId);
            html += `
              <div class="curator-box">
                <div class="curator-img">
                  <img src="img/${slide ? slide.file : ''}" alt="${cur.title}" loading="lazy" decoding="async">
                </div>
                <div class="curator-meta">
                  <h4>${cur.title}</h4>
                  <p>${cur.desc}</p>
                </div>
              </div>
            `;
          });
          html += '</div>';
        }

        // Case E: Magazine Gallery
        else if (c.type === 'magazine_gallery') {
          html += `
            <div class="magazine-gallery-lead"><p>${c.lead || ''}</p></div>
            <div class="magazine-grid">
              ${(c.items || []).map(item => `
                <div class="mag-item">
                  <img src="${item.img}" alt="${item.title}" loading="lazy" decoding="async">
                  <div class="mag-info">
                    <strong>${item.title}</strong>
                    <span>${item.caption}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }

        // Case F: Closing Split
        else if (c.type === 'closing_split') {
          const formulaItems = c.matrixCard.formulaItems || (c.matrixCard.formula || '').split(' × ');
          html += `
            <div class="closing-split">
              <div class="closing-card">
                <div class="closing-card-inner">
                  <span class="card-badge">${c.matrixCard.badge}</span>
                  <h3>${c.matrixCard.title}</h3>
                  
                  <div class="formula-box-semantic" aria-label="Формула матрицы: ${c.matrixCard.formula}">
                    <div class="formula-label">Формула анализа интерьера:</div>
                    <div class="formula-track">
                      ${formulaItems.map(item => `<span class="formula-chip">${item}</span>`).join('<span class="formula-op">×</span>')}
                    </div>
                  </div>

                  <p>${c.matrixCard.desc}</p>
                  <a href="#matrixSection" class="btn-ghost">Открыть интерактивную матрицу ↑</a>
                </div>
              </div>

              <div class="closing-card primary">
                <div class="closing-card-inner">
                  <span class="card-badge">${c.courseCard.badge}</span>
                  <h3>${c.courseCard.title}</h3>
                  <p>${c.courseCard.desc}</p>
                  <div class="course-specs">
                    ${(c.courseCard.specs || []).map(s => `<div>${s}</div>`).join('')}
                  </div>
                  <a href="${c.courseCard.cta.url}" target="_blank" rel="noopener" class="btn-cta">${c.courseCard.cta.label}</a>
                </div>
              </div>
            </div>
          `;
        }

        html += '</section>';
      });

      // 6. Editorial Footer
      const footer = meta.footer || {};
      html += `
        <footer class="editorial-footer">
          <div class="footer-top">
            <div class="footer-quote">${footer.quote || ''}</div>
            <div class="footer-links">
              ${(footer.links || []).map(l => `<a href="${l.url}">${l.label}</a>`).join('')}
            </div>
          </div>
          <div class="footer-bottom">
            <span>${footer.copyright || ''}</span>
          </div>
        </footer>
      `;

      this.el.editorialView.innerHTML = html;

      // Cache dynamic elements after rendering
      this.el.detailTag = document.getElementById('detailTag');
      this.el.detailTitle = document.getElementById('detailTitle');
      this.el.detailText = document.getElementById('detailText');
      this.el.detailQuote = document.getElementById('detailQuote');
      this.el.detailSlidesRef = document.getElementById('detailSlidesRef');
      this.el.matrixBtns = document.querySelectorAll('.matrix-axis-btn');
    }

    /* =========================================================================
       LAYER 2: BROADCAST 16:9 RENDERER
       ========================================================================= */
    renderBroadcastThumbnails() {
      if (!this.el.thumbsTrack || !this.data.slides) return;
      this.el.thumbsTrack.innerHTML = '';
      this.data.slides.forEach((slide, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
        thumb.setAttribute('data-index', idx);
        thumb.setAttribute('title', `Слайд ${slide.id}: ${slide.title} (${slide.timecode})`);
        thumb.innerHTML = `<img src="img/${slide.file}" alt="Слайд ${slide.id}" loading="lazy" decoding="async">`;
        thumb.addEventListener('click', () => this.goToSlide(idx));
        this.el.thumbsTrack.appendChild(thumb);
      });
    }

    updateSlideDisplay(index) {
      if (!this.data.slides || index < 0 || index >= this.data.slides.length) return;
      this.state.currentSlideIndex = index;
      const slide = this.data.slides[index];

      if (this.el.stageImg) {
        this.el.stageImg.style.opacity = '0';
        setTimeout(() => {
          this.el.stageImg.src = `img/${slide.file}`;
          this.el.stageImg.alt = `Слайд ${slide.id}: ${slide.title}`;
          this.el.stageImg.style.opacity = '1';
        }, 60);
      }

      if (this.el.hudTimecode) this.el.hudTimecode.textContent = `⏱ ${slide.timecode}`;
      if (this.el.hudSlideCounter) this.el.hudSlideCounter.textContent = `${String(slide.id).padStart(2, '0')} / ${this.data.slides.length}`;
      if (this.el.hudTag) this.el.hudTag.textContent = slide.tag;
      if (this.el.hudTitle) this.el.hudTitle.textContent = slide.title;
      if (this.el.hudCite) this.el.hudCite.textContent = slide.cite;

      if (this.el.thumbsTrack) {
        const thumbs = this.el.thumbsTrack.querySelectorAll('.thumb-item');
        thumbs.forEach((t, i) => {
          t.classList.toggle('active', i === index);
          if (i === index) {
            t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });
      }

      // Preload next and previous slide images for 0ms lag
      if (index + 1 < this.data.slides.length) {
        const imgNext = new Image();
        imgNext.src = `img/${this.data.slides[index + 1].file}`;
      }
      if (index - 1 >= 0) {
        const imgPrev = new Image();
        imgPrev.src = `img/${this.data.slides[index - 1].file}`;
      }
    }

    goToSlide(index) {
      this.updateSlideDisplay(index);
    }

    nextSlide() {
      if (this.state.currentSlideIndex < this.data.slides.length - 1) {
        this.goToSlide(this.state.currentSlideIndex + 1);
      }
    }

    prevSlide() {
      if (this.state.currentSlideIndex > 0) {
        this.goToSlide(this.state.currentSlideIndex - 1);
      }
    }

    setLectureTime(seconds) {
      let matchIdx = 0;
      for (let i = 0; i < this.data.slides.length; i++) {
        if (seconds >= this.data.slides[i].seconds) {
          matchIdx = i;
        } else {
          break;
        }
      }
      if (matchIdx !== this.state.currentSlideIndex) {
        this.goToSlide(matchIdx);
      }
    }

    toggleHud() {
      this.state.hudVisible = !this.state.hudVisible;
      if (this.el.stageHud) {
        this.el.stageHud.classList.toggle('hud-hidden', !this.state.hudVisible);
      }
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Fullscreen error:', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    /* =========================================================================
       LAYER 3: INTERACTIVE CONTROLLER
       ========================================================================= */
    initTheme() {
      if (typeof window.__applyTheme === 'function') {
        window.__applyTheme();
      } else {
        const savedTheme = localStorage.getItem('dela.theme.v1') || 'day';
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    }

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'day';
      const next = current === 'day' ? 'night' : 'day';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('dela.theme.v1', next); } catch(e) {}
    }

    setMode(mode) {
      this.state.currentMode = mode;
      if (mode === 'broadcast') {
        this.state.lastScrollY = window.scrollY;
        this.el.body.className = 'mode-broadcast';
        this.el.editorialView.classList.add('hidden');
        this.el.broadcastView.classList.remove('hidden');
        this.el.btnModeBroadcast.classList.add('active');
        this.el.btnModeBroadcast.setAttribute('aria-selected', 'true');
        this.el.btnModeEditorial.classList.remove('active');
        this.el.btnModeEditorial.setAttribute('aria-selected', 'false');
        this.updateSlideDisplay(this.state.currentSlideIndex);
      } else {
        this.el.body.className = 'mode-editorial';
        this.el.editorialView.classList.remove('hidden');
        this.el.broadcastView.classList.add('hidden');
        this.el.btnModeEditorial.classList.add('active');
        this.el.btnModeEditorial.setAttribute('aria-selected', 'true');
        this.el.btnModeBroadcast.classList.remove('active');
        this.el.btnModeBroadcast.setAttribute('aria-selected', 'false');
        
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: this.state.lastScrollY || 0, behavior: 'smooth' });
        });
      }
    }

    selectMatrixAxis(axisKey) {
      if (!this.data.axes) return;
      const data = this.data.axes[axisKey];
      if (!data) return;
      this.state.activeAxis = axisKey;

      if (this.el.matrixBtns) {
        this.el.matrixBtns.forEach(btn => {
          const isCurrent = btn.getAttribute('data-axis') === axisKey;
          btn.classList.toggle('active', isCurrent);
          btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        });
      }

      if (this.el.detailTag) this.el.detailTag.textContent = data.tag;
      if (this.el.detailTitle) this.el.detailTitle.textContent = data.title;
      if (this.el.detailText) this.el.detailText.textContent = data.text;
      if (this.el.detailQuote) this.el.detailQuote.textContent = data.quote;

      if (this.el.detailSlidesRef) {
        this.el.detailSlidesRef.innerHTML = '<span>Связанные слайды:</span> ';
        (data.slides || []).forEach(sNum => {
          const link = document.createElement('a');
          link.className = 'slide-link';
          link.href = `#slide-${sNum}`;
          link.textContent = `Слайд ${sNum}`;
          link.addEventListener('click', (e) => {
            if (this.state.currentMode === 'broadcast') {
              e.preventDefault();
              this.goToSlide(sNum - 1);
            }
          });
          this.el.detailSlidesRef.appendChild(link);
          this.el.detailSlidesRef.appendChild(document.createTextNode(' '));
        });
      }
    }

    bindEvents() {
      if (this.el.btnModeEditorial) this.el.btnModeEditorial.addEventListener('click', () => this.setMode('editorial'));
      if (this.el.btnModeBroadcast) this.el.btnModeBroadcast.addEventListener('click', () => this.setMode('broadcast'));
      if (this.el.btnThemeToggle) this.el.btnThemeToggle.addEventListener('click', () => this.toggleTheme());

      if (this.el.btnNextSlide) this.el.btnNextSlide.addEventListener('click', () => this.nextSlide());
      if (this.el.btnPrevSlide) this.el.btnPrevSlide.addEventListener('click', () => this.prevSlide());
      if (this.el.btnToggleHud) this.el.btnToggleHud.addEventListener('click', () => this.toggleHud());
      if (this.el.btnFullscreen) this.el.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

      // Delegate zoom clicks
      this.el.editorialView.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-zoom-slide');
        if (btn) {
          const slideNum = parseInt(btn.getAttribute('data-slide'), 10);
          if (!isNaN(slideNum)) {
            this.setMode('broadcast');
            this.goToSlide(slideNum - 1);
          }
          return;
        }

        const pill = e.target.closest('.timecode-pill');
        if (pill) {
          const slideId = parseInt(pill.getAttribute('data-slide-id'), 10);
          if (!isNaN(slideId)) {
            this.setMode('broadcast');
            this.goToSlide(slideId - 1);
          }
        }
      });

      // Delegate matrix axis buttons
      const matrixGrid = document.getElementById('matrixButtonsGrid');
      if (matrixGrid) {
        matrixGrid.addEventListener('click', (e) => {
          const btn = e.target.closest('.matrix-axis-btn');
          if (btn) {
            const axis = btn.getAttribute('data-axis');
            this.selectMatrixAxis(axis);
          }
        });
      }

      // Keyboard accelerators
      window.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
        if (isInput) return;

        // Theme toggle (T / Е)
        if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') {
          this.toggleTheme();
          return;
        }

        // Mode switch (M / Ь)
        if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
          this.setMode(this.state.currentMode === 'editorial' ? 'broadcast' : 'editorial');
          return;
        }

        // Broadcast-specific controls
        if (this.state.currentMode === 'broadcast') {
          if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'j' || e.key === 'J' || e.key === 'о' || e.key === 'О') {
            e.preventDefault();
            this.nextSlide();
          } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л') {
            e.preventDefault();
            this.prevSlide();
          } else if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
            e.preventDefault();
            this.toggleHud();
          } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
            e.preventDefault();
            this.toggleFullscreen();
          } else if (e.key === 'Escape') {
            this.setMode('editorial');
          }
        }
      });

      // Broadcast HUD idle fader (dim controls after 3.5s of inactivity)
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

  // Self-bootstrapping Engine Mount
  const engine = new PresentationEngine();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.init('presentation_data.json'));
  } else {
    engine.init('presentation_data.json');
  }

})();
