/**
 * Эргономика воспроизведения — ЗАКОН САЙТА, а не поведение одной страницы.
 *
 * КОРЕНЬ (принципал 2026-08-19, дословно): «Для любого Сайта Системы: Эргономика
 * подразумевает, что можно прослушивать или просматривать только одну запись за раз,
 * и возникает на виду управление воспроизведением.»
 *
 * На странице рассказа-показа плееров ДЕСЯТКИ — по одному при каждой главе и при
 * записи целиком. Браузер разрешает играть всем сразу, а уехавший за край экрана
 * плеер остановить нечем: читатель слышит два голоса и ищет, где выключить. Оба
 * следствия — одного корня: у воспроизведения нет ЕДИНСТВЕННОСТИ и нет ПРИСУТСТВИЯ.
 *
 * ЕДИНСТВЕННОСТЬ. `play` не всплывает, поэтому слушатель ставится в ФАЗЕ ЗАХВАТА на
 * документе: один слушатель на страницу, сколько бы носителей на ней ни появилось и
 * когда бы они ни появились. Ни списка узлов, ни повторной привязки при отрисовке.
 *
 * ПРИСУТСТВИЕ. Пока играющий носитель ВИДЕН — управление у него самого, и второго
 * не нужно. Ушёл из виду (IntersectionObserver — наблюдение, а не опрос позиции) —
 * появляется полоса управления, и она есть ПРОЕКЦИЯ того же носителя: пауза и
 * возврат к нему. Остановился или снова стал виден — полоса исчезает сама.
 *
 * Ни одного имени страницы, ни одного слова в коде: подписи берутся с САМОГО
 * носителя (`aria-label`/`title`/подпись рядом), а надписи в полосе нет — только
 * знак действия и имя записи. Поэтому файл общий для всех страниц всех владельцев.
 */
