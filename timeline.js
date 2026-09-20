(function () {
  'use strict';
  var viewport = document.getElementById('viewport');
  var canvas = document.getElementById('canvas');
  var eventsLayer = document.getElementById('events');
  var ticksLayer = document.getElementById('ticks');
  var articleEl = document.getElementById('article');
  var articleMeta = document.getElementById('articleMeta');
  var articleTitle = document.getElementById('articleTitle');
  var articleBody = document.getElementById('articleBody');
  var data, start, end, px, offset = 160, articleGeneration = 0;

  function yearToX(year) {
    return (year - start) * px + offset;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

  function eraFor(year) {
    return year < 907 ? '唐朝' : year < 960 ? '五代十国' : year < 1271 ? '宋朝' : year < 1368 ? '元朝' : year < 1644 ? '明朝' : year < 1912 ? '清朝' : year < 1949 ? '中华民国' : '中华人民共和国';
  }

  function assignLanes(items) {
    var ends = [];
    return items.slice().sort(function (a, b) { return a.year - b.year; }).map(function (event) {
      var width = Math.max(190, Math.min(240, event.title.length * 17 + 80));
      var left = yearToX(event.year);
      var lane = 0;
      while (ends[lane] !== undefined && left - ends[lane] < 28) lane++;
      ends[lane] = left + width;
      return { event: event, lane: lane };
    });
  }

  function articleHash(event) {
    return '#/' + event.collection + '/' + event.slug;
  }

  function parseArticleHash(hash) {
    var match = String(hash || '').match(/^#\/(china|church)\/(\d{3,4}-[a-z0-9]+(?:-[a-z0-9]+)*)$/);
    return match ? { collection: match[1], slug: match[2] } : null;
  }

  function findEvent(collection, slug) {
    return data.filter(function (event) {
      return event.collection === collection && event.slug === slug;
    })[0];
  }

  // 文章里的相对图片改写成该记录的绝对站点路径：页面停在站点根，不能指望浏览器按文章路径解析。
  function recordDir(event) {
    return '/' + event.path.replace(/\/index\.md$/, '');
  }

  function stripFrontmatter(markdown) {
    var match = String(markdown || '').match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
    return match ? match[1].trim() : String(markdown || '').trim();
  }

  function rewriteRecordImages(markdown, dir) {
    return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      src = src.trim();
      if (/^(https?:|data:|mailto:|\/)/i.test(src) || src.indexOf('..') !== -1) {
        return '![' + alt + '](' + src + ')';
      }
      return '![' + alt + '](' + dir + '/' + src.replace(/^\.\//, '') + ')';
    });
  }

  function renderInline(text) {
    var html = escapeHtml(text);
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      return '<img src="' + src + '" alt="' + alt + '">';
    });
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
  }

  function renderMarkdown(markdown) {
    return markdown.split(/\n{2,}/).map(function (block) {
      var lines = block.split('\n');
      if (lines[0].indexOf('> ') === 0 || lines[0] === '>') {
        return '<blockquote>' + lines.map(function (line) {
          return renderInline(line.replace(/^>\s?/, ''));
        }).join('<br>') + '</blockquote>';
      }
      var heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
      if (heading && lines.length === 1) {
        var level = Number(heading[1].length) + 1;
        return '<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>';
      }
      return '<p>' + lines.map(renderInline).join('<br>') + '</p>';
    }).join('');
  }

  function highlight(event) {
    document.querySelectorAll('.event.active').forEach(function (active) {
      active.classList.remove('active');
    });
    if (!event) return;
    var card = document.querySelector('.event[data-collection="' + event.collection + '"][data-slug="' + event.slug + '"]');
    if (card) card.classList.add('active');
  }

  function scrollToEvent(event) {
    viewport.scrollLeft = Math.max(0, yearToX(event.year) - viewport.clientWidth / 2);
  }

  function emptyArticleHash() {
    return location.pathname + location.search + '#/';
  }

  function hashIsEmpty() {
    return !location.hash || location.hash === '#' || location.hash === '#/';
  }

  function hideArticle() {
    articleGeneration += 1;
    articleEl.hidden = true;
    document.body.classList.remove('article-open');
    highlight(null);
  }

  function closeArticle() {
    if (parseArticleHash(location.hash)) {
      location.hash = '#/';
      return;
    }
    hideArticle();
    if (!hashIsEmpty()) history.replaceState(null, '', emptyArticleHash());
  }

  function showDescription(event) {
    articleBody.innerHTML = '<p>' + escapeHtml(event.description) + '</p>';
  }

  function openArticle(event) {
    var requestId = ++articleGeneration;
    articleEl.hidden = false;
    document.body.classList.add('article-open');
    articleMeta.textContent = event.category + ' · ' + event.year;
    articleTitle.textContent = event.title;
    highlight(event);
    scrollToEvent(event);
    if (!event.hasBody) {
      showDescription(event);
      return;
    }
    articleBody.textContent = '正在载入……';
    fetch(event.path).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).then(function (markdown) {
      if (requestId !== articleGeneration) return;
      var body = rewriteRecordImages(stripFrontmatter(markdown), recordDir(event));
      if (!body) {
        showDescription(event);
        return;
      }
      articleBody.innerHTML = renderMarkdown(body);
    }).catch(function () {
      if (requestId !== articleGeneration) return;
      articleBody.textContent = '文章载入失败。请检查网络，或稍后再打开这一条。';
    });
  }

  function syncArticleFromHash() {
    var parsed = parseArticleHash(location.hash);
    if (!parsed) {
      hideArticle();
      if (!hashIsEmpty()) history.replaceState(null, '', emptyArticleHash());
      return;
    }
    var event = findEvent(parsed.collection, parsed.slug);
    if (!event) {
      hideArticle();
      history.replaceState(null, '', emptyArticleHash());
      return;
    }
    openArticle(event);
  }

  function openFromCard(event) {
    var next = articleHash(event);
    if (location.hash === next) {
      openArticle(event);
      return;
    }
    location.hash = next;
  }

  function renderEvent(item) {
    var event = item.event;
    var el = document.createElement('article');
    el.className = 'event ' + event.side;
    el.dataset.collection = event.collection;
    el.dataset.slug = event.slug;
    el.style.left = yearToX(event.year) + 'px';
    el.style.setProperty('--lane', item.lane);
    el.innerHTML = '<button class="card" type="button"><span class="date">' + escapeHtml(event.year + ' · ' + event.category) + '</span><strong>' + escapeHtml(event.title) + '</strong><span class="summary">' + escapeHtml(event.description) + '</span></button><span class="stem"></span>';
    el.querySelector('.card').addEventListener('click', function () {
      openFromCard(event);
    });
    eventsLayer.appendChild(el);
  }

  function updateHeader() {
    var year = Math.round(start + (viewport.scrollLeft + viewport.clientWidth / 2 - offset) / px);
    year = Math.max(start, Math.min(end, year));
    document.getElementById('currentYear').textContent = year;
    document.getElementById('eraName').textContent = eraFor(year);
  }

  function initTimeline(config) {
    data = config.events || [];
    start = config.meta.startYear;
    end = config.meta.endYear;
    px = config.meta.pixelsPerYear;
    canvas.style.width = (yearToX(end) + 300) + 'px';
    ticksLayer.innerHTML = '';
    eventsLayer.innerHTML = '';
    for (var year = start; year <= end; year += 10) {
      var tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = year;
      tick.style.left = yearToX(year) + 'px';
      ticksLayer.appendChild(tick);
    }
    ['top', 'bottom'].forEach(function (side) {
      assignLanes(data.filter(function (event) { return event.side === side; })).forEach(renderEvent);
    });
    var opened = parseArticleHash(location.hash);
    var openedEvent = opened && findEvent(opened.collection, opened.slug);
    if (!openedEvent) {
      viewport.scrollLeft = Math.max(0, yearToX(config.meta.initialYear) - viewport.clientWidth / 2);
    }
    updateHeader();
    syncArticleFromHash();
  }

  articleEl.addEventListener('click', function (event) {
    if (event.target.closest('[data-close-article]')) closeArticle();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !articleEl.hidden) closeArticle();
  });
  window.addEventListener('hashchange', syncArticleFromHash);
  document.querySelectorAll('.quick button').forEach(function (button) {
    button.addEventListener('click', function () {
      viewport.scrollTo({ left: yearToX(Number(button.dataset.year)) - viewport.clientWidth / 2, behavior: 'smooth' });
    });
  });
  viewport.addEventListener('scroll', updateHeader);
  viewport.addEventListener('wheel', function (event) {
    if (document.body.classList.contains('article-open')) {
      event.preventDefault();
      return;
    }
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    }
  }, { passive: false });

  /* 时间线清单由构建生成（npm run build）；双击 HTML 的 file:// 打开方式不再支持。 */
  fetch('timeline-manifest.json').then(function (response) {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }).then(initTimeline).catch(function (error) {
    console.error('时间线清单载入失败：请先运行 npm run build', error);
  });
})();
