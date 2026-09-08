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

  /* ГРАНИЦА ФРАГМЕНТА ИСПОЛНЯЕТСЯ, А НЕ ТОЛЬКО ОБЪЯВЛЯЕТСЯ.
     Документ адресует интервал носителя стандартом (Media Fragments URI:
     `…m4a#t=НАЧАЛО,КОНЕЦ`), но КОНЕЦ чтут не все браузеры — начало чтут все.
     Необъявленная остановка обратила бы «обрыв не по месту» в «не
     останавливается вовсе», поэтому конец удерживается здесь. Интервал НЕ
     переписывается: он читается из того же адреса, что стоит в разметке —
     второго дома у границы нет. */
  function bindFragments() {
    document.querySelectorAll('audio[src*="#t="]').forEach(function (a) {
      var m = /#t=([\d.]+)(?:,([\d.]+))?/.exec(a.getAttribute('src') || '');
      if (!m) return;
      var t0 = parseFloat(m[1]);
      var t1 = m[2] === undefined ? NaN : parseFloat(m[2]);
      if (!isFinite(t1)) return;
      a.addEventListener('timeupdate', function () {
        if (a.currentTime >= t1) { a.pause(); a.currentTime = t1; }
      });
      a.addEventListener('play', function () {
        if (a.currentTime < t0 || a.currentTime >= t1) a.currentTime = t0;
      });
    });
  }

  /* ОДИН ПЛЕЕР НА ВИДУ (эргономика Сайта Системы, принципал 2026-08-19):
     слушать можно только одну запись за раз — соседние <audio> встают. */
  function bindExclusiveAudio() {
    document.addEventListener('play', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'AUDIO') return;
      document.querySelectorAll('audio').forEach(function (other) {
        if (other !== t) other.pause();
      });
    }, true);
  }

  /* УВЕЛИЧЕНИЕ — НАДСТРОЙКА НАД ЯКОРЕМ ДОКУМЕНТА, а не отдельная способность.
     Документ уже несёт <a data-role="zoom" href="…носитель…">: без скрипта ссылка
     открывает изображение, со скриптом оно показывается, не уводя со страницы.
     Один делегированный слушатель на документ. */
  function bindZoom() {
    var dlg = document.createElement('dialog');
    dlg.setAttribute('data-role', 'zoom');
    var big = document.createElement('img');
    dlg.appendChild(big);
    document.body.appendChild(dlg);
    if (!dlg.showModal) return;                 // старый браузер — остаётся ссылка
    dlg.addEventListener('click', function () { dlg.close(); });
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[data-role="zoom"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var inner = a.querySelector('img');
      e.preventDefault();
      big.src = a.getAttribute('href');
      big.alt = (inner && inner.alt) || '';
      dlg.showModal();
    });
  }

  function enrich() { bindFragments(); bindExclusiveAudio(); bindZoom(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enrich);
  } else {
    enrich();
  }
})();
