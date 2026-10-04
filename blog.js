(() => {
  const search = document.querySelector('#essay-search');
  const sort = document.querySelector('#essay-sort');
  const list = document.querySelector('[data-archive]');
  if (search && sort && list) {
    const rows = Array.from(list.querySelectorAll('[data-title]'));
    const count = document.querySelector('#archive-count');
    const empty = document.querySelector('#archive-empty');
    document.querySelector('.archive-tools').hidden = false;
    const filter = () => {
      const query = search.value.trim().toLocaleLowerCase();
      let visible = 0;
      rows.forEach(row => {
        row.hidden = !row.dataset.search.includes(query);
        if (!row.hidden) visible++;
      });
      const sorted = [...rows].sort((a, b) => sort.value === 'title'
        ? a.dataset.title.localeCompare(b.dataset.title)
        : b.dataset.date.localeCompare(a.dataset.date) || a.dataset.title.localeCompare(b.dataset.title));
      sorted.forEach(row => list.appendChild(row));
      count.textContent = `${visible} ${visible === 1 ? 'essay' : 'essays'}${query ? ' found' : ''}`;
      empty.hidden = visible > 0;
    };
    search.addEventListener('input', filter);
    sort.addEventListener('change', filter);
    filter();
  }
  const share = document.querySelector('[data-share]');
  if (share && (navigator.clipboard || navigator.share)) {
    share.hidden = false;
    share.addEventListener('click', async () => {
      const url = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
      try {
        if (navigator.share) await navigator.share({ title: document.title, url });
        else {
          await navigator.clipboard.writeText(url);
          share.textContent = 'Link copied';
          setTimeout(() => { share.textContent = 'Share this essay'; }, 2400);
        }
      } catch (error) {
        if (error.name !== 'AbortError') share.textContent = 'Use your browser to share this page';
      }
    });
  }
})();
