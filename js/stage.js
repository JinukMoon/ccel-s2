/* CCEL candidate s2-chapters: the research stage.
   Native scroll only. Each research area I-V is a chapter; its frame sequence (manifest key area_<numeral>)
   is drawn on a <canvas> according to how far the reader has scrolled through that chapter.
   - split (>= 960px): one pinned navy figure column for the whole stage, two layers that cross-fade
     when the chapter changes; chapter panels pin one after another beside it.
   - stack (< 960px): every chapter has its own short sticky figure that scrubs its own sequence.
   - still (prefers-reduced-motion): posters only, no scrubbing, no pinning.
   Counts, sizes, folders, file pattern and posters all come from _shared/scroll/manifest.json. */
(function () {
  'use strict';
  const BASE = '_shared/scroll/';
  const mq = {
    reduce: matchMedia('(prefers-reduced-motion: reduce)'),
    split: matchMedia('(min-width: 960px)'),
    small: matchMedia('(max-width: 767.98px)')     // brief: mobile frame set under 768px
  };
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

  function frameName(man, i) {
    const n = i + (man.index_base || 0);
    return (man.pattern || 'f_{index:03d}.webp')
      .replace(/\{index(?::0?(\d+)d)?\}/, (_, w) => String(n).padStart(+w || 0, '0'));
  }

  // every 8th frame first (plus the last), then every 4th, every 2nd, then the rest
  function progressiveOrder(n) {
    const seen = new Uint8Array(n), out = [];
    const take = i => { if (i >= 0 && i < n && !seen[i]) { seen[i] = 1; out.push(i); } };
    [8, 4, 2, 1].forEach((step, pass) => {
      for (let i = 0; i < n; i += step) take(i);
      if (pass === 0) take(n - 1);
    });
    return out;
  }

  function Sequence(man, key, small) {
    const spec = man.sequences[key];
    const set = small && spec.mobile ? spec.mobile : spec;
    this.man = man; this.key = key; this.small = small;
    this.dir = set.dir; this.count = set.count;
    this.poster = spec.poster ? BASE + spec.poster : '';
    this.frames = new Array(this.count);
    this.order = progressiveOrder(this.count);
    this.cursor = 0;
    this.listeners = new Set();
  }
  Sequence.prototype.url = function (i) { return BASE + this.dir + '/' + frameName(this.man, i); };
  Sequence.prototype.nearest = function (i) {
    if (this.frames[i]) return i;
    for (let d = 1; d < this.count; d++) {
      if (i - d >= 0 && this.frames[i - d]) return i - d;
      if (i + d < this.count && this.frames[i + d]) return i + d;
    }
    return -1;
  };

  // A handful of requests at a time; the sequence of the chapter being read goes first.
  const Loader = {
    queue: [], busy: 0, max: 4,
    want(seq, urgent) {
      if (!seq || seq.cursor >= seq.order.length) return;
      const at = this.queue.indexOf(seq);
      if (at < 0) urgent ? this.queue.unshift(seq) : this.queue.push(seq);
      else if (urgent && at > 0) { this.queue.splice(at, 1); this.queue.unshift(seq); }
      this.pump();
    },
    retain(keep) { this.queue = this.queue.filter(keep); },
    pump() {
      while (this.busy < this.max && this.queue.length) {
        const seq = this.queue[0];
        if (seq.cursor >= seq.order.length) { this.queue.shift(); continue; }
        const i = seq.order[seq.cursor++];
        const im = new Image();
        im.decoding = 'async';
        this.busy++;
        const done = ok => {
          this.busy--;
          if (ok) { seq.frames[i] = im; seq.listeners.forEach(f => f(i)); }
          this.pump();
        };
        im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => done(true));
        im.onerror = () => done(false);
        im.src = seq.url(i);
      }
    }
  };

  // Draws the nearest loaded frame, cover-fit, only when the frame index (or canvas size) changes.
  function Renderer(canvas, onFrame) {
    this.c = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.seq = null; this.p = 0; this.drawn = -1;
    this.onFrame = onFrame;
  }
  Renderer.prototype.setSeq = function (seq) {
    if (this.seq === seq) return;
    if (this.seq) this.seq.listeners.delete(this.onFrame);
    this.seq = seq; this.drawn = -1;
    if (seq) seq.listeners.add(this.onFrame);
    if (this.ctx) this.ctx.clearRect(0, 0, this.c.width, this.c.height);
  };
  Renderer.prototype.resize = function () {
    if (!this.c) return;
    const r = this.c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (w !== this.c.width || h !== this.c.height) { this.c.width = w; this.c.height = h; this.drawn = -1; }
  };
  Renderer.prototype.setProgress = function (p) {
    this.p = p;
    const s = this.seq;
    if (!s || !this.ctx || !this.c.width) return;
    const i = s.nearest(Math.round(clamp01(p) * (s.count - 1)));
    if (i < 0 || i === this.drawn) return;
    const img = s.frames[i], cw = this.c.width, ch = this.c.height;
    const k = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    this.drawn = i;
  };

  const Stage = {
    init(root, keys, titles) {
      this.root = root; this.keys = keys; this.titles = titles;
      this.chapters = Array.from(root.querySelectorAll('.chapter'));
      this.panels = this.chapters.map(c => c.querySelector('.ch-panel'));
      this.figs = this.chapters.map(c => c.querySelector('.ch-fig'));
      this.navs = Array.from(root.querySelectorAll('.chapter-nav')).map(n => Array.from(n.querySelectorAll('a')));
      this.pin = root.querySelector('.stage-pin');
      this.caption = root.querySelector('.stage-caption');
      const redraw = () => this.request();
      this.layers = Array.from(root.querySelectorAll('.stage-plate .layer')).map(el => ({
        el, img: el.querySelector('img'), r: new Renderer(el.querySelector('canvas'), redraw), k: -1
      }));
      this.front = 0;
      this.chR = this.figs.map(f => new Renderer(f.querySelector('canvas'), redraw));
      this.near = this.chapters.map(() => false);
      this.cache = {};
      this.active = -1;
      this.man = null;

      this.applyMode();
      const mp = window.CCEL_MANIFEST || fetch(BASE + 'manifest.json').then(r => (r.ok ? r.json() : null));
      Promise.resolve(mp).then(man => { if (man && man.sequences) this.onManifest(man); }).catch(() => { /* text and layout stay; no frames */ });

      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => es.forEach(e => {
          if (!e.isIntersecting) return;
          const i = this.chapters.indexOf(e.target);
          this.near[i] = true;
          if (this.scrubbing()) Loader.want(this.seq(i), i === this.active);
        }), { rootMargin: '50% 0px 50% 0px' });   // start a chapter's frames half a screen before it arrives
        this.chapters.forEach(c => io.observe(c));
      } else {
        this.near = this.near.map(() => true);
      }

      addEventListener('scroll', () => this.request(), { passive: true });
      let rz = 0;
      addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { this.measure(); this.request(); }); });
      Object.values(mq).forEach(m => m.addEventListener ? m.addEventListener('change', () => this.applyMode()) : m.addListener(() => this.applyMode()));
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.measure(); this.request(); });
      addEventListener('load', () => { this.measure(); this.request(); }, { once: true });
    },

    onManifest(man) {
      this.man = man;
      const first = man.sequences[this.keys[0]];
      if (first && first.width && first.height) this.root.style.setProperty('--plate-ar', (first.width / first.height).toFixed(4));
      // posters: the still figure of each chapter (stack / reduced motion); lazy, so hidden ones never load
      this.figs.forEach((f, i) => {
        const spec = man.sequences[this.keys[i]];
        const im = f.querySelector('img');
        if (spec && spec.poster && im) { im.loading = 'lazy'; im.src = BASE + spec.poster; }
      });
      this.measure();
      this.active = -1;   // re-run setFront now that posters and sequences exist
      this.layers.forEach(L => { L.k = -1; });
      this.near.forEach((n, i) => { if (n && this.scrubbing()) Loader.want(this.seq(i), false); });
      this.request();
    },

    mode() { return mq.reduce.matches ? 'still' : mq.split.matches ? 'split' : 'stack'; },
    scrubbing() { return !!this.man && this.m !== 'still'; },

    seq(i) {
      if (!this.man) return null;
      const key = this.keys[i];
      if (!this.man.sequences[key]) return null;
      const id = key + (this.small ? ':m' : '');
      return this.cache[id] || (this.cache[id] = new Sequence(this.man, key, this.small));
    },

    applyMode() {
      const m = this.mode(), small = mq.small.matches;
      const changed = m !== this.m || small !== this.small;
      this.m = m; this.small = small;
      document.documentElement.dataset.stage = m;
      if (changed) {
        Loader.retain(s => s.small === small && m !== 'still');
        this.layers.forEach(L => { L.r.setSeq(null); L.k = -1; L.img.removeAttribute('src'); L.el.classList.remove('is-front'); });
        this.chR.forEach(r => r.setSeq(null));
        this.active = -1;
        if (this.scrubbing()) this.near.forEach((n, i) => { if (n) Loader.want(this.seq(i), false); });
      }
      this.measure();
      this.request();
    },

    measure() {
      const rs = getComputedStyle(document.documentElement);
      this.barH = parseFloat(rs.getPropertyValue('--bar-h')) || 0;
      this.mbarH = parseFloat(rs.getPropertyValue('--mbar-h')) || 0;
      if (this.m === 'split' && this.pin) {
        // plate: as large as the column allows while nav + caption still fit in the pinned height
        const cs = getComputedStyle(this.pin);
        const innerW = this.pin.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const fixed = Array.from(this.pin.children).filter(c => !c.classList.contains('stage-plate'))
          .reduce((h, c) => h + c.offsetHeight, 0);
        const gaps = parseFloat(cs.rowGap || cs.gap) * (this.pin.children.length - 1) || 0;
        const innerH = this.pin.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - fixed - gaps;
        const ar = parseFloat(this.root.style.getPropertyValue('--plate-ar')) || 1;
        this.pin.style.setProperty('--plate-w', Math.max(160, Math.floor(Math.min(innerW, innerH * ar))) + 'px');
        // panels: centred against the plate; a panel taller than the screen sticks by its bottom edge instead
        const avail = innerHeight - this.barH;
        this.panels.forEach(p => {
          const h = p.offsetHeight;
          const top = h <= avail - 32 ? this.barH + Math.max(16, (avail - h) / 2) : innerHeight - h - 16;
          p.style.top = Math.round(top) + 'px';
        });
      } else {
        this.panels.forEach(p => { p.style.top = ''; });
      }
      this.layers.forEach(L => L.r.resize());
      this.chR.forEach(r => r.resize());
    },

    request() {
      if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.update(); });
    },

    update() {
      if (!this.chapters.length) return;
      const vh = innerHeight;
      const rects = this.chapters.map(c => c.getBoundingClientRect());
      // nothing to do (and nothing to load) while the stage is more than half a screen away
      if (rects[0].top > 1.5 * vh || rects[rects.length - 1].bottom < -vh) return;
      let k = 0, p = 0;
      if (this.m === 'split') {
        const line = vh / 2;
        if (line >= rects[0].top) {
          rects.forEach((r, i) => { if (line >= r.top) k = i; });
          p = clamp01((line - rects[k].top) / rects[k].height);
        }
        this.setFront(k);
        if (this.scrubbing()) this.layers[this.front].r.setProgress(p);
      } else {
        const top = this.barH + (this.m === 'stack' ? this.mbarH : 0);
        rects.forEach((r, i) => {
          const figH = this.figs[i].offsetHeight;
          const pi = clamp01((top - r.top) / Math.max(1, r.height - figH));
          if (r.top <= top + figH) { k = i; p = pi; }   // active once its text has reached the figure
          if (this.m === 'stack' && this.scrubbing() && r.bottom > 0 && r.top < vh) {
            const s = this.seq(i);
            this.chR[i].setSeq(s);
            if (s && this.near[i]) Loader.want(s, i === k);
            this.chR[i].setProgress(pi);
          }
        });
      }
      this.setNav(k, p);
    },

    setFront(k) {
      if (k === this.active) return;
      this.active = k;
      const seq = this.seq(k);
      const F = this.layers[this.front];
      if (F && F.k !== k) {
        const B = this.layers[1 - this.front];
        if (B.k !== k) {
          B.k = k;
          const spec = this.man && this.man.sequences[this.keys[k]];
          if (spec && spec.poster) B.img.src = BASE + spec.poster; else B.img.removeAttribute('src');
          B.r.setSeq(this.scrubbing() ? seq : null);
          B.r.resize();
        }
        B.el.classList.add('is-front');
        F.el.classList.remove('is-front');
        this.front = 1 - this.front;
      } else if (F) {
        F.el.classList.add('is-front');
      }
      if (seq && this.scrubbing() && this.near[k]) Loader.want(seq, true);
      if (this.caption) this.caption.innerHTML = this.titles[k];
    },

    setNav(k, p) {
      if (k !== this.navK) {
        this.navK = k;
        this.navs.forEach(links => links.forEach((a, i) => {
          if (i === k) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
          a.classList.toggle('is-done', i < k);
        }));
      }
      const v = p.toFixed(3);
      if (v !== this.navP) { this.navP = v; this.navs.forEach(links => links[k] && links[k].style.setProperty('--p', v)); }
    }
  };

  window.Stage = Stage;
})();