(function () {
  'use strict';

  var SEL = 'audio, video';
  var _scriptEl = document.currentScript || document.querySelector('script[src="/media.js"]');
  var _pauseLabel = (_scriptEl && _scriptEl.getAttribute('data-label-pause')) || '';
  var _tzLocalTpl = (_scriptEl && _scriptEl.getAttribute('data-tz-local-note')) || '';
  var current = null;                 // единственный играющий носитель
  var bar = null, barName = null, barBtn = null, io = null;

  function label(el) {
    // ИМЯ ЗАПИСИ ЧИТАЕТСЯ С НОСИТЕЛЯ. Порядок — от самого явного к самому общему;
    // пусто — полоса покажет только управление, и это честнее выдуманного имени.
    var own = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (own.trim()) return own.trim();
    var holder = el.closest('[data-role="record"]') || el.parentElement;
    var t = holder ? (holder.textContent || '') : '';
    return t.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'now-playing';
    bar.hidden = true;
    barBtn = document.createElement('button');
    barBtn.type = 'button';
    barBtn.className = 'now-playing-toggle';
    barName = document.createElement('button');
    barName.type = 'button';
    barName.className = 'now-playing-name';
    bar.appendChild(barBtn);
    bar.appendChild(barName);
    document.body.appendChild(bar);
    barBtn.addEventListener('click', function () { if (current) current.pause(); });
    barName.addEventListener('click', function () {
      if (current) current.scrollIntoView({ block: 'center' });
    });
    return bar;
  }

  function showBar(el) {
    ensureBar();
    barName.textContent = label(el);
    // Знак действия, а не слово: полоса появляется ТОЛЬКО при играющем носителе.
    barBtn.textContent = '⏸';
    var nm = barName.textContent || '';
    var pLbl = el.getAttribute('data-label-pause') || _pauseLabel;
    barBtn.setAttribute('aria-label', pLbl ? (nm ? (pLbl + ': ' + nm) : pLbl) : (nm || '⏸'));
    bar.hidden = false;
    document.documentElement.setAttribute('data-now-playing', '');
  }

  function hideBar() {
    if (bar) bar.hidden = true;
    document.documentElement.removeAttribute('data-now-playing');
  }

  function watch(el) {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) { showBar(el); return; }
    io = new IntersectionObserver(function (entries) {
      var seen = entries[0] && entries[0].isIntersecting;
      if (seen) hideBar(); else if (current === el && !el.paused) showBar(el);
    }, { threshold: 0.15 });
    io.observe(el);
  }

  document.addEventListener('play', function (e) {
    var el = e.target;
    if (!el || !el.matches || !el.matches(SEL)) return;
    if (current && current !== el && !current.paused) current.pause();
    current = el;
    watch(el);
    session(el);
  }, true);

  /* СЕССИЯ ОС (экран блокировки телефона, медиаклавиши компьютера) — ПРОЕКЦИЯ того же
     единственного носителя. Имя — тот же `label(el)`, альбом — `<title>` страницы, обложка —
     `poster` носителя: всё из разметки, которую вывел генератор из модели; ни одного слова
     здесь. Нет API — сессии нет, страница работает как прежде. */
  function session(el) {
    var ms = navigator.mediaSession;
    if (!ms || typeof MediaMetadata === 'undefined') return;
    var art = el.getAttribute('poster') || meta('og:image', 'property');
    ms.metadata = new MediaMetadata({
      title: label(el), artist: meta('author', 'name'), album: document.title,
      artwork: art ? [{ src: new URL(art, location.href).href }] : []
    });
    function act(name, fn) { try { ms.setActionHandler(name, fn); } catch (err) { /* не поддержано */ } }
    act('play', function () { if (current) current.play(); });
    act('pause', function () { if (current) current.pause(); });
    // ПЕРЕМОТКА (ergo B3): шаг называет ОС (`seekOffset`); где не назвала — действие молчит,
    // своего литерала шага нет. Граница фрагмента (`span`) держит перемотку в отрывке.
    act('seekto', function (d) { if (current && d && isFinite(d.seekTime)) current.currentTime = clamp(current, d.seekTime); });
    act('seekbackward', function (d) { if (current && d && isFinite(d.seekOffset)) current.currentTime = clamp(current, current.currentTime - d.seekOffset); });
    act('seekforward', function (d) { if (current && d && isFinite(d.seekOffset)) current.currentTime = clamp(current, current.currentTime + d.seekOffset); });
  }
  function meta(k, attr) {
    var m = document.querySelector('meta[' + attr + '="' + k + '"]');
    return m ? (m.getAttribute('content') || '') : '';
  }
  function clamp(el, t) {
    var s = span(el), lo = s ? s[0] : 0, hi = s ? s[1] : (isFinite(el.duration) ? el.duration : t);
    return Math.max(lo, Math.min(hi, t));
  }

  document.addEventListener('pause', function (e) {
    if (e.target === current) { hideBar(); if (io) io.disconnect(); }
  }, true);

  document.addEventListener('ended', function (e) {
    if (e.target === current) { current = null; hideBar(); if (io) io.disconnect(); }
  }, true);

  /* ГРАНИЦА ФРАГМЕНТА ИСПОЛНЯЕТСЯ (перенесено из app.js страницы — закон носителя, а не
     страницы). Адрес `…#t=НАЧАЛО,КОНЕЦ` (Media Fragments URI): начало чтут все браузеры,
     конец — не все. Интервал читается из того же адреса, что в разметке (`currentSrc`
     покрывает и <source>); второго дома у границы нет. Слушатели — в фазе захвата:
     `timeupdate`/`play` не всплывают. */
  function span(el) {
    var m = /#t=([\d.]+)(?:,([\d.]+))?/.exec(el.currentSrc || el.getAttribute('src') || '');
    if (!m) return null;
    var t1 = m[2] === undefined ? NaN : parseFloat(m[2]);
    return isFinite(t1) ? [parseFloat(m[1]), t1] : null;
  }
  document.addEventListener('timeupdate', function (e) {
    var el = e.target, s = el && el.matches && el.matches(SEL) ? span(el) : null;
    if (s && el.currentTime >= s[1]) { el.pause(); el.currentTime = s[1]; }
  }, true);
  document.addEventListener('play', function (e) {
    var el = e.target, s = el && el.matches && el.matches(SEL) ? span(el) : null;
    if (s && (el.currentTime < s[0] || el.currentTime >= s[1])) el.currentTime = s[0];
  }, true);

  /* ПЕРЕХОД К МОМЕНТУ (B9). Всякий элемент `[data-t0]` (или кнопка/ссылка внутри него)
     ведёт проигрыватель страницы `[data-player]` к секунде t0. Нет проигрывателя —
     ссылка остаётся ссылкой (её href), скрипт молчит: документ полон без него. */
  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    var hit = e.target && e.target.closest && e.target.closest(MOMENT);
    if (!hit) return;
    // ВЫДЕЛЕНИЕ ТЕКСТА ЦИТАТЫ — не переход: читатель копирует слова, а не прыгает по записи.
    if (hit.hasAttribute('data-t') && !hit.hasAttribute('data-t0') &&
        (e.target.closest('a, button') || String(window.getSelection && window.getSelection()))) return;
    seekTo(hit, e);
  });

  /* ПЕРЕХОД К МОМЕНТУ — ОДИН ПУТЬ ДЛЯ ВСЕХ НОСИТЕЛЕЙ ВРЕМЕНИ: `data-t0` (глава, слайд, штамп),
     `data-t` (прямая речь) и ссылки `./record#t=…` (остаются в кабинете вместо ухода в голый MP4).
     Нет проигрывателя — скрипт молчит. */
  var MOMENT = '[data-t0], [data-t], a[href^="./record#t="]';
  function momentOf(el) {
    if (el.hasAttribute('data-t0')) return parseFloat(el.getAttribute('data-t0'));
    if (el.hasAttribute('data-t')) return parseFloat(el.getAttribute('data-t'));
    var href = el.getAttribute('href') || '';
    var hi = href.indexOf('#');
    if (hi >= 0) {
      var parsed = parseHashTime(href.slice(hi), '#t=');
      return parsed === null ? NaN : parsed;
    }
    return NaN;
  }
  function seekTo(hit, e) {
    // imperative: DOM/media - перемотка и воспроизведение элемента; прокрутка к видео — только по явному data-seek-view="video"
    var p = document.querySelector('[data-player]');
    var t0 = momentOf(hit);
    if (!p || !isFinite(t0)) return;
    e.preventDefault();
    p.currentTime = t0;
    var go = p.play && p.play();
    if (go && go.catch) go.catch(function () {});
    if (hit.getAttribute('data-seek-view') === 'video') {
      var target = document.getElementById('player-wrapper') || p;
      target.scrollIntoView({ block: 'center' });
    }
  }
  /* Цитата с временем становится ДЕЙСТВУЕМОЙ ТОЛЬКО при наличии проигрывателя: фокус с клавиатуры,
     Enter/Пробел, роль кнопки (имя — её собственный текст). Вида не меняет: курсор и кольцо фокуса
     (media.css), класса оформления нет. */
  function armQuotes() {
    // imperative: DOM - расставляет tabindex/role на узлах разметки (эффект над документом)
    if (!document.querySelector('[data-player]')) return;
    document.querySelectorAll('blockquote[data-t]').forEach(function (q) {
      if (q.hasAttribute('data-t0') || q.hasAttribute('tabindex')) return;
      q.setAttribute('tabindex', '0');
      q.setAttribute('role', 'button');
    });
  }
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'Enter' && e.key !== ' ') || e.metaKey || e.ctrlKey || e.altKey) return;
    var q = e.target && e.target.matches && e.target.matches('blockquote[data-t][tabindex]') ? e.target : null;
    if (q) seekTo(q, e);
  });

  /* ДОРОГАЯ СЕТЬ: подсказка о трафике (`[data-when-metered]`) скрыта, пока сеть не названа дорогой
     самим браузером (saveData ∨ сотовая ∨ 2g/3g). Ни слова в скрипте — текст пришёл с разметкой. */
  function metered() {
    var c = navigator.connection;
    return !!(c && (c.saveData || c.type === 'cellular' || /(^|slow-)?[23]g/.test(c.effectiveType || '')));
  }
  function revealMetered() {
    // imperative: DOM - показывает узел по замеру сети (чистая часть — metered())
    document.querySelectorAll('[data-when-metered]').forEach(function (el) { el.hidden = !metered(); });
  }

  /* ЗАПИСЬ ПЕРЕЖИВАЕТ СВОЮ ССЫЛКУ (`video[data-recover-backoff]`). Ссылка на объект живёт минуты, запись —
     полтора часа: пауза или перемотка после срока попадают на мёртвый адрес. Носитель сам
     переспрашивает адрес записи (`./record` отвечает свежей ссылкой), возвращает место, скорость,
     «играет/пауза» и режимы дорожек; попытки и паузы — данные Спеки (`player.recover`), едут атрибутами
     `data-recover-backoff` (мс через пробел; число попыток = число членов) и `data-recover-stall-s`.
     Состояние ВИДНО: `[data-recover-status]` указывает на блок с узлами `[data-state=recovering|failed]`
     и кнопкой `[data-retry]`. Слов в скрипте нет. Пока идёт восстановление, носитель помечен
     `data-recovering`: страница не затирает сохранённое место нулём, который даёт сам перезапуск.

     ФОРМА: РЕШЕНИЕ — ЧИСТАЯ ФУНКЦИЯ, ЭФФЕКТЫ — ТОНКАЯ ОБОЛОЧКА. `recoverStep(state, event, cfg)` →
     `{state, fx}`: ни DOM, ни таймеров, ни записи в состояние; всё, что нужно знать о носителе, приходит в
     событии (`e.obs`). Единственная императивная часть — `recoverable` ниже: она владеет элементом,
     таймерами и ячейкой состояния и исполняет `fx` по таблице `run` (по одной строке на вид эффекта).
     state = {attempts, busy, snap|null, wantPlay}; событие = {type, obs:{t, rate, modes, rs, recovering, err, ended}};
     fx = [{do: clearStall|armStall{ms}|persist|mark|unmark|show{state}|schedule{ms}|reload{snap}}]. */
  /* СТУПЕНИ КАЧЕСТВА И ПЕРЕНОС МОМЕНТА (`data-rungs`, `data-rung-policy`, `data-resume-link`).
     Все решения — ЧИСТЫЕ ФУНКЦИИ без DOM, без имён ступеней и без порогов Мбит/с в коде:
     данные приезжают атрибутами (`narrative-showcase.md::player.rungs` + `meta.source.recording.rungs`). */
  /*fn:parseHashTime*/function parseHashTime(hash, prefix) {
    var h = String(hash || '');
    var p = String(prefix || '#t=');
    if (!h || h.indexOf(p) !== 0) return null;
    var raw = h.slice(p.length).split(/[&,]/)[0].trim();
    if (!raw) return null;
    if (/^\d+(?:\.\d+)?$/.test(raw)) {
      var n = parseFloat(raw);
      return isFinite(n) && n >= 0 ? n : null;
    }
    var m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/i.exec(raw);
    if (!m || (!m[1] && !m[2] && !m[3])) return null;
    var sec = (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2] || '0', 10) * 60) + parseFloat(m[3] || '0');
    return isFinite(sec) && sec >= 0 ? sec : null;
  }/*/fn:parseHashTime*/

  /*fn:resolveInitialTime*/function resolveInitialTime(hashTime, savedTime, eps, duration) {
    var hasDur = isFinite(duration) && duration > 0;
    if (hashTime !== null && isFinite(hashTime) && hashTime >= 0 && (!hasDur || hashTime < duration)) {
      return { seek: hashTime, prompt: null };
    }
    if (isFinite(savedTime) && savedTime > eps && (!hasDur || savedTime < duration - eps)) {
      return { seek: null, prompt: savedTime };
    }
    return { seek: null, prompt: null };
  }/*/fn:resolveInitialTime*/

  /*fn:buildResumeLink*/function buildResumeLink(href, seconds, prefix) {
    var base = String(href || '').split('#')[0];
    var p = String(prefix || '#t=');
    var t = Math.floor(Number(seconds));
    return (isFinite(t) && t >= 1) ? (base + p + t) : base;
  }/*/fn:buildResumeLink*/

  /*fn:rungUrl*/function rungUrl(base, rungId, defaultId, queryParam) {
    var clean = String(base || '').split('#')[0];
    var q = String(queryParam || 'rung');
    var qi = clean.indexOf('?');
    var path = qi >= 0 ? clean.slice(0, qi) : clean;
    var qs = qi >= 0 ? clean.slice(qi + 1) : '';
    var parts = qs ? qs.split('&').filter(function (kv) {
      return kv && decodeURIComponent(kv.split('=')[0]) !== q;
    }) : [];
    if (rungId && rungId !== defaultId) {
      parts.push(encodeURIComponent(q) + '=' + encodeURIComponent(rungId));
    }
    return parts.length ? (path + '?' + parts.join('&')) : path;
  }/*/fn:rungUrl*/

  /*fn:selectRung*/function selectRung(rungs, net, savedId, policy) {
    var list = (rungs || []).filter(function (r) { return r && r.id; });
    if (!list.length) return null;
    var pol = policy || {};
    var autoId = pol.auto_id || 'auto';
    var defId = pol.default_id || list[list.length - 1].id;
    if (savedId && savedId !== autoId) {
      var pinned = list.filter(function (r) { return r.id === savedId; })[0];
      if (pinned) return pinned.id;
    }
    var byRate = list.slice().sort(function (a, b) { return (Number(a.avg_kbps) || 0) - (Number(b.avg_kbps) || 0); });
    var nw = pol.network || {};
    var info = net || {};
    var audio = byRate.filter(function (r) { return Number(r.height) === 0; });
    var videos = byRate.filter(function (r) { return Number(r.height) > 0; });
    if (info.saveData) {
      return (nw.save_data_prefer_audio && audio.length) ? audio[0].id : byRate[0].id;
    }
    var et = String(info.effectiveType || '');
    var slow = nw.slow_effective_types || [];
    if (et && slow.indexOf(et) >= 0) return byRate[0].id;
    var dl = Number(info.downlink);
    var sf = Number(nw.safety_factor) > 0 ? Number(nw.safety_factor) : 1;
    if (isFinite(dl) && dl > 0) {
      var budget = (dl * 1000) / sf;
      var fit = byRate.filter(function (r) { return Number(r.avg_kbps) > 0 && Number(r.avg_kbps) <= budget; });
      return fit.length ? fit[fit.length - 1].id : byRate[0].id;
    }
    var med = nw.medium_effective_types || [];
    if (et && med.indexOf(et) >= 0) return videos.length ? videos[0].id : byRate[0].id;
    if (nw.unknown_net_strategy === 'middle_video' && videos.length) {
      var mid = Math.min(Math.floor(videos.length / 2), Math.max(0, videos.length - 2));
      return videos[mid].id;
    }
    var defRow = list.filter(function (r) { return r.id === defId; })[0];
    return defRow ? defRow.id : byRate[byRate.length - 1].id;
  }/*/fn:selectRung*/

  /*fn:lowerRung*/function lowerRung(rungs, currentId) {
    var byRate = (rungs || []).filter(function (r) { return r && r.id; })
      .slice().sort(function (a, b) { return (Number(a.avg_kbps) || 0) - (Number(b.avg_kbps) || 0); });
    var idx = -1;
    for (var i = 0; i < byRate.length; i++) {
      if (byRate[i].id === currentId) { idx = i; break; }
    }
    return idx > 0 ? byRate[idx - 1].id : null;
  }/*/fn:lowerRung*/

  /*fn:recoverStep*/function recoverStep(s, e, cfg) {
    var keep = function (fx) { return { state: s, fx: fx || [] }; };
    var to = function (patch, fx) { return { state: Object.assign({}, s, patch), fx: fx || [] }; };
    var recover = function (st, now) {
      if (st.busy) return { state: st, fx: [] };
      if (st.attempts >= cfg.backoff.length && !now) {
        return { state: st, fx: [{ do: 'clearStall' }, { do: 'unmark' }, { do: 'show', state: 'failed' }] };
      }
      // снимок берётся один раз за сбой и живёт до выздоровления: повтор после неудачной загрузки видит прежний
      var fresh = !st.snap;
      var snap = st.snap || { t: e.obs.t, rate: e.obs.rate, paused: !st.wantPlay, modes: e.obs.modes };
      var nextRung = st.rung || null;
      var stepped = false;
      if (!now && cfg.autoStepDown && st.autoMode && cfg.rungs && cfg.rungs.length
          && (st.attempts + 1) >= (cfg.autoDowngradeAfter || 1)) {
        var down = lowerRung(cfg.rungs, st.rung);
        if (down && down !== st.rung) { nextRung = down; stepped = true; }
      }
      return {
        state: Object.assign({}, st, { busy: true, snap: snap, attempts: st.attempts + 1, rung: nextRung }),
        fx: [{ do: 'clearStall' }]
          .concat(fresh ? [{ do: 'persist' }] : [])   // место уходит в хранилище страницы ДО data-recovering
          .concat(stepped ? [{ do: 'syncRung', rung: nextRung }] : [])
          .concat([{ do: 'mark' }, { do: 'show', state: 'recovering' },
                   { do: 'schedule', ms: now ? 0 : cfg.backoff[st.attempts] }])
      };
    };
    var on = {
      // Намерение зрителя, а не состояние элемента: при сетевой ошибке элемент сам встаёт на паузу.
      play: function () { return to({ wantPlay: true }); },
      pause: function () {
        return (!e.obs.err && !e.obs.ended && !s.busy && !e.obs.recovering) ? to({ wantPlay: false }) : keep();
      },
      error: function () { return recover(s, false); },
      stall: function () { return recover(s, false); },
      retry: function () { return recover(Object.assign({}, s, { attempts: 0 }), true); },
      'switch': function () {
        var snap = { t: e.obs.t, rate: e.obs.rate, paused: !s.wantPlay, modes: e.obs.modes };
        return to({
          attempts: 0, busy: false, snap: snap,
          rung: e.rungId,
          autoMode: typeof e.autoMode === 'boolean' ? e.autoMode : s.autoMode
        }, [{ do: 'clearStall' }, { do: 'persist' }, { do: 'mark' },
            { do: 'reload', snap: snap, rung: e.rungId }]);
      },
      meta: function () {
        return (s.snap && e.obs.recovering) ? keep([{ do: 'restore', snap: s.snap }]) : keep();
      },
      waiting: function () {
        return keep([{ do: 'clearStall' }].concat(isFinite(cfg.stallMs) ? [{ do: 'armStall', ms: cfg.stallMs }] : []));
      },
      'wait-over': function () { return to({ busy: false }, [{ do: 'reload', snap: s.snap, rung: s.rung }]); },
      // здоров, лишь когда место вернулось: восстановление не кончается на загрузке метаданных
      alive: function () {
        var healthy = !s.busy && e.obs.rs >= 3 && !(s.snap && e.obs.recovering && Math.abs(e.obs.t - s.snap.t) > 1);
        return healthy ? to({ attempts: 0, snap: null }, [{ do: 'clearStall' }, { do: 'unmark' }, { do: 'show', state: null }])
                       : keep([{ do: 'clearStall' }]);
      }
    };
    return (on[e.type] || keep)();
  }/*/fn:recoverStep*/
  function recoverable(v) {
    // imperative: DOM+timers - единственный владелец элемента, таймеров и ячейки состояния; решает recoverStep
    var backoff = (v.getAttribute('data-recover-backoff') || '').split(/\s+/).map(parseFloat).filter(isFinite);
    if (!backoff.length) return;
    var rungs = [], policy = {};
    try { rungs = JSON.parse(v.getAttribute('data-rungs') || '[]') || []; } catch (err) { rungs = []; }
    try { policy = JSON.parse(v.getAttribute('data-rung-policy') || '{}') || {}; } catch (err) { policy = {}; }
    var nw = policy.network || {};
    var defRung = policy.default_id || 'top';
    var autoId = policy.auto_id || 'auto';
    var qParam = policy.query_param || 'rung';
    var cfg = {
      backoff: backoff,
      stallMs: parseFloat(v.getAttribute('data-recover-stall-s')) * 1000,
      rungs: rungs,
      autoStepDown: !!nw.stall_step_down,
      autoDowngradeAfter: Number(nw.auto_downgrade_after_stalls) || 1
    };
    var box = document.getElementById(v.getAttribute('data-recover-status') || '');
    var sel = document.querySelector('[data-rung-select]');
    var baseSrc = v.getAttribute('data-record-url') || (function () {
      var s = v.querySelector('source'); return (s && s.getAttribute('src')) || v.getAttribute('src') || v.currentSrc || '';
    })();
    var initSaved = sel ? (sel.getAttribute('data-saved-rung') || sel.value || autoId) : autoId;
    var initRung = rungs.length ? selectRung(rungs, navigator.connection || {}, initSaved, policy) : null;
    var state = {
      attempts: 0, busy: false, snap: null, wantPlay: !v.paused,
      rung: initRung,
      autoMode: !initSaved || initSaved === autoId
    };
    var stallTimer = null;
    var modes = function () { return Array.prototype.map.call(v.textTracks || [], function (t) { return t.mode; }); };
    var obs = function () {
      return { t: v.currentTime, rate: v.playbackRate, modes: modes(), rs: v.readyState,
               recovering: v.hasAttribute('data-recovering'), err: !!v.error, ended: v.ended };
    };
    var syncSize = function (targetRung) {
      var sizeEl = document.querySelector('[data-player-size]');
      if (!sizeEl || !rungs.length) return;
      var tpl = sizeEl.getAttribute('data-size-tpl') || '';
      var hit = rungs.filter(function (r) { return r.id === (targetRung || defRung); })[0];
      if (tpl && hit && Number(hit.bytes) > 0) {
        sizeEl.textContent = tpl.replace('{mb}', String(Math.round(Number(hit.bytes) / 1e6)));
      }
    };
    var applySrc = function (targetRung, bust) {
      var u = rungs.length ? rungUrl(baseSrc, targetRung, defRung, qParam) : baseSrc;
      if (bust && u) {
        var sep = u.indexOf('?') === -1 ? '?' : '&';
        u = u + sep + '_r=' + String(Date.now());
      }
      Array.prototype.slice.call(v.querySelectorAll('source')).forEach(function (s) { s.parentNode && s.parentNode.removeChild(s); });
      v.src = u;
      v.setAttribute('data-active-rung', targetRung || defRung);
      syncSize(targetRung);
    };
    var applySnap = function (snap) {
      if (!snap) return;
      try { if (isFinite(snap.t) && snap.t > 0) v.currentTime = snap.t; } catch (err) { /* место вернёт loadeddata */ }
      if (isFinite(snap.rate) && snap.rate > 0) v.playbackRate = snap.rate;
      Array.prototype.forEach.call(v.textTracks || [], function (t, i) { if (snap.modes && snap.modes[i]) t.mode = snap.modes[i]; });
      if (!snap.paused) { var go = v.play(); if (go && go.catch) go.catch(function () {}); }
    };
    var run = {
      clearStall: function () { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } },
      armStall: function (f) { stallTimer = setTimeout(function () { send('stall'); }, f.ms); },
      // без события хранилище держит прежнее место
      persist: function () { try { v.dispatchEvent(new Event('timeupdate')); } catch (err) { /* прежнее место */ } },
      mark: function () { v.setAttribute('data-recovering', ''); },
      unmark: function () { v.removeAttribute('data-recovering'); },
      syncRung: function (f) { v.setAttribute('data-active-rung', f.rung || defRung); syncSize(f.rung); },
      show: function (f) {
        if (!box) return;
        box.hidden = !f.state;
        box.querySelectorAll('[data-state]').forEach(function (n) { n.hidden = n.getAttribute('data-state') !== f.state; });
        if (f.state === 'failed') reportClientErr(v, 'player_recover', v.getAttribute('data-active-rung') || defRung);
      },
      schedule: function (f) { setTimeout(function () { send('wait-over'); }, f.ms); },
      restore: function (f) { applySnap(f.snap); },
      reload: function (f) {
        applySrc(f.rung, true);
        v.load();
      }
    };
    function send(type, extra) {
      var ev = Object.assign({ type: type, obs: obs() }, extra || {});
      var r = recoverStep(state, ev, cfg);
      state = r.state;
      r.fx.forEach(function (f) { run[f.do](f); });
    }
    if (rungs.length && initRung && initRung !== defRung) {
      applySrc(initRung);
      v.load();
    } else if (rungs.length) {
      v.setAttribute('data-active-rung', initRung || defRung);
      syncSize(initRung);
    }
    var hPref = policy.hash_prefix || v.getAttribute('data-hash-prefix') || '#t=';
    var hTime = parseHashTime(location.hash, hPref);
    var savedT = parseFloat(v.getAttribute('data-saved-time') || 'NaN');
    var epsVal = parseFloat(v.getAttribute('data-resume-eps') || '0');
    var durVal = parseFloat(v.getAttribute('data-duration') || 'NaN');
    var initT = resolveInitialTime(hTime, savedT, epsVal, durVal);
    var resumeBox = document.getElementById('player-resume');
    var resumeTimeEl = document.getElementById('player-resume-time');
    if (initT.seek !== null) {
      if (resumeBox) resumeBox.hidden = true;
      var seekInit = function () {
        v.removeEventListener('loadedmetadata', seekInit);
        try { v.currentTime = initT.seek; } catch (err) { /* место вернёт loadeddata */ }
      };
      if (v.readyState >= 1) seekInit();
      else v.addEventListener('loadedmetadata', seekInit);
    } else if (initT.prompt !== null && resumeBox && resumeTimeEl) {
      var pt = Math.floor(initT.prompt);
      resumeTimeEl.textContent = Math.floor(pt / 60) + ':' + String(pt % 60).padStart(2, '0');
      resumeBox.hidden = false;
    }
    [['play', 'play'], ['pause', 'pause'], ['waiting', 'waiting'],
     ['loadedmetadata', 'meta'], ['playing', 'alive'], ['seeked', 'alive'], ['canplaythrough', 'alive']].forEach(function (p) {
      v.addEventListener(p[0], function () { send(p[1]); });
    });
    // Capture-phase error listener catches `<source>` resource load errors (which do not bubble per HTML spec),
    // while explicitly ignoring `<track>` caption errors so missing/flaky subtitles never trigger video reload (D-09).
    v.addEventListener('error', function (ev) {
      var tgt = ev && ev.target;
      if (tgt && tgt !== v && String(tgt.tagName || '').toUpperCase() !== 'SOURCE') return;
      send('error');
    }, true);
    window.addEventListener('online', function () {
      if (state.busy || (box && !box.hidden)) send('retry');
    });
    if (sel && rungs.length) {
      sel.addEventListener('change', function () {
        var val = sel.value || autoId;
        var isAuto = val === autoId;
        var target = selectRung(rungs, navigator.connection || {}, val, policy);
        if (target && target !== state.rung) {
          send('switch', { rungId: target, autoMode: isAuto });
        } else {
          state = Object.assign({}, state, { autoMode: isAuto });
        }
      });
    }
    var btn = box && box.querySelector('[data-retry]');
    if (btn) btn.addEventListener('click', function () { send('retry'); });
  }

  function armResumeLinks() {
    // imperative: DOM+clipboard - привязка кнопки копирования ссылки на текущий момент записи
    document.querySelectorAll('[data-resume-link]').forEach(function (btn) {
      if (btn.dataset.armed) return;
      btn.dataset.armed = '1';
      var timer = null;
      btn.addEventListener('click', function () {
        var p = document.querySelector('[data-player]');
        if (!p) return;
        var prefix = btn.getAttribute('data-hash-prefix') || '#t=';
        var link = buildResumeLink(location.href, p.currentTime, prefix);
        var done = function () {
          var copied = btn.getAttribute('data-label-copied');
          var orig = btn.getAttribute('data-label-default') || btn.textContent;
          if (copied) {
            btn.textContent = copied;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () { btn.textContent = orig; }, 2000);
          }
        };
        var fallback = function () {
          var hashPart = link.indexOf('#') >= 0 ? link.slice(link.indexOf('#') + 1) : '';
          if (hashPart) location.hash = hashPart;
          var fb = document.getElementById(btn.getAttribute('data-fallback-id') || 'player-resume-fallback');
          if (fb) {
            var inp = fb.querySelector('input');
            if (inp) {
              inp.value = link;
              fb.hidden = false;
              inp.focus();
              inp.select();
            }
          }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(done, fallback);
        } else {
          fallback();
        }
      });
    });
  }

  /* ОБЕЗЛИЧЕННЫЙ МАЯК ОШИБОК ПРОИГРЫВАТЕЛЯ (Axis 24, 0 ПДн / 0 IP / 0 токенов).
     Адрес едет из разметки (`data-err-beacon`, выведен из routes.yaml), отправляется только при
     терминальном исчерпании попыток восстановления проигрывателя. */
  /*fn:clientErrPayload*/function clientErrPayload(surface, slug, kind, code) {
    var clip = function (val, max) { return String(val || '').trim().slice(0, max); };
    var s = clip(surface, 32), sl = clip(slug, 64), k = clip(kind, 32), c = clip(code, 64);
    if (!s || !sl || !k || !c) return null;
    return { surface: s, slug: sl, kind: k, code: c };
  }/*/fn:clientErrPayload*/
  var errSent = {};
  function reportClientErr(v, kind, code) {
    // imperative: IO - one-shot zero-PII sendBeacon on terminal player recovery failure
    var url = v && v.getAttribute('data-err-beacon');
    if (!url || !navigator.sendBeacon) return;
    var payload = clientErrPayload('buyer', v.getAttribute('data-slug') || '', kind, code);
    if (!payload) return;
    var dedup = payload.slug + '|' + payload.kind + '|' + payload.code;
    if (errSent[dedup]) return;
    errSent[dedup] = true;
    try {
      navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    } catch (err) { /* маяк никогда не ломает проигрыватель */ }
  }

  /* ПАМЯТЬ ОТМЕТОК (B9) И ВЕРСИОНИРОВАНИЕ СХЕМЫ ХРАНИЛИЩА (Axis 31).
     Флажок `input[type=checkbox][data-keep]` помнит своё состояние у этого читателя: ключ — путь
     страницы и `data-keep`. Хранилище может отказать (приватное окно, запрет) — страница от этого
     не ломается, флажок просто не помнит. Схема версионирована (`dela-schema:<pathname>`), чтобы
     будущие переименования ключей мигрировали заметки читателя без потерь. */
  var STORAGE_SCHEMA_VERSION = 1;
  var STORAGE_MIGRATIONS = {};
  /*fn:migrateStorage*/function migrateStorage(storeFn, pathname, targetVersion, migrations) {
    var verKey = 'dela-schema:' + String(pathname || '');
    var raw = storeFn('get', verKey);
    var cur = raw ? parseInt(raw, 10) : 0;
    if (!isFinite(cur) || cur < 0) cur = 0;
    var target = Number(targetVersion) || 1;
    var migs = migrations || {};
    var v = cur;
    while (v < target) {
      if (typeof migs[v] === 'function') migs[v](storeFn, pathname);
      v += 1;
    }
    if (cur !== target) storeFn('set', verKey, String(target));
    return target;
  }/*/fn:migrateStorage*/
  function store(op, k, v) {
    try { return op === 'get' ? window.localStorage.getItem(k) : window.localStorage.setItem(k, v); }
    catch (err) { return null; }
  }
  function keyOf(box) { return 'dela-keep:' + location.pathname + ':' + box.getAttribute('data-keep'); }
  function textKeyOf(ta) { return 'dela-keep-text:' + location.pathname + ':' + ta.getAttribute('data-keep-text'); }
  function restore() {
    migrateStorage(store, location.pathname, STORAGE_SCHEMA_VERSION, STORAGE_MIGRATIONS);
    document.querySelectorAll('input[type="checkbox"][data-keep]').forEach(function (box) {
      if (store('get', keyOf(box)) === '1') box.checked = true;
    });
    document.querySelectorAll('textarea[data-keep-text]').forEach(function (ta) {
      var saved = store('get', textKeyOf(ta));
      if (saved !== null) ta.value = saved;
    });
  }
  /*fn:mergeWorkbookState*/function mergeWorkbookState(local, remote) {
    var lNotes = (local && local.notes) || {};
    var rNotes = (remote && remote.notes) || {};
    var lChecks = (local && local.checks) || {};
    var rChecks = (remote && remote.checks) || {};
    var notes = {};
    var checks = {};
    var changedLocal = false;
    var dirtyRemote = false;
    Object.keys(rNotes).forEach(function (k) {
      notes[k] = String(rNotes[k] == null ? '' : rNotes[k]);
      if (!lNotes[k] && notes[k]) changedLocal = true;
    });
    Object.keys(lNotes).forEach(function (k) {
      var lv = String(lNotes[k] == null ? '' : lNotes[k]);
      if (lv && !notes[k]) {
        notes[k] = lv;
        dirtyRemote = true;
      } else if (lv && notes[k] && lv !== notes[k]) {
        // Remote wins when local is empty; otherwise keep local non-empty edit and sync up
        notes[k] = lv;
        dirtyRemote = true;
      }
    });
    Object.keys(rChecks).forEach(function (k) {
      checks[k] = !!rChecks[k];
      if (!!rChecks[k] && !lChecks[k]) changedLocal = true;
    });
    Object.keys(lChecks).forEach(function (k) {
      if (lChecks[k] && !checks[k]) {
        checks[k] = true;
        dirtyRemote = true;
      }
    });
    return { notes: notes, checks: checks, changedLocal: changedLocal, dirtyRemote: dirtyRemote };
  }/*/fn:mergeWorkbookState*/
  function collectWorkbookState() {
    var notes = {};
    var checks = {};
    document.querySelectorAll('textarea[data-keep-text]').forEach(function (ta) {
      var id = ta.getAttribute('data-keep-text');
      if (id) notes[id] = ta.value || '';
    });
    document.querySelectorAll('input[type="checkbox"][data-keep]').forEach(function (box) {
      var id = box.getAttribute('data-keep');
      if (id) checks[id] = !!box.checked;
    });
    return { notes: notes, checks: checks };
  }
  var _notesSyncTimer = null;
  function hasRemoteNotesDoor() {
    return typeof fetch === 'function' && !!document.getElementById('buyer-player');
  }
  function pushWorkbookRemote() {
    if (!hasRemoteNotesDoor()) return;
    var state = collectWorkbookState();
    fetch('./notes', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(function () {});
  }
  function scheduleWorkbookRemotePush() {
    if (!hasRemoteNotesDoor()) return;
    if (_notesSyncTimer) clearTimeout(_notesSyncTimer);
    _notesSyncTimer = setTimeout(pushWorkbookRemote, 800);
  }
  function hydrateWorkbookRemote() {
    if (!hasRemoteNotesDoor()) return;
    fetch('./notes', { method: 'GET', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (remote) {
        if (!remote || !remote.ok) return;
        var merged = mergeWorkbookState(collectWorkbookState(), remote);
        if (merged.changedLocal) {
          document.querySelectorAll('textarea[data-keep-text]').forEach(function (ta) {
            var id = ta.getAttribute('data-keep-text');
            if (id && Object.prototype.hasOwnProperty.call(merged.notes, id) && ta.value !== merged.notes[id]) {
              ta.value = merged.notes[id];
              store('set', textKeyOf(ta), ta.value);
              syncWorksheet(ta.closest('.exercise-worksheet'), !!ta.value);
            }
          });
          document.querySelectorAll('input[type="checkbox"][data-keep]').forEach(function (box) {
            var id = box.getAttribute('data-keep');
            if (id && Object.prototype.hasOwnProperty.call(merged.checks, id) && box.checked !== !!merged.checks[id]) {
              box.checked = !!merged.checks[id];
              store('set', keyOf(box), box.checked ? '1' : '0');
            }
          });
          syncGlobalWorkbook();
        }
        if (merged.dirtyRemote) pushWorkbookRemote();
      })
      .catch(function () {});
  }
  document.addEventListener('change', function (e) {
    var box = e.target;
    if (box && box.matches && box.matches('input[type="checkbox"][data-keep]')) {
      store('set', keyOf(box), box.checked ? '1' : '0');
      scheduleWorkbookRemotePush();
    }
  });
  /*fn:formatWorksheet*/function formatWorksheet(pairs) {
    return (pairs || []).filter(function (p) { return p && String(p.val || '').trim(); })
      .map(function (p) { return String(p.label || '').trim() + ': ' + String(p.val || '').trim(); })
      .join('\n\n');
  }/*/fn:formatWorksheet*/
  /*fn:formatAllWorksheets*/function formatAllWorksheets(groups) {
    return (groups || []).map(function (g) {
      var body = formatWorksheet(g && g.pairs);
      if (!body) return '';
      var title = String((g && g.title) || '').trim();
      return title ? title + '\n' + body : body;
    }).filter(Boolean).join('\n\n---\n\n');
  }/*/fn:formatAllWorksheets*/
  function worksheetPairs(fs) {
    return Array.prototype.map.call(fs.querySelectorAll('textarea[data-keep-text]'), function (ta) {
      var row = ta.closest('.worksheet-row');
      var lbl = row && row.querySelector('.worksheet-label');
      return { label: lbl ? lbl.textContent.trim() : '', val: ta.value };
    });
  }
  function allWorksheetGroups() {
    return Array.prototype.map.call(document.querySelectorAll('.exercise-worksheet'), function (fs) {
      return { title: fs.getAttribute('data-worksheet-title') || '', pairs: worksheetPairs(fs) };
    });
  }
  /*fn:workbookFilename*/function workbookFilename(pathname) {
    var seg = String(pathname || '').replace(/^\/+|\/+$/g, '').split('/').pop() || 'notes';
    var clean = seg.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return (clean || 'notes') + '-notes.txt';
  }/*/fn:workbookFilename*/
  function downloadText(text, filename) {
    // imperative: DOM+Blob - fallback export when clipboard API is absent or denied (in-app WebViews)
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false;
    try {
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (err) {} }, 1000);
      return true;
    } catch (err) {
      return false;
    }
  }
  function exportTextWithFallback(out, onDone) {
    if (!out) return;
    var fname = workbookFilename(location.pathname);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out).then(onDone, function () {
        if (downloadText(out, fname)) onDone();
      });
    } else if (downloadText(out, fname)) {
      onDone();
    }
  }
  function syncPrintMirrors(root) {
    (root || document).querySelectorAll('textarea[data-keep-text]').forEach(function (ta) {
      var row = ta.closest('.worksheet-row');
      var mirror = row && row.querySelector('.worksheet-print-mirror');
      if (mirror) mirror.textContent = ta.value || '';
    });
  }
  function syncProgressCounter() {
    var box = document.querySelector('[data-story-progress]');
    if (!box) return;
    var sheets = document.querySelectorAll('.exercise-worksheet');
    var filled = 0;
    sheets.forEach(function (fs) {
      if (formatWorksheet(worksheetPairs(fs))) filled += 1;
    });
    var wsEl = box.querySelector('[data-progress-worksheets]');
    if (wsEl) wsEl.textContent = String(filled) + '/' + String(sheets.length);
  }
  function escapeIcsText(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }
  function buildReturnIcs(title, url, schedule, host) {
    var now = new Date();
    var pad2 = function (n) { return String(n).padStart(2, '0'); };
    var fmtDay = function (d) {
      return String(d.getUTCFullYear()) + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
    };
    var stamp = fmtDay(now) + 'T' + pad2(now.getUTCHours()) + pad2(now.getUTCMinutes()) + pad2(now.getUTCSeconds()) + 'Z';
    var dom = String(host || (typeof location !== 'undefined' && location.hostname) || 'calendar.local')
      .replace(/[^A-Za-z0-9.-]/g, '') || 'calendar.local';
    var rows = Array.isArray(schedule) ? schedule.filter(function (o) {
      return o && Number(o.days) > 0 && o.label;
    }) : [];
    var events = rows.reduce(function (acc, o, i) {
      var start = new Date(now.getTime() + Number(o.days) * 86400000);
      var end = new Date(start.getTime() + 86400000);
      var ds = fmtDay(start);
      var de = fmtDay(end);
      var desc = escapeIcsText(o.label) + (url ? '\\n' + escapeIcsText(url) : '');
      return acc.concat([
        'BEGIN:VEVENT',
        'UID:return-' + String(o.days) + '-' + ds + '-' + String(i) + '@' + dom,
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ds,
        'DTEND;VALUE=DATE:' + de,
        'SUMMARY:' + escapeIcsText(String(title || '') + ' — ' + String(o.label)),
        'DESCRIPTION:' + desc,
        'END:VEVENT'
      ]);
    }, []);
    var lang = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || 'ru')
      .replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'RU';
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + dom + '//Calendar//' + lang]
      .concat(events, ['END:VCALENDAR'])
      .join('\r\n') + '\r\n';
  }
  function syncGlobalWorkbook() {
    var allText = formatAllWorksheets(allWorksheetGroups());
    document.querySelectorAll('[data-worksheet-export-all]').forEach(function (btn) {
      btn.hidden = false;
      btn.disabled = !allText;
    });
    syncProgressCounter();
  }
  function syncWorksheet(fs, markSaved) {
    if (!fs) return;
    syncPrintMirrors(fs);
    var text = formatWorksheet(worksheetPairs(fs));
    var st = fs.querySelector('[data-worksheet-status]');
    if (st && markSaved) {
      var msg = st.getAttribute('data-label-saved') || '';
      st.textContent = text ? msg : '';
    }
    var btn = fs.querySelector('[data-worksheet-copy]');
    if (btn) {
      btn.hidden = false;
      btn.disabled = !text;
    }
    syncGlobalWorkbook();
  }
  function armShareAndReturn() {
    document.querySelectorAll('[data-share-anchor]').forEach(function (btn) {
      if (btn.dataset.armed) return;
      btn.dataset.armed = '1';
      var timer = null;
      btn.addEventListener('click', function () {
        var hash = btn.getAttribute('data-share-anchor') || '';
        var url = location.origin + location.pathname + (hash ? ('#' + hash.replace(/^#/, '')) : '');
        var title = btn.getAttribute('data-share-title') || document.title;
        var done = function () {
          var copied = btn.getAttribute('data-label-copied') || '';
          if (!copied) return;
          var orig = btn.getAttribute('data-label-default') || btn.textContent;
          btn.textContent = copied;
          if (timer) clearTimeout(timer);
          timer = setTimeout(function () { btn.textContent = orig; }, 2000);
        };
        if (navigator.share) {
          navigator.share({ title: title, url: url }).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, function () {});
        }
      });
    });
    document.querySelectorAll('[data-ics-return]').forEach(function (btn) {
      if (btn.dataset.armed) return;
      btn.dataset.armed = '1';
      btn.addEventListener('click', function () {
        var title = btn.getAttribute('data-ics-title') || document.title;
        var host = btn.getAttribute('data-ics-host') || '';
        var schedule = [];
        try { schedule = JSON.parse(btn.getAttribute('data-ics-schedule') || '[]') || []; } catch (e) { schedule = []; }
        var ics = buildReturnIcs(title, location.href.split('#')[0], schedule, host);
        if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
          var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
          var u = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = u;
          a.download = 'return-schedule.ics';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { try { URL.revokeObjectURL(u); } catch (err) {} }, 1000);
        }
      });
    });
    // Annotate local time (including local date if crossing midnight) on any `[data-until]` deadline element.
    document.querySelectorAll('[data-until]').forEach(function (el) {
      if (el.getAttribute('data-tz-done')) return;
      var iso = el.getAttribute('data-until') || '';
      var m = /([+-])(\d{2}):(\d{2})$|Z$/.exec(iso);
      var ms = Date.parse(iso);
      if (!m || isNaN(ms)) return;
      var srcOffMin = iso.slice(-1) === 'Z' ? 0 : (m[1] === '+' ? 1 : -1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
      var localOffMin = -new Date(ms).getTimezoneOffset();
      el.setAttribute('data-tz-done', '1');
      if (srcOffMin === localOffMin) return;
      var d = new Date(ms);
      var srcD = new Date(ms + srcOffMin * 60000);
      var sameDay = d.getFullYear() === srcD.getUTCFullYear() && d.getMonth() === srcD.getUTCMonth() && d.getDate() === srcD.getUTCDate();
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      var stamp = sameDay ? (hh + ':' + mm) : (String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + hh + ':' + mm);
      var tzTpl = el.getAttribute('data-tz-local-note') || _tzLocalTpl;
      if (tzTpl) el.textContent = el.textContent + ' ' + tzTpl.replace('{time}', stamp);
    });
  }
  function armWorksheets() {
    // imperative: DOM+clipboard - sync saved note indicator and 1-click brief export per worksheet + whole workbook
    function flashDone(btn, state) {
      var copied = btn.getAttribute('data-label-copied');
      var orig = btn.getAttribute('data-label-default') || btn.textContent;
      if (copied) {
        btn.textContent = copied;
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(function () { btn.textContent = orig; }, 2000);
      }
    }
    document.querySelectorAll('.exercise-worksheet').forEach(function (fs) {
      var text = formatWorksheet(worksheetPairs(fs));
      syncWorksheet(fs, !!text);
      var btn = fs.querySelector('[data-worksheet-copy]');
      if (!btn || btn.dataset.armed) return;
      btn.dataset.armed = '1';
      var st = { timer: null };
      btn.addEventListener('click', function () {
        var out = formatWorksheet(worksheetPairs(fs));
        exportTextWithFallback(out, function () { flashDone(btn, st); });
      });
    });
    document.querySelectorAll('[data-worksheet-export-all]').forEach(function (btn) {
      if (btn.dataset.armed) return;
      btn.dataset.armed = '1';
      var st = { timer: null };
      btn.addEventListener('click', function () {
        var out = formatAllWorksheets(allWorksheetGroups());
        exportTextWithFallback(out, function () { flashDone(btn, st); });
      });
    });
    function eagerizeImagesForPrint() {
      var waits = [];
      document.querySelectorAll('img').forEach(function (img) {
        if (img.getAttribute('loading') === 'lazy' || img.loading === 'lazy') {
          img.removeAttribute('loading');
          img.loading = 'eager';
        }
        if (!img.complete) {
          waits.push(new Promise(function (resolve) {
            img.addEventListener('load', function () {
              if (typeof img.decode === 'function') img.decode().catch(function () {}).finally(resolve);
              else resolve();
            }, { once: true });
            img.addEventListener('error', resolve, { once: true });
          }));
        } else if (typeof img.decode === 'function' && img.naturalWidth > 0) {
          waits.push(img.decode().catch(function () {}));
        }
      });
      return waits;
    }
    function printWithImages() {
      syncPrintMirrors(document);
      var waits = eagerizeImagesForPrint();
      if (!waits.length) { window.print(); return; }
      Promise.race([Promise.all(waits), new Promise(function (r) { setTimeout(r, 3500); })])
        .then(function () { window.print(); });
    }
    if (!window.__delaPrintArmed) {
      window.__delaPrintArmed = true;
      window.addEventListener('beforeprint', function () {
        syncPrintMirrors(document);
        eagerizeImagesForPrint();
      });
    }
    document.querySelectorAll('[data-worksheet-print]').forEach(function (btn) {
      if (btn.dataset.armed) return;
      btn.dataset.armed = '1';
      btn.addEventListener('click', printWithImages);
    });
    syncGlobalWorkbook();
    armShareAndReturn();
    hydrateWorkbookRemote();
  }
  document.addEventListener('input', function (e) {
    var ta = e.target;
    if (ta && ta.matches && ta.matches('textarea[data-keep-text]')) {
      store('set', textKeyOf(ta), ta.value);
      syncWorksheet(ta.closest('.exercise-worksheet'), true);
      scheduleWorkbookRemotePush();
    }
  });

  /* ПОЗИЦИЯ ЗАПИСИ ПОМНИТСЯ (ergo B3). Носитель с объявленным порогом `data-resume-eps` (ряд
     Спеки `player.resume_epsilon_s`) возвращается к месту, где читатель остановился. Хранилище —
     localStorage, а не sessionStorage: запись слушают не за один присест, и возврат через день
     есть ровно тот случай; ключ — путь страницы и путь записи (без `#t=`). Отрывки (`span`) не
     помнятся — их начало есть граница. Носитель с собственной памятью (`[data-player]`) — свой. */
  function posKey(el) {
    var src = (el.currentSrc || el.getAttribute('src') || '').split('#')[0];
    return 'dela-pos:' + location.pathname + ':' + src.replace(location.origin, '');
  }
  function remembers(el) {
    return el && el.matches && el.matches('[data-resume-eps]:not([data-player])') && !span(el);
  }
  document.addEventListener('loadedmetadata', function (e) {
    var el = e.target;
    if (!remembers(el)) return;
    var t = parseFloat(store('get', posKey(el))), eps = parseFloat(el.getAttribute('data-resume-eps'));
    if (isFinite(t) && t > eps && (!isFinite(el.duration) || t < el.duration - eps)) el.currentTime = t;
  }, true);
  var lastSaved = {};
  document.addEventListener('timeupdate', function (e) {
    var el = e.target;
    if (!remembers(el)) return;
    var k = posKey(el), eps = parseFloat(el.getAttribute('data-resume-eps'));
    // запись не чаще шага ε — тот же порог, что решает, стоит ли возвращаться
    if (Math.abs(el.currentTime - (lastSaved[k] || 0)) < eps) return;
    lastSaved[k] = el.currentTime;
    store('set', k, String(el.currentTime));
  }, true);
  document.addEventListener('ended', function (e) {
    if (remembers(e.target)) store('set', posKey(e.target), '0');
  }, true);

  /* СКОРОСТЬ (ergo B3). Ряд скоростей — данные Спеки (`player.rates`), едет атрибутом
     `data-rates`; кнопка рядом с носителем перебирает их по кругу. Надпись — число и знак «×»,
     слова нет. Нативный выбор есть не везде (iOS Safari его не даёт) — поэтому кнопка всюду. */
  function rates(el) {
    return (el.getAttribute('data-rates') || '').split(/\s+/).map(parseFloat).filter(isFinite);
  }
  function rateButtons() {
    var rk = 'media-rate:' + location.pathname;
    var saved = parseFloat(store('get', rk));
    document.querySelectorAll('audio[data-rates], video[data-rates]').forEach(function (el) {
      var rs = rates(el);
      if (rs.length < 2 || (el.nextElementSibling && el.nextElementSibling.classList.contains('media-rate'))) return;
      if (isFinite(saved) && rs.indexOf(saved) >= 0) {
        el.playbackRate = saved;
        el.defaultPlaybackRate = saved;
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'media-rate';
      function show() { b.textContent = el.playbackRate + '×'; b.setAttribute('aria-label', (label(el) ? label(el) + ' · ' : '') + b.textContent); }
      b.addEventListener('click', function () {
        var i = rs.indexOf(el.playbackRate);
        el.playbackRate = rs[(i + 1) % rs.length];
        el.defaultPlaybackRate = el.playbackRate;
        store('set', rk, String(el.playbackRate));
      });
      el.addEventListener('ratechange', show);
      show();
      el.insertAdjacentElement('afterend', b);
    });
  }
  /*fn:shouldHydrateAudio*/function shouldHydrateAudio(preload, readyState, isMetered) {
    return String(preload || '') === 'none' && Number(readyState) === 0 && !isMetered;
  }/*/fn:shouldHydrateAudio*/
  function armLazyAudioMeta() {
    // imperative: DOM+IO - after window.load on unmetered networks, hydrate audio duration metadata on approach
    if (metered() || !('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('audio[preload="none"]');
    if (!els.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        obs.unobserve(el);
        if (shouldHydrateAudio(el.getAttribute('preload'), el.readyState, metered())) {
          el.preload = 'metadata';
        }
      });
    }, { rootMargin: '200px' });
    els.forEach(function (el) { obs.observe(el); });
  }
  /*fn:pickActiveSection*/function pickActiveSection(entries, currentId) {
    var best = null;
    (entries || []).forEach(function (e) {
      if (!e || !e.id || !e.isIntersecting) return;
      if (!best || e.ratio > best.ratio || (e.ratio === best.ratio && e.top < best.top)) {
        best = e;
      }
    });
    return best ? best.id : (currentId || '');
  }/*/fn:pickActiveSection*/
  function armSectionTracking() {
    // imperative: DOM+IO - track active section for WCAG aria-current="location" and micro-session resume
    var links = Array.prototype.slice.call(document.querySelectorAll('nav a[href^="#"]'));
    if (!links.length) return;
    var byId = {};
    var order = [];
    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      if (!byId[id]) {
        byId[id] = { el: target, links: [] };
        order.push(id);
      }
      byId[id].links.push(a);
    });
    if (!order.length) return;
    var readKey = 'dela-read-section:' + location.pathname;
    var activeId = '';
    function applyActive(id, persist) {
      if (!id || id === activeId || !byId[id]) return;
      activeId = id;
      order.forEach(function (k) {
        byId[k].links.forEach(function (a) {
          if (k === id) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      });
      var barCh = document.getElementById('buyer-bar-chapter');
      var player = document.querySelector('[data-player]');
      if (barCh && (!player || player.paused)) {
        var lnk = byId[id].links[0];
        var tEl = (lnk && lnk.querySelector && lnk.querySelector('[data-role="title"]')) || lnk;
        var txt = (tEl && tEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) barCh.textContent = txt;
      }
      if (persist && (window.scrollY || 0) > 120) store('set', readKey, id);
    }
    var savedId = store('get', readKey);
    if (!location.hash && savedId && byId[savedId] && savedId !== order[0]) {
      var docEl = document.getElementById('doc');
      var tpl = docEl && docEl.getAttribute('data-read-resume-label');
      var dismissLbl = (docEl && docEl.getAttribute('data-read-resume-dismiss')) || '×';
      var navHost = links[0].closest('nav');
      if (tpl && navHost && navHost.parentNode && !document.querySelector('.read-resume')) {
        var firstLink = byId[savedId].links[0];
        var titleEl = (firstLink && firstLink.querySelector && firstLink.querySelector('[data-role="title"]')) || firstLink;
        var secTitle = (titleEl && titleEl.textContent || savedId).replace(/\s+/g, ' ').trim();
        var bar = document.createElement('aside');
        bar.className = 'read-resume';
        bar.setAttribute('role', 'status');
        var jump = document.createElement('a');
        jump.className = 'read-resume-link';
        jump.href = '#' + savedId;
        jump.textContent = tpl.replace('{title}', secTitle);
        jump.addEventListener('click', function () { bar.remove(); });
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'read-resume-dismiss';
        closeBtn.setAttribute('aria-label', dismissLbl);
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', function () {
          store('set', readKey, '');
          bar.remove();
        });
        bar.appendChild(jump);
        bar.appendChild(closeBtn);
        navHost.parentNode.insertBefore(bar, navHost);
      }
    }
    if (!('IntersectionObserver' in window)) {
      applyActive(order[0], false);
      return;
    }
    var state = {};
    var io = new IntersectionObserver(function (ioEntries) {
      ioEntries.forEach(function (entry) {
        var id = entry.target.id;
        if (!id) return;
        state[id] = {
          id: id,
          isIntersecting: entry.isIntersecting,
          ratio: entry.intersectionRatio || 0,
          top: entry.boundingClientRect ? entry.boundingClientRect.top : 0
        };
      });
      var snap = order.map(function (id) { return state[id]; }).filter(Boolean);
      var nextId = pickActiveSection(snap, activeId);
      if (nextId) applyActive(nextId, true);
    }, { rootMargin: '-15% 0px -65% 0px', threshold: [0, 0.25, 0.5] });
    order.forEach(function (id) { io.observe(byId[id].el); });
  }
  /* ПОЛНЫЙ ЭКРАН ПРОИГРЫВАТЕЛЯ НА ТЕЛЕФОНЕ И ДЕСКТОПЕ: стандартный Fullscreen API +
     iOS Safari `webkitEnterFullscreen` + автоотключение на чисто-звуковой ступени (height=0). */
  function armFullscreen() {
    // imperative: DOM+Fullscreen API — единая кнопка полного экрана для всех мобильных и десктопных браузеров
    var btn = document.querySelector('[data-player-fullscreen]');
    var video = document.querySelector('[data-player]');
    if (!btn || !video || btn.dataset.armed) return;
    btn.dataset.armed = '1';
    var enterLbl = btn.getAttribute('data-label-enter') || btn.textContent;
    var exitLbl = btn.getAttribute('data-label-exit') || enterLbl;
    var rungs = [];
    try { rungs = JSON.parse(video.getAttribute('data-rungs') || '[]') || []; } catch (e) { rungs = []; }
    var isAudioOnly = function () {
      var active = video.getAttribute('data-active-rung') || '';
      var hit = rungs.filter(function (r) { return r && r.id === active; })[0];
      return !!(hit && Number(hit.height) === 0);
    };
    var inFs = function () {
      return !!(document.fullscreenElement || document.webkitFullscreenElement || video.webkitDisplayingFullscreen);
    };
    var syncBtn = function () {
      var audioOnly = isAudioOnly();
      btn.hidden = audioOnly;
      btn.disabled = audioOnly;
      var activeFs = inFs();
      btn.textContent = activeFs ? exitLbl : enterLbl;
      btn.setAttribute('aria-pressed', activeFs ? 'true' : 'false');
    };
    btn.addEventListener('click', function () {
      if (isAudioOnly()) return;
      if (inFs()) {
        if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (video.webkitExitFullscreen) video.webkitExitFullscreen();
        return;
      }
      var tryLandscape = function () {
        try {
          if (screen.orientation && screen.orientation.lock && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
            screen.orientation.lock('landscape').catch(function () {});
          }
        } catch (err) {}
      };
      if (typeof video.requestFullscreen === 'function') {
        Promise.resolve(video.requestFullscreen()).then(tryLandscape, function () {
          if (typeof video.webkitEnterFullscreen === 'function') {
            try { video.webkitEnterFullscreen(); } catch (err) {}
          }
        });
      } else if (typeof video.webkitRequestFullscreen === 'function') {
        try { video.webkitRequestFullscreen(); tryLandscape(); } catch (err) {
          if (typeof video.webkitEnterFullscreen === 'function') {
            try { video.webkitEnterFullscreen(); } catch (e2) {}
          }
        }
      } else if (typeof video.webkitEnterFullscreen === 'function') {
        try { video.webkitEnterFullscreen(); } catch (err) {}
      }
    });
    document.addEventListener('fullscreenchange', syncBtn);
    document.addEventListener('webkitfullscreenchange', syncBtn);
    video.addEventListener('webkitbeginfullscreen', syncBtn);
    video.addEventListener('webkitendfullscreen', syncBtn);
    video.addEventListener('loadedmetadata', syncBtn);
    var qualSel = document.querySelector('[data-rung-select]');
    if (qualSel) qualSel.addEventListener('change', function () { setTimeout(syncBtn, 50); });
    syncBtn();
  }

  /* ВЫДВИЖНОЕ ОГЛАВЛЕНИЕ НА ГЛУБОКОЙ ПРОКРУТКЕ: один нативный `<dialog id="toc-drawer">` для
     открытой витрины и закрытого кабинета, проецирующий живое `#doc-contents` без дублирования HTML. */
  function armTocDrawer() {
    // imperative: DOM+dialog — открывает оглавление на месте, не сбивая позицию чтения
    var dlg = document.getElementById('toc-drawer');
    var triggers = document.querySelectorAll('[data-toc-open]');
    if (!dlg || !triggers.length || dlg.dataset.armed) return;
    dlg.dataset.armed = '1';
    var closeLbl = dlg.getAttribute('data-close-label') || '×';
    var titleLbl = dlg.getAttribute('aria-label') || '';
    var recLbl = dlg.getAttribute('data-record-label') || '';
    function renderDrawer() {
      dlg.textContent = '';
      var head = document.createElement('div');
      head.className = 'toc-drawer-head';
      var h = document.createElement('span');
      h.className = 'toc-drawer-title';
      h.textContent = titleLbl;
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'toc-drawer-close';
      closeBtn.setAttribute('aria-label', closeLbl);
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', function () { if (dlg.open) dlg.close(); });
      head.appendChild(h);
      head.appendChild(closeBtn);
      dlg.appendChild(head);
      var list = document.createElement('ul');
      list.className = 'toc-drawer-list';
      if (recLbl && document.getElementById('player-wrapper')) {
        var rli = document.createElement('li');
        var ra = document.createElement('a');
        ra.href = '#player-wrapper';
        ra.className = 'toc-drawer-jump';
        ra.textContent = recLbl;
        ra.addEventListener('click', function () { if (dlg.open) dlg.close(); });
        rli.appendChild(ra);
        list.appendChild(rli);
      }
      var src = document.querySelector('#doc-contents ul');
      if (src) {
        Array.prototype.forEach.call(src.querySelectorAll('a[href^="#"]'), function (a) {
          var li = document.createElement('li');
          var copyA = a.cloneNode(true);
          copyA.addEventListener('click', function () { if (dlg.open) dlg.close(); });
          li.appendChild(copyA);
          list.appendChild(li);
        });
      }
      dlg.appendChild(list);
    }
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg && dlg.open) dlg.close();
    });
    triggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderDrawer();
        if (typeof dlg.showModal === 'function') {
          if (!dlg.open) dlg.showModal();
        } else {
          var toc = document.getElementById('doc-contents');
          if (toc) toc.scrollIntoView({ block: 'start' });
        }
      });
    });
  }

  function ready() {
    restore(); armWorksheets(); rateButtons(); armQuotes(); revealMetered(); armResumeLinks(); armSectionTracking();
    armFullscreen(); armTocDrawer();
    document.querySelectorAll('video[data-recover-backoff]').forEach(recoverable);
    if (document.readyState === 'complete') armLazyAudioMeta();
    else window.addEventListener('load', armLazyAudioMeta, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
