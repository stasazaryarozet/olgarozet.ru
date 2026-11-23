/* pay_status.js — ОДИН опросчик статуса оплаты страницы оформления (`checkout` и `server`).
 *
 * Форма — ЧИСТЫЙ РЕДЬЮСЕР `reduce(s, ev, cfg) → {s, fx}` над событиями вкладки; оболочка `start`
 * лишь исполняет эффекты (DOM, таймер, часы ожидания, fetch, sessionStorage) и подаёт события назад.
 * Вид состояния — чистая `decide(rec, obs, now, visible, cfg)`. Все числа — из cfg, выведенного
 * сервером (`offer_buy_page._status_cfg` ← relay.budget.page_poll_* и строка провайдера); все
 * фразы — ряды text-site::offer_copy, набранные сервером; имя параметра маршрута — `cfg.params`
 * (`status_channel`), ответ «ещё нет» — объявленное тело `absent` маршрута (routes.yaml), не код
 * HTTP. Здесь нет ни слова прозы и ни одного набранного срока. Спека: subsystem-access-grant.md
 * relay.budget (две фазы, ⊥ читателя, «скрытая вкладка не опрашивает»).
 *
 * События ev = {kind, at, …}: shown{key, until} · restored{rec} · returned{order, h, result} ·
 *   tick · horizon · hidden · visible (visible после hidden = ВОЗВРАТ ИЗ БАНКА) ·
 *   paid («Я оплатил(а)») · response{purpose, key, obs} · recover{input}.
 * Эффекты fx: fetch{purpose, key, hash?} · schedule{after_ms|null, event} · clock{since|null} ·
 *   render{row} · keep{rec}.
 */
