/**
 * ПОВЕДЕНИЕ НАД ДОКУМЕНТОМ. Не рендерер, не модель, не подача.
 *
 * КОРЕНЬ, ЗАКРЫТЫЙ ОКОНЧАТЕЛЬНО (2026-08-20). Спека класса объявляла границей
 * своей же реализации: «интерактивная подача (app.js) сегодня ЗАМЕЩАЕТ документ,
 * а не обогащает его… 259 строк из 670 суть второй рендерер той же модели».
 * Второй рендерер существовал РАДИ ВТОРОЙ ПОДАЧИ — показа 16:9: только ей нужно
 * было строить кадр, счётчик, плашки, ленту миниатюр и переключение видов.
 * Принципал снял подачу — и предмет второго рендерера исчез вместе с ней.
 *
 * Осталось ровно то, что документ выразить не может, а не то, что кто-то решил
 * сделать скриптом: КОНЕЦ медиа-фрагмента (стандарт объявляет, браузеры чтут
 * начало) и УВЕЛИЧЕНИЕ (надстройка над уже существующей ссылкой на носитель).
 * Обе — делегированные слушатели на документе: узлы могут появляться и исчезать,
 * состояния у файла нет, модель не читается вовсе (`fetch` больше не нужен —
 * документ ПРИХОДИТ СОБРАННЫМ). 461 строка → эти.
 */

(function () {
  'use strict';

  /* Граница фрагмента, единственность воспроизведения, переход к моменту и память
     отметок — законы НОСИТЕЛЯ сайта, а не этой страницы: их держит общий `/media.js`
     (D4, story-form 2026-11-20). Здесь остаётся лишь увеличение. */

  /* УВЕЛИЧЕНИЕ — НАДСТРОЙКА НАД ЯКОРЕМ ДОКУМЕНТА (D-12 + Wave T: растр 1:1 и живые пересобранные блоки).
     Документ несёт <a data-role="zoom" href="…"> для растров и [data-role="zoom"][data-zoom-kind="composed-quote"]
     для динамически пересобранных блоков «портрет + живой текст». Единый <dialog> увеличивает оба класса. */
  function bindZoom() {
    var dlg = document.createElement('dialog');
    dlg.setAttribute('data-role', 'zoom');
    dlg.setAttribute('aria-label', 'Просмотр изображения');
    var bar = document.createElement('div');
    bar.className = 'zoom-bar';
    var fitBtn = document.createElement('button');
    fitBtn.type = 'button';
    fitBtn.className = 'zoom-toggle';
    fitBtn.setAttribute('aria-pressed', 'false');
    fitBtn.textContent = '1:1';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'zoom-close';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.textContent = '×';
    bar.appendChild(fitBtn);
    bar.appendChild(closeBtn);
    var stage = document.createElement('div');
    stage.className = 'zoom-stage';
    var big = document.createElement('img');
    var composedStage = document.createElement('div');
    composedStage.className = 'zoom-composed-card';
    composedStage.hidden = true;
    stage.appendChild(big);
    stage.appendChild(composedStage);
    dlg.appendChild(bar);
    dlg.appendChild(stage);
    document.body.appendChild(dlg);
    if (!dlg.showModal) return;                 // старый браузер — остаётся ссылка
    var triggerEl = null;
    var setFull = function (on) {
      dlg.toggleAttribute('data-zoom-full', !!on);
      fitBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      fitBtn.textContent = on ? 'По экрану' : '1:1';
    };
    fitBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setFull(!dlg.hasAttribute('data-zoom-full'));
    });
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dlg.close();
    });
    big.addEventListener('click', function (e) {
      e.stopPropagation();
      setFull(!dlg.hasAttribute('data-zoom-full'));
    });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target === stage) dlg.close();
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var controls = fitBtn.hidden ? [closeBtn] : [fitBtn, closeBtn];
      var idx = controls.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.shiftKey
        ? controls[(idx <= 0 ? controls.length : idx) - 1]
        : controls[(idx + 1) % controls.length];
      next.focus();
    });
    dlg.addEventListener('close', function () {
      if (triggerEl && typeof triggerEl.focus === 'function') {
        try { triggerEl.focus(); } catch (err) {}
      }
      triggerEl = null;
    });
    var openZoom = function (hit) {
      triggerEl = hit;
      setFull(false);
      if (hit.getAttribute('data-zoom-kind') === 'composed-quote') {
        dlg.setAttribute('data-zoom-kind', 'composed-quote');
        fitBtn.hidden = true;
        big.hidden = true;
        composedStage.hidden = false;
        composedStage.textContent = '';
        Array.prototype.forEach.call(hit.children, function (ch) {
          var clone = ch.cloneNode(true);
          if (clone.tagName === 'IMG') {
            clone.removeAttribute('loading');
            clone.removeAttribute('width');
            clone.removeAttribute('height');
          }
          composedStage.appendChild(clone);
        });
      } else {
        dlg.removeAttribute('data-zoom-kind');
        fitBtn.hidden = false;
        composedStage.hidden = true;
        big.hidden = false;
        var inner = hit.querySelector('img');
        big.src = hit.getAttribute('href');
        big.alt = (inner && inner.alt) || '';
      }
      dlg.showModal();
    };
    document.addEventListener('click', function (e) {
      var hit = e.target && e.target.closest && e.target.closest('[data-role="zoom"]');
      if (!hit || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      if (hit.getAttribute('data-zoom-kind') === 'composed-quote' && String(window.getSelection && window.getSelection())) return;
      e.preventDefault();
      openZoom(hit);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.metaKey || e.ctrlKey || e.altKey) return;
      var hit = e.target && e.target.matches && e.target.matches('[data-role="zoom"][data-zoom-kind="composed-quote"]') ? e.target : null;
      if (!hit) return;
      e.preventDefault();
      openZoom(hit);
    });
  }

  function enrich() { bindZoom(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enrich);
  } else {
    enrich();
  }
})();
