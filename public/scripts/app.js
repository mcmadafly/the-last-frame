(function() {
  /** @type {{ githubRepoUrl?: string }} — fallback if JSON missing */
  const SITE = { GITHUB_FALLBACK: 'https://github.com/mcmadafly/the-last-frame' };
  const DATA_URL = '/data/films.json';
  const SUBSCRIBE_URL = '/api/subscribe';

  function filmYear(f) {
    const blob = ((f.cardDate || '') + ' ' + (f.releaseLabel || '')).match(/\d{4}/);
    return blob ? blob[0] : '';
  }

  function truncateMeta(s, n) {
    if (!s) return '';
    s = String(s).replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, n - 1).trim() + '…';
  }

  function setMeta(id, attr, val) {
    var el = document.getElementById(id);
    if (el && val != null && val !== '') el.setAttribute(attr, val);
  }

  function applySeo(site, featured) {
    if (!site) site = {};
    var base = (site.url || '').replace(/\/$/, '') || window.location.origin;
    var pageTitle = (featured && featured.title ? featured.title + ' · ' : '') + (site.name || 'The Last Frame');
    document.title = pageTitle;

    var desc =
      featured && String(featured.synopsis || '').trim().length > 40
        ? truncateMeta(featured.synopsis, 158)
        : truncateMeta(site.description || '', 158);
    var ogTitle = (featured && featured.title ? featured.title + ' — ' : '') + (site.name || 'The Last Frame');
    var img = featured && (featured.backdrop || featured.poster) ? String(featured.backdrop || featured.poster) : '';

    setMeta('meta-description', 'content', desc);
    setMeta('canonical-link', 'href', base + '/');
    setMeta('og-title', 'content', ogTitle);
    setMeta('og-description', 'content', desc);
    setMeta('og-url', 'content', base + '/');
    setMeta('og-image', 'content', img);
    setMeta('tw-title', 'content', ogTitle);
    setMeta('tw-description', 'content', desc);
    setMeta('tw-image', 'content', img);

    var ld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: site.name || 'The Last Frame',
          description: site.description || '',
          url: base + '/'
        }
      ]
    };
    if (featured && featured.title) {
      ld['@graph'].push({
        '@type': 'Movie',
        name: featured.title,
        description: featured.synopsis || '',
        image: featured.poster || featured.backdrop || undefined,
        genre: (featured.genres || []).map(function(g) {
          return g === 'sci-fi' ? 'Science Fiction' : 'Horror';
        })
      });
    }
    var jel = document.getElementById('jsonld-block');
    if (jel) jel.textContent = JSON.stringify(ld);
  }

  function esc(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function tagHtml(tag) {
    if (tag.variant === 'amber') {
      return '<span class="h-tag" style="border-color:rgba(232,160,48,.5);color:var(--amber)">' + esc(tag.text) + '</span>';
    }
    return '<span class="h-tag">' + esc(tag.text) + '</span>';
  }

  function renderHero(f, heroBg, root, posterRoot) {
    const h = f.hero;
    const backdrop = f.backdrop || (f.poster && f.poster.replace('/w500/', '/w1280/'));
    if (backdrop && heroBg) {
      heroBg.style.setProperty('--hero-backdrop', 'url("' + backdrop.replace(/"/g, '') + '")');
    }
    if (heroBg) {
      var yHero = filmYear(f);
      heroBg.setAttribute(
        'aria-label',
        'Cinematic backdrop from ' + f.title + (yHero ? ' (' + yHero + ')' : '')
      );
    }
    root.innerHTML =
      '<div class="eyebrow">' +
        '<div class="badge">' + esc(h.badge) + '</div>' +
        '<span class="studio-lbl">' + esc(f.studio) + '</span>' +
      '</div>' +
      '<h1 class="hero-title" id="hero-feature-title">' + esc(h.titleMain) + '<em>' + esc(h.titleEm) + '</em></h1>' +
      '<div class="hero-meta">' +
        '<span class="h-year">' + esc(h.metaLine) + '</span>' +
        (h.tags && h.tags.length
          ? h.tags.map(function(t) {
              return '<div class="h-dot"></div>' + tagHtml({ text: t.text, variant: t.variant });
            }).join('')
          : '') +
      '</div>' +
      '<p class="hero-syn">' + esc(f.synopsis) + '</p>' +
      '<div class="hero-cta">' +
        '<a href="' +
        esc(h.primaryCta.href) +
        '" class="btn-p"' +
        (h.primaryCta && h.primaryCta.newsletter ? ' data-newsletter' : '') +
        '>' +
        esc(h.primaryCta.label) +
        '</a>' +
        '<a href="' + esc(h.secondaryCta.href) + '" class="btn-g">' + esc(h.secondaryCta.label) + '</a>' +
      '</div>';

    var yP = filmYear(f);
    var altText = esc(f.title + (yP ? ' (' + yP + ')' : '') + ' theatrical poster');
    const imgUrl = f.poster || '';
    posterRoot.innerHTML =
      '<div class="hero-poster">' +
        (imgUrl
          ? '<img src="' + esc(imgUrl) + '" alt="' + altText + '" width="500" height="750" decoding="async" fetchpriority="high" style="width:100%;height:100%;object-fit:cover;display:block;">'
          : '<div style="width:100%;height:100%;background:#0c0c10;"></div>') +
        '<div class="pc pc-tl"></div><div class="pc pc-tr"></div>' +
        '<div class="pc pc-bl"></div><div class="pc pc-br"></div>' +
      '</div>';
  }

  function cardMatches(f, key) {
    const d = (f.cardDate || '') + ' ' + (f.releaseLabel || '');
    if (key === 'all') return true;
    if (key === 'horror') return f.genres && f.genres.indexOf('horror') >= 0;
    if (key === 'sci-fi') return f.genres && f.genres.indexOf('sci-fi') >= 0;
    if (key === 'a24') return f.studio === 'A24';
    if (key === 'neon') return f.studio === 'Neon';
    if (key === 'y2025') return d.indexOf('2025') >= 0;
    if (key === 'y2026') return d.indexOf('2026') >= 0;
    if (key === 'upcoming') return !!f.upcoming;
    return true;
  }

  function renderGrid(films, grid, filterKey) {
    const list = films.filter(function(f) { return f.inGrid && cardMatches(f, filterKey); });
    const frag = document.createDocumentFragment();
    list.forEach(function(f, index) {
      const delay = (Math.min(16, index + 1) * 0.03).toFixed(2);
      const isH = f.genres && f.genres.indexOf('horror') >= 0;
      const pill = isH
        ? '<span class="gpill h">Horror</span>'
        : '<span class="gpill s">Sci-Fi</span>';
      const uflag = f.upcoming ? '<span class="uflag">Upcoming</span>' : '';
      let posterInner;
      if (f.poster) {
        var yG = filmYear(f);
        var altG = esc(f.title + (yG ? ' (' + yG + ')' : '') + ' movie poster');
        posterInner =
          '<img class="poster-svg" src="' +
          esc(f.poster) +
          '" alt="' +
          altG +
          '" width="500" height="750" loading="lazy" decoding="async">';
      } else {
        posterInner = '<div class="poster-svg" style="display:flex;align-items:center;justify-content:center;background:#0c0c10;"><span style="font-size:9px;letter-spacing:.15em;color:#3a3835;text-transform:uppercase">Poster TBA</span></div>';
      }
      const wrap = document.createElement('div');
      wrap.className = 'card';
      wrap.setAttribute('data-genres', (f.genres || []).join(','));
      wrap.setAttribute('data-filter-studio', (f.studio || '').toLowerCase());
      wrap.style.animationDelay = delay + 's';
      wrap.innerHTML =
        '<div class="poster-wrap">' +
          posterInner +
          '<div class="cov"><span>View Film</span></div>' +
          pill +
          uflag +
        '</div>' +
        '<div class="card-info">' +
          '<div class="cs">' + esc(f.studio) + '</div>' +
          '<div class="ct">' + esc(f.title) + '</div>' +
          '<div class="cd">' + esc(f.cardDate || f.releaseLabel || '') + '</div>' +
        '</div>';
      frag.appendChild(wrap);
    });
    grid.textContent = '';
    grid.appendChild(frag);
  }

  function renderUpcoming(films, el) {
    const rows = films
      .filter(function(f) { return f.inUpcoming; })
      .sort(function(a, b) { return (a.upcomingIndex || 99) - (b.upcomingIndex || 99); });
    const frag = document.createDocumentFragment();
    rows.forEach(function(f, i) {
      const num = String(i + 1).padStart(2, '0');
      const row = document.createElement('div');
      row.className = 'up-item';
      row.innerHTML =
        '<div class="un">' + num + '</div>' +
        '<div class="ui"><div class="ut">' + esc(f.title) + '</div><div class="us">' + esc(f.upcomingDetail || '') + '</div></div>' +
        '<div class="ur"><div class="ud">' + esc(f.cardDate || f.releaseLabel || '') + '</div><span class="ust">' + esc(f.studio) + '</span></div>';
      frag.appendChild(row);
    });
    el.textContent = '';
    el.appendChild(frag);
  }

  function renderTicker(films, track) {
    const items = films.filter(function(f) { return f.ticker; });
    const parts = items.map(function(f) {
      return '<span class="ti">' + esc(f.title) + ' — ' + esc(f.studio) + '</span><span class="ts">◆</span>';
    });
    const line = parts.join('');
    track.innerHTML = line + line;
  }

  function wireFilters(films, grid) {
    const buttons = document.querySelectorAll('#film-filters .fb');
    let current = 'all';
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        current = btn.getAttribute('data-filter') || 'all';
        buttons.forEach(function(b) { b.classList.remove('on'); });
        btn.classList.add('on');
        renderGrid(films, grid, current);
        observeCards();
      });
    });
  }

  var io;
  function observeCards() {
    if (!io) {
      io = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          if (e.isIntersecting) e.target.style.animationPlayState = 'running';
        });
      }, { threshold: 0.07 });
    }
    document.querySelectorAll('#film-grid .card').forEach(function(c) { io.observe(c); });
  }

  fetch(DATA_URL)
    .then(function(r) { if (!r.ok) throw new Error('data'); return r.json(); })
    .then(function(data) {
      const films = data.films || [];
      const id = data.featuredId;
      const featured = films.find(function(f) { return f.id === id; }) || films.find(function(f) { return f.hero; }) || films[0];
      if (!featured || !featured.hero) {
        const heroRoot = document.getElementById('hero-root');
        if (heroRoot) heroRoot.textContent = 'No featured film in data.';
        return;
      }
      applySeo(data.site, featured);
      renderHero(
        featured,
        document.getElementById('hero-bg'),
        document.getElementById('hero-root'),
        document.getElementById('hero-poster-root')
      );

      const gh = data.githubRepoUrl || SITE.GITHUB_FALLBACK;
      const gl = document.getElementById('github-source-link');
      if (gl) { gl.href = gh; }

      const grid = document.getElementById('film-grid');
      const gridFilms = films.filter(function(f) { return f.inGrid; });
      const countEl = document.getElementById('section-count');
      if (countEl) countEl.textContent = gridFilms.length + ' titles';
      renderGrid(films, grid, 'all');
      wireFilters(films, grid);
      observeCards();

      renderUpcoming(films, document.getElementById('upcoming-list'));
      renderTicker(films, document.getElementById('ticker-track'));
    })
    .catch(function() {
      const heroRoot = document.getElementById('hero-root');
      if (heroRoot) {
        heroRoot.innerHTML = '<p class="hero-syn" style="color:var(--muted)">Could not load film data. Ensure <code>public/data/films.json</code> is available.</p>';
      }
    });

  document.addEventListener('mousemove', function(e) {
    const x = (e.clientX / window.innerWidth - 0.5) * 28;
    const y = (e.clientY / window.innerHeight - 0.5) * 28;
    document.querySelectorAll('.hero-glow').forEach(function(g, i) {
      g.style.transform = 'translate(' + (x * (i + 1) * 0.3) + 'px,' + (y * (i + 1) * 0.3) + 'px)';
    });
  });

  var newsletterBound = false;
  function initNewsletterModal() {
    if (newsletterBound) return;
    newsletterBound = true;
    var overlay = document.getElementById('subscribe-overlay');
    var form = document.getElementById('subscribe-form');
    var msg = document.getElementById('subscribe-msg');
    var emailIn = document.getElementById('subscribe-email');
    var closeBtn = document.getElementById('subscribe-close');
    var dialog = overlay ? overlay.querySelector('.subscribe-dialog') : null;
    if (!overlay || !form || !msg || !emailIn) return;

    function setOpen(on) {
      overlay.classList.toggle('is-open', on);
      overlay.setAttribute('aria-hidden', on ? 'false' : 'true');
      document.body.style.overflow = on ? 'hidden' : '';
      if (on) {
        msg.textContent = '';
        msg.className = 'subscribe-msg';
        setTimeout(function() {
          emailIn.focus();
        }, 10);
      }
    }

    document.body.addEventListener('click', function(e) {
      var t = e.target.closest('[data-newsletter]');
      if (!t) return;
      e.preventDefault();
      setOpen(true);
    });

    closeBtn.addEventListener('click', function() {
      setOpen(false);
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) setOpen(false);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) setOpen(false);
    });
    if (dialog) {
      dialog.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var addr = (emailIn.value || '').trim();
      if (!addr) {
        msg.textContent = 'Enter your email.';
        msg.className = 'subscribe-msg is-err';
        return;
      }
      msg.textContent = 'Sending…';
      msg.className = 'subscribe-msg';
      var btn = document.getElementById('subscribe-submit');
      if (btn) btn.disabled = true;
      fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr, source: 'hero_or_footer' })
      })
        .then(function(r) {
          return r.text().then(function(t) {
            var j = {};
            try {
              j = t ? JSON.parse(t) : {};
            } catch (e) {
              j = {};
            }
            return { ok: r.ok, body: j };
          });
        })
        .then(function(res) {
          if (res.body && res.body.ok) {
            msg.textContent = res.body.duplicate
              ? "You're already on the list — thanks for caring."
              : "You're subscribed. We'll be in touch with updates.";
            msg.className = 'subscribe-msg is-ok';
            emailIn.value = '';
            setTimeout(function() {
              setOpen(false);
            }, 2200);
          } else {
            msg.textContent = (res.body && res.body.error) || 'Something went wrong. Try again.';
            msg.className = 'subscribe-msg is-err';
          }
        })
        .catch(function() {
          msg.textContent = 'Network error. Try again.';
          msg.className = 'subscribe-msg is-err';
        })
        .finally(function() {
          if (btn) btn.disabled = false;
        });
    });
  }

  initNewsletterModal();
})();

  // Mobile nav: hamburger + backdrop
  (function() {
    const nav = document.querySelector('.site-nav');
    const panel = document.getElementById('primary-nav');
    const btn = document.getElementById('nav-toggle');
    const backdrop = document.getElementById('nav-backdrop');
    if (!nav || !panel || !btn || !backdrop) return;
    const mq = window.matchMedia('(max-width: 900px)');

    function setOpen(open) {
      if (!mq.matches) {
        nav.classList.remove('is-open');
        backdrop.classList.remove('is-visible');
        document.body.classList.remove('nav-menu-open');
        backdrop.setAttribute('aria-hidden', 'true');
        panel.removeAttribute('aria-hidden');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Open menu');
        return;
      }
      const on = open === true;
      nav.classList.toggle('is-open', on);
      backdrop.classList.toggle('is-visible', on);
      document.body.classList.toggle('nav-menu-open', on);
      backdrop.setAttribute('aria-hidden', on ? 'false' : 'true');
      panel.setAttribute('aria-hidden', on ? 'false' : 'true');
      btn.setAttribute('aria-expanded', String(on));
      btn.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
    }

    function onMqChange() {
      if (!mq.matches) {
        setOpen(false);
        return;
      }
      if (!nav.classList.contains('is-open')) {
        panel.setAttribute('aria-hidden', 'true');
        backdrop.setAttribute('aria-hidden', 'true');
      }
    }

    btn.addEventListener('click', function() {
      if (!mq.matches) return;
      setOpen(!nav.classList.contains('is-open'));
    });
    backdrop.addEventListener('click', function() { if (mq.matches) setOpen(false); });
    panel.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() { if (mq.matches) setOpen(false); });
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mq.matches && nav.classList.contains('is-open')) setOpen(false);
    });
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMqChange);
    else if (typeof mq.addListener === 'function') mq.addListener(onMqChange);
    onMqChange();
  })();
