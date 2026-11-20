(() => {
  'use strict';
  const categories = window.PORTFOLIO_CATEGORIES;
  const original = [
    ...(window.GALLERY_ARTWORKS || []).map(a => ({ ...a, category: a.category || 'art' })),
    ...(window.PORTFOLIO_PROJECTS || [])
  ];
  let artworks = [...original];
  let visible = [];
  let artist = 'all';
  let category = 'art';
  let personalPage = false;
  let currentId = null;
  let currentPhoto = 0;
  let previouslyFocused = null;
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#art-grid');
  const artDialog = $('#art-dialog');
  const importDialog = $('#import-dialog');
  const mediumFilter = $('#medium-filter');
  const yearFilter = $('#year-filter');
  const formatDate = (date) => date ? date.replace(/-/g, '.') : '创作日期待补充';
  const currentCategory = () => categories.find(c => c.id === category);
  const route = (id, author = artist) => personalPage && author !== 'all'
    ? `#artist/${author}/${id}`
    : `#collection/${id}${author === 'all' ? '' : `/${author}`}`;
  const categoryWorks = () => artworks.filter(a => a.category === category && (artist === 'all' || a.artist === artist));
  const featuredWork = name => original.find(a => a.artist === name && a.featured && a.image) || original.find(a => a.artist === name && a.image);

  function categoryIcon(id) {
    const shapes = {
      art: ['M5 27 9 15 25 3l8 8-16 12-12 4Z', 'm9 15 8 8M21 6l8 8M6 26l6-2M21 29h12'],
      crafts: ['M5 13 18 6l13 7v15l-13 7L5 28V13Z', 'M5 13l13 7 13-7M18 20v15M11 10l14 7'],
      writing: ['M6 5h18l6 6v23H6V5Z', 'M24 5v7h6M11 18h14M11 23h14M11 28h9'],
      achievements: ['M11 4h14v13a7 7 0 0 1-14 0V4Z', 'M11 7H5v5c0 5 3 8 7 8M25 7h6v5c0 5-3 8-7 8M18 25v7M11 33h14'],
      digital: ['M4 6h28v20H4V6Z', 'M13 33h10M18 26v7M12 12l-4 4 4 4M24 12l4 4-4 4M20 11l-4 10'],
      fun: ['M18 3l4 10 11 2-8 7 2 11-9-5-9 5 2-11-8-7 11-2 4-10Z', 'M14 18h.1M22 18h.1M14 23q4 4 8 0']
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 36 38');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of shapes[id] || shapes.art) {
      const p = document.createElementNS(svg.namespaceURI, 'path');
      p.setAttribute('d', d); svg.append(p);
    }
    return svg;
  }

  function renderDirectory() {
    const directory = $('#category-directory');
    directory.replaceChildren();
    for (const c of categories) {
      const count = artworks.filter(a => a.category === c.id && (artist === 'all' || a.artist === artist)).length;
      const link = element('a', `category-card category-${c.id}${category === c.id ? ' active' : ''}`);
      link.href = route(c.id);
      if (category === c.id) link.setAttribute('aria-current', 'page');
      link.setAttribute('aria-label', `${c.title}，${count} ${c.unit}`);
      const top = element('div', 'category-card-top');
      top.append(categoryIcon(c.id), element('span', 'category-number', c.mark));
      link.append(top, element('strong', '', c.title), element('span', 'category-card-count', count ? `${count} ${c.unit}${c.id === 'achievements' ? '记录' : '作品'}` : '等待第一份收藏'));
      directory.append(link);
    }
  }

  function readRoute(scroll = false) {
    const previousPersonal = personalPage;
    const previousArtist = artist;
    const profileMatch = location.hash.match(/^#artist\/(Flash|Lily)(?:\/([^/]+))?$/);
    const match = location.hash.match(/^#collection(?:\/([^/]+))?(?:\/(Flash|Lily))?$/);
    personalPage = !!profileMatch;
    const requestedCategory = profileMatch ? profileMatch[2] : match?.[1];
    category = categories.some(c => c.id === requestedCategory) ? requestedCategory : 'art';
    artist = profileMatch ? profileMatch[1] : match?.[2] || 'all';
    mediumFilter.value = yearFilter.value = 'all';
    populateFilters(); render();
    if (!scroll) return;
    const target = personalPage
      ? (!previousPersonal || previousArtist !== artist || !profileMatch[2] ? $('#artist-page') : $('#collection'))
      : match ? $('#collection') : location.hash === '#artists' ? $('#artists') : location.hash === '#our-story' ? $('#our-story') : $('.site-header');
    target.scrollIntoView({ block: 'start' });
  }

  function navigateTo(id, author = artist) {
    const next = route(id, author);
    if (location.hash === next) readRoute(true);
    else location.hash = next;
  }

  function syncHero() {
    [['.frame-front', 'Flash'], ['.frame-back', 'Lily']].forEach(([selector, name]) => {
      const art = original.find(a => a.artist === name && a.featured && a.image) || original.filter(a => a.artist === name && a.image).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      const frame = $(selector);
      if (!art) { frame.hidden = true; return; }
      frame.querySelector('img').src = art.thumbnail || art.image;
      frame.querySelector('img').alt = `${art.sample ? '示意画作：' : ''}${art.artist} · ${art.title}`;
      frame.querySelector('figcaption>span:not(.artist-dot)').textContent = `· ${art.title}`;
      const cover = document.querySelector(`[data-profile-cover="${name}"]`);
      cover.src = art.thumbnail || art.image;
      cover.alt = `${name} · ${art.title}`;
    });
    $('.hero-art').setAttribute('aria-label', original.some(a => a.sample) ? '画廊排版示意：Flash 和 Lily 的作品卡片' : 'Flash 和 Lily 的精选作品卡片');
  }

  function renderPage() {
    document.querySelectorAll('.home-only').forEach(section => { section.hidden = personalPage; });
    $('#artist-page').hidden = !personalPage;
    $('.artist-tabs').hidden = personalPage;
    document.body.classList.toggle('personal-view', personalPage);
    for (const name of ['Flash', 'Lily']) {
      document.querySelector(`[data-profile-count="${name}"]`).textContent = `${artworks.filter(a => a.artist === name).length} 份收藏 · ${categories.length} 个栏目`;
    }
    $('#directory-eyebrow').textContent = personalPage ? `${artist.toUpperCase()}'S COLLECTIONS` : 'THE GROWING COLLECTION';
    $('#directory-description').textContent = personalPage ? `从美术到小小的发现，翻翻 ${artist} 的每一种探索。` : '画下来，做出来，写成故事，或让一个点子在屏幕上发光。';
    document.title = personalPage ? `${artist} 的作品集 · Flash & Lily` : 'Flash & Lily · 成长作品集';
    if (!personalPage) return;
    const sibling = artist === 'Flash' ? 'Lily' : 'Flash';
    $('#artist-page').dataset.artist = artist;
    $('#profile-eyebrow').textContent = `${artist.toUpperCase()}'S LITTLE WORLD`;
    $('#artist-page-title').replaceChildren(document.createTextNode(artist), element('span', '', ' 的小小宇宙。'));
    $('#profile-stats').textContent = `${artworks.filter(a => a.artist === artist).length} 份作品收藏 · ${categories.length} 个探索栏目`;
    $('#profile-sibling').href = `#artist/${sibling}/${category}`;
    $('#profile-sibling').textContent = `看看 ${sibling} 的作品集 ↗`;
    const art = featuredWork(artist);
    $('.profile-cover').hidden = !art;
    if (art) {
      $('#profile-image').src = art.thumbnail || art.image;
      $('#profile-image').alt = `${artist} · ${art.title}`;
      $('#profile-caption').textContent = `${artist} · ${art.title}`;
    }
  }

  // All user-entered names and captions are inserted as text, never as HTML.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function artistLabel(name) {
    const label = element('span', 'artist-label');
    label.append(element('span', `artist-dot ${name === 'Lily' ? 'lily' : 'flash'}`), document.createTextNode(name));
    return label;
  }
  function populateFilters() {
    const previousMedium = mediumFilter.value;
    const previousYear = yearFilter.value;
    mediumFilter.replaceChildren(new Option('所有主题', 'all'));
    yearFilter.replaceChildren(new Option('所有年份', 'all'));
    const available = categoryWorks();
    [...new Set(available.map(a => a.theme || a.medium).filter(Boolean))].forEach(theme => mediumFilter.add(new Option(theme, theme)));
    [...new Set(available.map(a => a.date?.slice(0, 4)).filter(Boolean))].sort().reverse().forEach(year => yearFilter.add(new Option(`${year} 年`, year)));
    mediumFilter.value = [...mediumFilter.options].some(o => o.value === previousMedium) ? previousMedium : 'all';
    yearFilter.value = [...yearFilter.options].some(o => o.value === previousYear) ? previousYear : 'all';
    yearFilter.closest('label').hidden = yearFilter.options.length === 1;
    mediumFilter.closest('label').hidden = mediumFilter.options.length === 1;
  }
  function render() {
    renderPage();
    const c = currentCategory();
    visible = categoryWorks().filter(a => (mediumFilter.value === 'all' || (a.theme || a.medium) === mediumFilter.value) && (yearFilter.value === 'all' || a.date?.startsWith(yearFilter.value)))
      .sort((a, b) => Number(!!b.local) - Number(!!a.local) || (b.addedOn || '').localeCompare(a.addedOn || '') || (b.date || '').localeCompare(a.date || ''));
    renderDirectory();
    $('#category-eyebrow').textContent = c.english;
    $('#collection-title').replaceChildren(document.createTextNode(c.title), element('span', '', '。'));
    $('#category-description').textContent = c.description;
    $('#collection-note').hidden = !visible.some(a => a.titleProvisional);
    $('#collection-note').textContent = category === 'art' ? '作品的小名字暂按画面取，等小画家亲自命名。' : '这里有暂按内容拟定的小名字，等待作者亲自命名。';
    grid.replaceChildren();
    visible.forEach((art, index) => {
      const card = element('article', `art-card${art.local ? ' local' : ''}`);
      card.style.animationDelay = `${Math.min(index * 30, 180)}ms`;
      const button = element('button', 'art-button');
      button.setAttribute('aria-label', `查看${art.artist}的作品：${art.title}${art.sample ? '（示意）' : ''}`);
      const mat = element('div', 'art-mat');
      let preview;
      if (art.image) {
        preview = element('img');
        preview.src = art.thumbnail || art.image;
        if (art.width && art.height) { preview.width = art.width; preview.height = art.height; }
        preview.alt = art.title;
        preview.loading = 'lazy';
        preview.decoding = 'async';
      } else {
        preview = element('div', 'project-text-preview');
        preview.append(categoryIcon(c.id), element('p', '', art.description || (art.content || '').slice(0, 110) || art.title));
      }
      const open = element('span', 'art-open', '↗');
      open.setAttribute('aria-hidden', 'true');
      mat.append(preview, open);
      const caption = element('div', 'art-caption');
      const top = element('div', 'art-caption-top');
      top.append(element('h3', '', art.title), artistLabel(art.artist));
      const bottom = element('div', 'art-caption-bottom');
      if (art.date) bottom.append(element('span', '', formatDate(art.date)), element('span', 'separator'));
      bottom.append(element('span', '', art.theme || art.medium || c.title));
      if (art.photos?.length > 1) bottom.append(element('span', 'photo-count', `${art.photos.length} 张照片`));
      if (art.local) bottom.append(element('span', 'local-badge', '· 本机预览'));
      caption.append(top, bottom);
      button.append(mat, caption);
      button.addEventListener('click', () => showArt(art.id));
      card.append(button);
      grid.append(card);
    });
    $('#result-count').textContent = `${visible.length} ${c.unit}${c.id === 'achievements' ? '记录' : '作品'}`;
    $('#empty-state').hidden = visible.length !== 0;
    if (!visible.length) {
      const filtered = categoryWorks().length > 0;
      $('#empty-icon').replaceChildren(categoryIcon(c.id));
      $('#empty-eyebrow').textContent = c.english;
      $('#empty-title').textContent = filtered ? '换一个角度，再发现一些喜欢。' : c.emptyTitle;
      $('#empty-description').textContent = filtered ? '当前筛选条件下还没有作品，可以清除筛选再看看。' : c.emptyDescription;
      $('#empty-examples').replaceChildren(...(filtered ? [] : c.examples.map(text => element('span', '', text))));
      $('#empty-owner').textContent = filtered ? '' : `这一页，留给 ${artist === 'all' ? 'Flash 和 Lily' : artist} 接下来的探索。`;
      $('#reset-filters').textContent = filtered ? '清除筛选条件' : '回看美术作品 ↗';
    }
    $('#sample-notice').hidden = !visible.some(a => a.sample);
    const localCount = artworks.filter(a => a.local).length;
    $('#local-notice').hidden = localCount === 0;
    $('#local-notice-copy').textContent = `已试放 ${localCount} 张自己的画作照片 · 仅当前浏览器可见，刷新后清除。`;
    document.querySelectorAll('[data-artist]').forEach(tab => {
      const active = tab.dataset.artist === artist;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
  }
  function openDialog(dialog) {
    if (!dialog.open) {
      previouslyFocused = document.activeElement;
      dialog.showModal();
      document.body.classList.add('modal-open');
    }
  }
  function closeDialog(dialog) {
    dialog.close();
  }
  function selectPhoto(art, photos, index) {
    const photo = photos[index];
    currentPhoto = index;
    $('#detail-image').src = photo.thumbnail || photo.image;
    $('#detail-image').alt = `${art.artist} · ${art.title}${photos.length > 1 ? ` · 第 ${index + 1} 张照片` : ''}`;
    $('#detail-photo-count').textContent = photos.length > 1 ? `照片 ${index + 1} / ${photos.length}` : '';
    document.querySelectorAll('#detail-photos button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    if (photo.thumbnail && photo.image) {
      const fullSize = new Image();
      fullSize.onload = () => {
        if (currentId === art.id && currentPhoto === index && artDialog.open) $('#detail-image').src = photo.image;
      };
      fullSize.src = photo.image;
    }
  }
  function showArt(id) {
    const art = visible.find(a => a.id === id);
    if (!art) return;
    currentId = id;
    const c = categories.find(c => c.id === art.category);
    $('#detail-image').hidden = !art.image;
    $('#detail-document').hidden = !!art.image;
    $('#detail-document').replaceChildren(element('h3', '', art.title), element('p', '', art.content || art.description || ''));
    const photos = art.photos?.length ? art.photos : art.image ? [art] : [];
    $('#detail-photos').replaceChildren();
    $('#detail-photo-gallery').hidden = photos.length < 2;
    photos.forEach((photo, index) => {
      if (photos.length < 2) return;
      const button = element('button', 'detail-photo-thumb');
      button.setAttribute('aria-label', `查看第 ${index + 1} 张照片，共 ${photos.length} 张`);
      const img = element('img');
      img.src = photo.thumbnail || photo.image; img.alt = '';
      button.append(img);
      button.addEventListener('click', () => selectPhoto(art, photos, index));
      $('#detail-photos').append(button);
    });
    if (photos.length) selectPhoto(art, photos, 0);
    else { $('#detail-image').removeAttribute('src'); $('#detail-photo-count').textContent = ''; }
    $('.detail-image-stage').style.background = art.paper || '#e8e9df';
    $('#detail-title').textContent = art.title;
    $('#detail-artist').textContent = art.artist;
    $('#detail-artist').dataset.artist = art.artist;
    $('#detail-kind').textContent = `${c.english}${art.local ? ' / 照片试放' : ''}`;
    $('#detail-meta').textContent = [art.theme, art.date ? formatDate(art.date) : '', art.medium].filter(Boolean).join(' · ');
    $('#quote-block').hidden = !art.quote;
    $('#detail-quote').textContent = art.quote || '';
    $('.quote-caption').textContent = `自己的话${art.sample ? ' · 示意' : ''}`;
    $('#detail-description').hidden = !art.image || !(art.content || art.description);
    $('#detail-description').textContent = art.content || art.description || '';
    $('#detail-note').textContent = art.sample ? '这里将来可以放孩子自己对画的讲述。当前画作、日期与讲述均为排版示意。' : art.local ? '这是刚刚从电脑选择的照片。正式收藏时，可以补上作品名称、创作日期和孩子的讲述。' : art.titleProvisional ? `按内容暂取的小名字，等${art.category === 'art' ? '小画家' : '作者'}亲自命名。` : '';
    const link = $('#detail-link');
    link.hidden = true; link.removeAttribute('href');
    if (art.link) {
      try {
        const url = new URL(art.link, location.href);
        if (['https:', 'http:'].includes(url.protocol) || (url.protocol === 'file:' && !/^[a-z]+:/i.test(art.link))) {
          link.href = url.href; link.textContent = art.linkLabel || '查看作品 ↗'; link.hidden = false;
        }
      } catch { /* Ignore malformed optional links. */ }
    }
    const index = visible.findIndex(a => a.id === id);
    $('#detail-position').textContent = `${String(index + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
    $('#prev-art').disabled = index === 0;
    $('#next-art').disabled = index === visible.length - 1;
    openDialog(artDialog);
  }
  function stepArt(direction) {
    const index = visible.findIndex(a => a.id === currentId) + direction;
    if (visible[index]) showArt(visible[index].id);
  }
  document.querySelectorAll('[data-artist]').forEach(tab => tab.addEventListener('click', () => navigateTo(category, tab.dataset.artist)));
  window.addEventListener('hashchange', () => readRoute(true));
  $('.back-top').addEventListener('click', event => {
    event.preventDefault();
    $('.site-header').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  [mediumFilter, yearFilter].forEach(select => select.addEventListener('change', render));
  $('#reset-filters').addEventListener('click', () => {
    if (!categoryWorks().length) { navigateTo('art'); return; }
    mediumFilter.value = yearFilter.value = 'all'; render();
  });
  $('#prev-art').addEventListener('click', () => stepArt(-1));
  $('#next-art').addEventListener('click', () => stepArt(1));
  document.addEventListener('keydown', event => {
    if (!artDialog.open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepArt(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  [artDialog, importDialog].forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      if (!artDialog.open && !importDialog.open) document.body.classList.remove('modal-open');
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    });
  });
  document.querySelectorAll('[data-import]').forEach(button => button.addEventListener('click', () => {
    $('#import-status').textContent = '';
    if (artist !== 'all') document.querySelector(`input[name="import-artist"][value="${artist}"]`).checked = true;
    openDialog(importDialog);
  }));
  $('#photo-input').addEventListener('change', async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const name = document.querySelector('input[name="import-artist"]:checked').value;
    let rejected = 0;
    const added = [];
    $('#import-status').textContent = '正在读取照片…';
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { rejected++; continue; }
      const url = URL.createObjectURL(file);
      try {
        const probe = new Image();
        probe.src = url;
        await probe.decode();
        added.push({ id: `local-${crypto.randomUUID()}`, category, title: file.name.replace(/\.[^.]+$/, ''), artist: name, date: '', medium: '', image: url, quote: '', sample: false, local: true });
      } catch {
        URL.revokeObjectURL(url);
        rejected++;
      }
    }
    event.target.value = '';
    if (!added.length) { $('#import-status').textContent = '这些文件暂时无法读取，请选择 JPG、PNG 或 WebP 照片。'; return; }
    artworks.unshift(...added);
    artist = name;
    mediumFilter.value = yearFilter.value = 'all';
    populateFilters();
    render();
    history.replaceState(null, '', route(category));
    if (rejected) $('#local-notice-copy').textContent += ` 有 ${rejected} 个文件格式不支持，已跳过。`;
    closeDialog(importDialog);
    $('#collection').scrollIntoView({ behavior: 'smooth' });
  });
  $('#clear-local').addEventListener('click', () => {
    artworks.filter(a => a.local).forEach(a => URL.revokeObjectURL(a.image));
    artworks = artworks.filter(a => !a.local);
    populateFilters();
    render();
  });
  syncHero();
  readRoute(location.hash.startsWith('#collection') || location.hash.startsWith('#artist/'));
})();