(function (root) {
  'use strict';

  var POLL = 'poll', RECOVER = 'recover';
  var HEX64 = /^[0-9a-f]{64}$/i;

  function put(o, patch) { return Object.assign({}, o, patch); }

  // Конец опроса заказа = min(конец окна суммы, показ + grace) — один дом горизонта.
  function horizonOf(rec, cfg) {
    return Math.min(rec.until == null ? Infinity : rec.until, rec.shown_at + cfg.grace_ms);
  }

  // СОБЫТИЕ СТАРТА — один дом: записанное, иначе `owed` (оплата видна) есть старт «сейчас».
  function startOf(rec, obs, now) {
    return rec.started_at != null ? rec.started_at : (obs && obs.state === 'owed') ? now : null;
  }

  function own(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }

  // Чистый разбор возврата из банка (`?order=<key>&h=<64hex>&result=<success|fail>`).
  function returnQuery(search) {
    var raw = String(search == null ? '' : search).replace(/^\?/, '');
    if (!raw) return null;
    var map = raw.split('&').reduce(function (acc, part) {
      if (!part) return acc;
      var eq = part.indexOf('=');
      var k = eq >= 0 ? part.slice(0, eq) : part;
      var v = eq >= 0 ? part.slice(eq + 1) : '';
      var dec = function (s) {
        try { return decodeURIComponent(s.replace(/\+/g, ' ')); }
        catch (err) { return s; }
      };
      acc[dec(k)] = dec(v);
      return acc;
    }, {});
    var order = String(map.order || '').trim();
    var h = String(map.h || '').trim().toLowerCase();
    var hash = HEX64.test(h) ? h : '';
    var result = String(map.result || '').trim().toLowerCase();
    return (order || hash) ? {order: order, h: hash, result: result} : null;
  }

  // Формат прошедшего времени ожидания (`m:ss` или `h:mm:ss`, как часы плеера).
  function formatElapsed(ms) {
    var total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var ss = (s < 10 ? '0' : '') + s;
    if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + ss;
    return m + ':' + ss;
  }

  // Состояние чека из ответа статуса (`payment_relay.page_status::receipt`, PB1a_2).
  function receiptOf(obs) {
    var rc = obs && obs.receipt && typeof obs.receipt === 'object' ? obs.receipt : null;
    if (!rc) return null;
    if (rc.state === 'issued' && rc.url) return {state: 'issued', url: String(rc.url)};
    if (rc.state === 'pending') return {state: 'pending', url: null};
    return null;
  }

  // Вердикт ответа — ОДИН дом: {state, reason, terminal, say} | {error: 'verdict'} | null (не вердикт).
  function verdictOf(obs, cfg) {
    var row = obs && own(cfg.verdicts, obs.state) ? cfg.verdicts[obs.state] : null;
    if (!row) return null;
    var reason = obs.reason == null ? '' : String(obs.reason);
    return own(row.say, reason)
      ? {state: obs.state, reason: reason, terminal: !!row.terminal, say: row.say[reason]}
      : {error: 'verdict'};
  }

  // ФРАЗА `ready` — функция члена письма объекта (`payment_relay.page_status`): mail === false —
  // адресата нет (названо сервером) ⇒ письма не будет; иначе — общая фраза (ушло | ещё не известно).
  function readySay(obs) { return obs.mail === false ? 'ready_no_letter' : 'ready'; }

  // Фраза состояния: вердикт — по классу причины; иначе — ряд состояния.
  function sayOf(cfg, state, reason) {
    var v = verdictOf({state: state, reason: reason}, cfg);
    return v && !v.error ? v.say : (own(cfg.phrases, state) ? cfg.phrases[state] : null);
  }

  function decide(rec, seen, now, visible, cfg) {
    var vd = verdictOf(seen, cfg);
    var obs = vd && vd.error ? {error: vd.error} : seen;
    if (obs && obs.state === 'ready' && obs.url) {
      var rc = receiptOf(obs);
      var readyOut = rc ? {state: 'ready', url: obs.url, say: readySay(obs), receipt: rc}
        : {state: 'ready', url: obs.url, say: readySay(obs)};
      // PB1a_2: пока чек формируется (`receipt.state === 'pending'`), продолжаем редкий опрос до горизонта
      return rc && rc.state === 'pending' && visible && rec && now < horizonOf(rec, cfg)
        ? put(readyOut, {every_ms: cfg.every_ms.waiting})
        : readyOut;
    }
    if (rec && rec.return_result === 'fail' && obs && obs.state === 'pending') return {state: 'failed'};
    if (!rec || rec.shown_at == null) return {state: 'composing'};
    if (vd && !vd.error) {
      var v = {state: vd.state, reason: vd.reason};
      // терминальный — опрос снят; разбор — шаг ожидания до горизонта, затем тот же вид без шага
      return vd.terminal || now >= horizonOf(rec, cfg) || !visible ? v
        : put(v, {every_ms: cfg.every_ms.waiting});
    }
    var owed = !!(obs && obs.state === 'owed');
    var start = startOf(rec, obs, now);
    if (now >= horizonOf(rec, cfg)) return {state: owed ? 'owed' : 'expired'};
    var fast = start != null && now < start + cfg.late_ms;
    var state = owed ? 'owed'
      : (obs && obs.error) ? 'unreachable'
      : start == null ? 'waiting'
      : fast ? 'checking'
      // читатель объявлен ⊥ (закрытая страница): задержка ожидаема — ожидание, не тревога
      : cfg.reader === 'down' ? 'waiting' : 'late';
    var out = {state: state};
    if (visible) out.every_ms = cfg.every_ms[fast ? 'checking' : 'waiting'];
    return out;
  }

  function shownRec(rec) { return !!(rec && (rec.key || rec.hash) && rec.shown_at != null); }

  // Старт записан ровно один раз: запись без показа или с записанным стартом — та же.
  function started(rec, at) {
    return rec && rec.shown_at != null && rec.started_at == null ? put(rec, {started_at: at}) : rec;
  }

  // Точка отсчёта часов ожидания (`S5_pay`): идёт лишь при активной проверке подтверждения.
  function clockSinceOf(rec, view) {
    if (!rec || rec.started_at == null) return null;
    return (view.state === 'checking' || view.state === 'owed' || view.state === 'late')
      ? rec.started_at : null;
  }

  // ── переходы: (s, ev, cfg) → {s, poll?: хочу чтение, plan?: пересудить таймер} ─────────
  var ON = {
    shown: function (s, ev) {
      if (!ev.key) return {s: s};
      if (s.rec && s.rec.key === ev.key) {
        // тот же заказ: окно суммы продлено; живой таймер не сбивается (иначе повторный показ
        // откладывал бы опрос без конца)
        var rec = put(s.rec, {until: ev.until});
        return {s: put(s, {rec: rec}), plan: s.timer == null};
      }
      return {s: put(s, {rec: {key: ev.key, shown_at: ev.at, until: ev.until, started_at: null},
                         obs: null, left: false}), plan: true};
    },
    restored: function (s, ev) {
      return shownRec(ev.rec) ? {s: put(s, {rec: ev.rec}), poll: true, plan: true} : {s: s};
    },
    returned: function (s, ev) {
      if (!ev.order && !ev.h) return {s: s};
      var failed = ev.result === 'fail';
      // Редирект банка (`result=fail`) — не свидетель расчёта; всегда запрашиваем серверный статус.
      var rec = {key: ev.order || '', hash: ev.h || '', shown_at: ev.at, until: null,
                 started_at: failed ? null : ev.at, return_result: ev.result || ''};
      return {s: put(s, {rec: rec, obs: null, left: false}), poll: true, plan: true};
    },
    tick: function (s) { return {s: put(s, {timer: null}), poll: true, plan: true}; },
    horizon: function (s) { return {s: put(s, {timer: null}), plan: true}; },
    hidden: function (s) {
      return {s: put(s, {visible: false, left: shownRec(s.rec) || s.left}), plan: true};
    },
    visible: function (s, ev) {
      if (!shownRec(s.rec)) return {s: put(s, {visible: true})};
      // ВОЗВРАТ ИЗ БАНКА = видимость после ухода со вкладки с показанными реквизитами
      return {s: put(s, {visible: true, rec: s.left ? started(s.rec, ev.at) : s.rec}),
              poll: true, plan: true};
    },
    paid: function (s, ev) { return {s: put(s, {rec: started(s.rec, ev.at)}), poll: true, plan: true}; },
    response: function (s, ev, cfg) {
      if (ev.purpose === RECOVER) {
        var o = ev.obs || {}, vd = verdictOf(o, cfg);
        var rc = receiptOf(o);
        // вердикт есть ⇒ форма отвечает ИМ; «не видна» — только когда вердикта нет
        return {s: put(s, {recover: o.state === 'ready' && o.url
          ? put({say: readySay(o), url: o.url}, rc ? {receipt: rc} : {})
          : vd && !vd.error ? {verdict: {state: vd.state, reason: vd.reason}}
          : {say: o.error || vd ? 'unreachable' : 'recover_not_found'}})};
      }
      // ответ о ДРУГОМ заказе (вкладка показала новый ключ, пока чтение летело) — не факт этого
      if (!s.rec || (ev.key || '') !== (s.rec.key || '') || (ev.hash || '') !== (s.rec.hash || '')) {
        return {s: put(s, {inflight: false}), plan: true};
      }
      var rec = ev.obs && ev.obs.state === 'owed' ? started(s.rec, ev.at) : s.rec;
      return {s: put(s, {obs: ev.obs, rec: rec, inflight: false}), plan: true};
    },
    recover: function (s, ev, cfg) {
      var key = recoveryKey(ev.input, cfg.key);
      return key ? {s: put(s, {recover: {busy: true}}), fetch: {purpose: RECOVER, key: key}}
                 : {s: put(s, {recover: {say: 'recover_bad'}})};
    }
  };

  function init(visible) {
    return {rec: null, obs: null, visible: !!visible, left: false, inflight: false,
            timer: null, opened: null, row: null, recover: null, clock_since: null};
  }

  function rowOf(s, view, cfg) {
    var url = view.url || (s.recover && s.recover.url) || null;
    var rc = view.receipt || (s.recover && s.recover.receipt) || null;
    var rcCfg = cfg.receipt && typeof cfg.receipt === 'object' ? cfg.receipt : null;
    var rcSay = rc && rcCfg ? (rc.state === 'issued' ? rcCfg.issued : rcCfg.pending) : null;
    var confirming = !!(s.rec && s.rec.return_result === 'success' &&
      (view.state === 'checking' || view.state === 'owed' || view.state === 'waiting' || view.state === 'late'));
    return {
      box_hidden: view.state === 'composing' && !url,
      say: sayOf(cfg, view.say || view.state, view.reason),
      order_key: (s.rec && s.rec.key) || null,
      open_url: url,
      confirming: confirming,
      paid_hidden: view.state !== 'waiting',
      receipt_hidden: !(rc && rcSay),
      receipt_say: rcSay,
      receipt_url: rc && rc.url ? rc.url : null,
      recover_say: s.recover && s.recover.verdict ? sayOf(cfg, s.recover.verdict.state, s.recover.verdict.reason)
        : s.recover && s.recover.say ? cfg.phrases[s.recover.say] : null,
      recover_busy: !!(s.recover && s.recover.busy)
    };
  }

  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // Таймер = функция вида: без шага (терминал / скрыто / без записи) — снят; иначе ближний из
  // (шаг фазы, горизонт). Горизонт ближе шага — событие `horizon` (вид судится без чтения).
  function scheduleOf(s, view, at, cfg) {
    if (!view.every_ms || !s.rec) return {after_ms: null, event: null};
    var left = horizonOf(s.rec, cfg) - at;
    return view.every_ms < left ? {after_ms: view.every_ms, event: 'tick'} : {after_ms: left, event: 'horizon'};
  }

  function reduce(s, ev, cfg) {
    var t = (ON[ev.kind] || function (x) { return {s: x}; })(s, ev, cfg);
    var poll = t.poll && shownRec(t.s.rec) && !t.s.inflight
      ? (t.s.rec.hash
         ? {purpose: POLL, key: t.s.rec.key || '', hash: t.s.rec.hash}
         : {purpose: POLL, key: t.s.rec.key})
      : null;
    var n = poll ? put(t.s, {inflight: true}) : t.s;
    var view = decide(n.rec, n.obs, ev.at, n.visible, cfg);
    var sch = t.plan && !n.inflight ? scheduleOf(n, view, ev.at, cfg) : null;
    var clk = clockSinceOf(n.rec, view);
    var m = put(sch ? put(n, {timer: sch.event}) : n, {clock_since: clk});
    var row = rowOf(m, view, cfg);
    // Фокус — однократный эффект перехода «ссылки не было → есть», не поле вида.
    var focus = row.open_url && !m.opened ? {fx: 'focus'} : null;
    var fx = [poll, t.fetch].filter(Boolean).map(function (f) { return put({fx: 'fetch'}, f); }).concat(
      sch && (sch.event !== n.timer || sch.after_ms != null) ? [put({fx: 'schedule'}, sch)] : [],
      clk !== n.clock_since ? [{fx: 'clock', since: clk}] : [],
      m.rec !== s.rec && m.rec ? [{fx: 'keep', rec: m.rec}] : [],
      same(row, m.row) ? [] : [{fx: 'render', row: row}],
      focus ? [focus] : []);
    return {s: put(m, {row: row, opened: m.opened || row.open_url}), fx: fx};
  }

  function cryptoOf() { return root.crypto || (typeof globalThis !== 'undefined' && globalThis.crypto); }

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return (b < 16 ? '0' : '') + b.toString(16);
    }).join('');
  }

  // Та же формула, что `payment_statement.status_hash`: sha256_hex(prefix ⊕ order_key).
  function statusHash(prefix, key) {
    if (!prefix || !key) return Promise.reject(new Error('status_hash: empty member'));
    return cryptoOf().subtle.digest('SHA-256', new TextEncoder().encode(String(prefix) + String(key))).then(hex);
  }

  // Проверка ФОРМАТА кода из назначения (префикс, разделитель, длина, алфавит) — и только.
  function recoveryKey(s, K) {
    var head = K.ref + K.sep, n = head.length + K.length;
    function ok(k) {
      return k.indexOf(head) === 0 && k.length === n &&
        Array.prototype.every.call(k.slice(head.length), function (c) { return K.alphabet.indexOf(c) >= 0; });
    }
    // Назначение может нести метку промокода после ключа (`ключ⊕sep⊕метка`) — ключ есть голова.
    function headOf(t) {
      return t.length === n || (t.length > n && t.substr(n, K.sep.length) === K.sep && K.sep) ? t.slice(0, n) : '';
    }
    var t = String(s == null ? '' : s).trim();
    return [headOf(t), headOf(t.toUpperCase())].filter(ok)[0] || null;
  }

  // Ответ маршрута = его тело, если оно несёт состояние (живой ключ или объявленное `absent`
  // маршрута); всё иное (404 «нет маршрута», не-JSON) — ⊥ читателя, а не «ещё нет».
  function readBody(body) { return body && typeof body.state === 'string' ? body : {error: 'http'}; }

  // ОДНО чтение статуса — и для живого опроса, и для возврата по хэшу, и для ввода кода.
  function check(cfg, key, fetchFn, directHash) {
    var slot = (cfg.params || []).length === 1 ? '{' + cfg.params[0] + '}' : null;
    if (!slot) return Promise.resolve({error: 'params'});
    var hashP = key ? statusHash(cfg.prefix, key)
      : (directHash && HEX64.test(String(directHash)) ? Promise.resolve(String(directHash).toLowerCase())
         : Promise.reject(new Error('status_hash: empty member')));
    return hashP.then(function (h) {
      return (fetchFn || root.fetch)(cfg.url.split(slot).join(h), {cache: 'no-store'});
    }).then(function (r) {
      return r.json().then(readBody, function () { return {error: 'http'}; });
    }).catch(function () { return {error: 'network'}; });
  }

  // ── оболочка эффектов ──────────────────────────────────────────────────────────────
  function start(cfg, doc) {
    // imperative: io — единственная оболочка эффектов (DOM, таймер, часы, fetch, sessionStorage вкладки) и одна ячейка состояния `s`; всякое решение — `reduce`
    doc = doc || root.document;
    function $(id) { return doc.getElementById(id); }
    var box = $('pay-status'), say = $('pay-status-say'), orderEl = $('pay-status-order'), open = $('pay-status-open');
    var sform = $('checkout-server-form');
    var paid = $('pay-status-paid'), elapsed = $('pay-status-elapsed');
    var rcBox = $('pay-status-receipt'), rcSay = $('pay-status-receipt-say'), rcLink = $('pay-status-receipt-link');
    var form = $('pay-status-recover'), ref = $('pay-status-ref'), rsay = $('pay-status-recover-say');
    var btn = form && form.querySelector('button');
    var home = root.location.pathname + '#status';
    function visible() { return doc.visibilityState !== 'hidden'; }
    var s = init(visible()), timer = null, clockTimer = null;

    var RUN = {
      fetch: function (f) {
        check(cfg, f.key, null, f.hash).then(function (o) {
          dispatch({kind: 'response', purpose: f.purpose, key: f.key, hash: f.hash, obs: o});
        });
      },
      schedule: function (f) {
        if (timer) root.clearTimeout(timer);
        timer = f.after_ms == null ? null
          : root.setTimeout(function () { timer = null; dispatch({kind: f.event}); }, f.after_ms);
      },
      clock: function (f) {
        if (clockTimer) { root.clearInterval(clockTimer); clockTimer = null; }
        if (!elapsed) return;
        if (f.since == null || !cfg.elapsed_tpl) {
          elapsed.hidden = true;
          elapsed.textContent = '';
          return;
        }
        function paint() { elapsed.textContent = cfg.elapsed_tpl.replace('{time}', formatElapsed(Date.now() - f.since)); }
        elapsed.hidden = false;
        paint();
        clockTimer = root.setInterval(paint, 1000);
      },
      focus: function () { if (open) open.focus(); },
      keep: function (f) { try { root.sessionStorage.setItem(home, JSON.stringify(f.rec)); } catch (e) {} },
      render: function (f) {
        var row = f.row;
        if (box) box.hidden = row.box_hidden;
        if (say && row.say != null) say.textContent = row.say;
        if (orderEl) {
          if (row.order_key && cfg.order_tpl) {
            orderEl.textContent = cfg.order_tpl.replace('{order}', row.order_key);
            orderEl.hidden = false;
          } else {
            orderEl.hidden = true;
          }
        }
        if (open && row.open_url) { open.href = row.open_url; open.hidden = false; }
        if (sform) sform.hidden = !!row.open_url || !!row.confirming;
        if (paid) paid.hidden = row.paid_hidden;
        if (rcBox) rcBox.hidden = row.receipt_hidden;
        if (rcSay && row.receipt_say != null) rcSay.textContent = row.receipt_say;
        if (rcLink) {
          if (row.receipt_url) { rcLink.href = row.receipt_url; rcLink.hidden = false; }
          else rcLink.hidden = true;
        }
        if (rsay && row.recover_say != null) rsay.textContent = row.recover_say;
        if (btn) btn.disabled = row.recover_busy;
      }
    };
    function dispatch(ev) {
      var r = reduce(s, put({at: Date.now()}, ev), cfg);
      s = r.s;
      r.fx.forEach(function (f) { RUN[f.fx](f); });
    }
    function load() { try { return JSON.parse(root.sessionStorage.getItem(home) || 'null'); } catch (e) { return null; } }

    doc.addEventListener('visibilitychange', function () { dispatch({kind: visible() ? 'visible' : 'hidden'}); });
    if (paid) paid.addEventListener('click', function () { dispatch({kind: 'paid'}); });
    if (form && ref) form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      dispatch({kind: 'recover', input: ref.value});
    });
    var rq = returnQuery(root.location && root.location.search);
    if (rq) dispatch({kind: 'returned', order: rq.order, h: rq.h, result: rq.result});
    else dispatch({kind: 'restored', rec: load()});
    // Реквизиты ПОКАЗАНЫ (или заказ создан на сервере): заказ вкладки рождён или продолжен.
    return {shown: function (key, until) { dispatch({kind: 'shown', key: key, until: until}); }};
  }

  var api = {decide: decide, reduce: reduce, init: init, statusHash: statusHash, verdictOf: verdictOf,
             recoveryKey: recoveryKey, returnQuery: returnQuery, formatElapsed: formatElapsed,
             receiptOf: receiptOf, check: check, start: start};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    // ИМЯ ГЛОБАЛА — атрибут `data-api` своего тега (дом: offer_buy_page._STATUS_API), не литерал здесь.
    var me = root.document && root.document.currentScript;
    var name = me && me.getAttribute('data-api');
    if (!name) throw new Error('pay_status: script tag lacks required data-api attribute');
    root[name] = api;
  }
})(typeof window !== 'undefined' ? window : this);
