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

  /* УВЕЛИЧЕНИЕ — НАДСТРОЙКА НАД ЯКОРЕМ ДОКУМЕНТА (D-12: панорамируемый 1:1 режим + явное закрытие).
     Документ уже несёт <a data-role="zoom" href="…носитель…">: без скрипта ссылка
     открывает изображение, со скриптом оно показывается в модальном <dialog> с
     переключением «по экрану ↔ 1:1» (для чтения мелкого текста слайдов на телефоне). */
  function bindZoom() {
    var dlg = document.createElement('dialog');
    dlg.setAttribute('data-role', 'zoom');
    var bar = document.createElement('div');
    bar.className = 'zoom-bar';
    var fitBtn = document.createElement('button');
    fitBtn.type = 'button';
    fitBtn.className = 'zoom-toggle';
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
    stage.appendChild(big);
    dlg.appendChild(bar);
    dlg.appendChild(stage);
    document.body.appendChild(dlg);
    if (!dlg.showModal) return;                 // старый браузер — остаётся ссылка
    var setFull = function (on) {
      dlg.toggleAttribute('data-zoom-full', !!on);
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
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[data-role="zoom"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var inner = a.querySelector('img');
      e.preventDefault();
      setFull(false);
      big.src = a.getAttribute('href');
      big.alt = (inner && inner.alt) || '';
      dlg.showModal();
    });
  }

  function enrich() { bindZoom(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enrich);
  } else {
    enrich();
  }
})();
