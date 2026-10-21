/* US ZIP weather. No account, private defaults, or API key in shared source. */
(function () {
  'use strict';
  var KEY = 'cleanframe.weather.v1', CACHE = KEY + '.cache', cfg = { zip: '', unit: 'fahrenheit' };
  var data = null, error = '', busy = false, generation = 0, timer = 0, notify = function () {};
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function valid(c) { return c && /^\d{5}$/.test(c.zip) && ['fahrenheit', 'celsius'].indexOf(c.unit) >= 0; }
  function request(url, done) {
    var xhr = new XMLHttpRequest(), ended = false;
    function finish(err, value) { if (ended) return; ended = true; done(err, value); }
    xhr.open('GET', url, true); xhr.timeout = 12000;
    xhr.onload = function () { try { if (xhr.status !== 200) throw Error('Weather service unavailable'); finish(null, JSON.parse(xhr.responseText)); } catch (e) { finish(e); } };
    xhr.onerror = xhr.ontimeout = function () { finish(Error('Weather connection unavailable')); };
    try { xhr.send(); } catch (e) { finish(e); }
  }
  function condition(code) {
    if (code === 0) return 'Clear'; if (code <= 2) return 'Partly cloudy'; if (code === 3) return 'Cloudy';
    if (code <= 48) return 'Fog'; if (code <= 57) return 'Drizzle'; if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow'; if (code <= 82) return 'Showers'; if (code <= 86) return 'Snow showers'; return 'Thunderstorms';
  }
  function refresh() {
    clearTimeout(timer);
    if (!valid(cfg) || document.hidden) return;
    var token = ++generation, zip = cfg.zip, unit = cfg.unit; busy = true; error = ''; notify();
    function finish(err, result) {
      if (token !== generation) return;
      busy = false; error = err ? err.message : '';
      if (result) { data = result; try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch (e) {} }
      notify(); timer = setTimeout(refresh, err ? 60000 : 900000);
    }
    request('https://geocoding-api.open-meteo.com/v1/search?name=' + zip + '&count=10&countryCode=US&language=en&format=json', function (err, geo) {
      if (token !== generation) return;
      if (err) { finish(err); return; }
      var place = (geo.results || []).filter(function (p) { return p.country_code === 'US' && (p.postcodes || []).indexOf(zip) >= 0; })[0];
      if (!place) { finish(Error('ZIP code not found. Check Settings.')); return; }
      request('https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude + '&longitude=' + place.longitude + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=' + unit + '&timezone=auto&forecast_days=1', function (err, result) {
        if (err) { finish(err); return; }
        var c = result && result.current, d = result && result.daily;
        if (!c || !d || typeof c.temperature_2m !== 'number' || typeof c.weather_code !== 'number' || !d.temperature_2m_max || typeof d.temperature_2m_max[0] !== 'number' || !d.temperature_2m_min || typeof d.temperature_2m_min[0] !== 'number') { finish(Error('Weather temporarily unavailable')); return; }
        finish(null, { zip: zip, unit: unit, place: place.name, temp: c.temperature_2m, code: c.weather_code, high: d.temperature_2m_max[0], low: d.temperature_2m_min[0], time: Date.now() });
      });
    });
  }
  function summary() {
    if (!valid(cfg)) return '';
    var usable = data && data.zip === cfg.zip && data.unit === cfg.unit && Date.now() - data.time < 7200000;
    if (!usable) return '<div class="weather-caption weather-muted">' + (busy ? 'Loading weather…' : 'Weather unavailable') + '</div>';
    var stale = !!error || Date.now() - data.time > 1800000;
    return '<div class="weather-caption"><span>' + Math.round(data.temp) + '°' + (cfg.unit === 'fahrenheit' ? 'F' : 'C') + ' · ' + condition(data.code) + '</span><small>' + esc(data.place) + ' · H ' + Math.round(data.high) + '° / L ' + Math.round(data.low) + '°' + (stale ? ' · Updated ' + Math.round((Date.now() - data.time) / 60000) + 'm ago' : '') + '</small></div>';
  }
  function open() { return { id: 'weather', f: { i: 0 }, zip: cfg.zip, unit: cfg.unit, error: '' }; }
  var labels = ['1','2','3','4','5','6','7','8','9','Delete','0','Clear','Fahrenheit','Celsius','Save','Turn off','Back'];
  function activate(t) {
    var i = t.f.i;
    if (i < 9 || i === 10) { if (t.zip.length < 5) t.zip += labels[i]; }
    else if (i === 9) t.zip = t.zip.slice(0, -1);
    else if (i === 11) t.zip = '';
    else if (i === 12 || i === 13) t.unit = i === 12 ? 'fahrenheit' : 'celsius';
    else if (i === 16) return true;
    else {
      var next = { zip: i === 15 ? '' : t.zip, unit: t.unit };
      if (i === 14 && !valid(next)) { t.error = 'Enter a five-digit US ZIP code.'; return false; }
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { t.error = 'Could not save. Please try again.'; return false; }
      cfg = next; generation++; clearTimeout(timer); data = null; error = ''; busy = false; refresh(); return true;
    }
    t.error = ''; return false;
  }
  function key(t, k) {
    if (k === 'back') return true;
    if (k === 'left' && t.f.i % 3) t.f.i--;
    if (k === 'right' && t.f.i % 3 < 2) t.f.i = Math.min(16, t.f.i + 1);
    if (k === 'up') t.f.i = Math.max(0, t.f.i - 3);
    if (k === 'down') t.f.i = Math.min(16, t.f.i + 3);
    if (k === 'ok') return activate(t);
    return false;
  }
  function html(t) {
    return '<h2 class="s-title">Weather</h2><p class="s-sub">US ZIP code · ' + esc(t.zip || '_____') + ' · ' + (t.unit === 'fahrenheit' ? '°F' : '°C') + '</p><div class="weather-keypad">' + labels.map(function (label, i) {
      return '<button tabindex="-1" class="btn' + (i === t.f.i ? ' is-focus' : '') + '" data-z="weather" data-i="' + i + '" data-action="weather.' + i + '">' + label + '</button>';
    }).join('') + '</div><p class="weather-note">' + esc(t.error || error || 'Choose digits with the arrows and OK, then Save.') + '</p><p class="weather-credit">Weather data: Open-Meteo · Location search: GeoNames<br>Saving sends your ZIP code to Open-Meteo to find local weather.</p>';
  }
  window.FrameWeather = { open: open, key: key, html: html, summary: summary, refresh: refresh, config: function () { return {zip: cfg.zip, unit: cfg.unit}; }, init: function (callback) {
    notify = callback;
    var saved = read(KEY), defaults = (window.CleanFrameLocal || {}).weather;
    cfg = saved && (valid(saved) || saved.zip === '') ? saved : valid(defaults) ? defaults : cfg;
    var cached = read(CACHE); if (cached && typeof cached.temp === 'number' && typeof cached.high === 'number' && typeof cached.low === 'number' && typeof cached.code === 'number' && typeof cached.time === 'number') data = cached;
    document.addEventListener('visibilitychange', function () { if (document.hidden) { generation++; busy = false; clearTimeout(timer); } else refresh(); });
    refresh();
  }};
}());
