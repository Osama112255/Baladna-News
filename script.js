/* script.js - fetches Google News RSS via allorigins and displays articles */
/* Categories: mapping to search queries for Google News */
const categoryQueries = {
  all: 'site:eg OR مصر OR القاهرة',
  politics: 'سياسة مصر OR الحكومة مصر',
  economy: 'اقتصاد مصر OR البورصة OR الدولار',
  sports: 'كرة قدم مصر OR الدوري المصري OR منتخب مصر',
  culture: 'ثقافة مصر OR فيلم مصر OR مهرجان',
  tech: 'تكنولوجيا مصر OR شركات ناشئة مصر',
  weather: 'طقس مصر OR حالة الطقس مصر'
};

const NEWS_LIMIT = 30;
let currentArticles = [];
let shown = 0;

const newsContainer = document.getElementById('newsContainer');
const heroGrid = document.getElementById('heroGrid');
const loadMoreBtn = document.getElementById('loadMore');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const modal = document.getElementById('newsModal');
const closeModal = document.getElementById('closeModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalMeta = document.getElementById('modalMeta');
const modalLink = document.getElementById('modalLink');

async function fetchRss(url){
  const proxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
  const resp = await fetch(proxy);
  if(!resp.ok) throw new Error('شبكة: ' + resp.status);
  const data = await resp.json();
  return data.contents;
}

function parseRss(xmlString){
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');
  const items = Array.from(xml.querySelectorAll('item')).map(item => {
    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const description = item.querySelector('description')?.textContent || '';
    const imgMatch = description.match(/src=\"(.*?)\"|src="(.*?)"/);
    const image = imgMatch ? (imgMatch[1]||imgMatch[2]) : '';
    return {title,link,pubDate,description,image};
  });
  return items;
}

function googleNewsRss(q){
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ar&gl=EG&ceid=EG:ar`;
}

async function loadCategory(cat='all', query=''){
  try{
    newsContainer.innerHTML = '<p class="loading">⏳ جاري تحميل الأخبار...</p>';
    heroGrid.innerHTML = '';
    shown = 0;
    let q = query ? query : (categoryQueries[cat] || categoryQueries['all']);
    const rss = googleNewsRss(q);
    const xml = await fetchRss(rss);
    const items = parseRss(xml).slice(0, NEWS_LIMIT);
    if(items.length === 0){
      newsContainer.innerHTML = '<p class="loading">لم يتم العثور على أخبار حالياً.</p>';
      return;
    }
    currentArticles = items;
    const top = items.slice(0,3);
    const heroMain = document.createElement('div');
    heroMain.className = 'hero-main';
    heroMain.innerHTML = '<div class="hero-list">' + top.map(it => `
      <div class="hero-card" data-link="${it.link}">
        <img src="${it.image || 'assets/placeholder.jpg'}" alt="">
        <div><h3>${it.title}</h3><p class="meta">${new Date(it.pubDate).toLocaleString('ar-EG')}</p></div>
      </div>
    `).join('') + '</div>';
    heroGrid.appendChild(heroMain);
    renderNextBatch();
  }catch(err){
    console.error(err);
    newsContainer.innerHTML = '<p class="loading">⚠️ حدث خطأ أثناء تحميل الأخبار. حاول لاحقًا.</p>';
  }
}

function renderNextBatch(batch=9){
  const items = currentArticles.slice(shown, shown+batch);
  if(items.length === 0){
    if(shown === 0) newsContainer.innerHTML = '<p class="loading">لا توجد أخبار لعرضها.</p>';
    return;
  }
  const html = items.map(it => `
    <article class="article" data-link="${it.link}">
      <img src="${it.image || 'assets/placeholder.jpg'}" alt="">
      <div class="content">
        <h3>${it.title}</h3>
        <p>${it.description.replace(/(<([^>]+)>)/gi, '').slice(0,160)}...</p>
      </div>
    </article>
  `).join('');
  newsContainer.insertAdjacentHTML('beforeend', html);
  const added = Array.from(newsContainer.querySelectorAll('.article')).slice(shown);
  added.forEach((el, idx) => {
    el.addEventListener('click', () => openModal(currentArticles[shown + idx]));
    observer.observe(el);
  });
  shown += items.length;
}

function openModal(article){
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden','false');
  modalImage.src = article.image || 'assets/placeholder.jpg';
  modalTitle.textContent = article.title;
  modalDescription.textContent = stripHtml(article.description) || 'لا يوجد محتوى مباشر. يمكنك زيارة المصدر.';
  modalMeta.textContent = new Date(article.pubDate).toLocaleString('ar-EG');
  modalLink.href = article.link;
}

document.getElementById('closeModal').addEventListener('click', () => {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden','true');
});
window.addEventListener('click', e => { if(e.target === modal){ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); } });

searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if(!q) return;
  loadCategory('all', q);
});

document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    const cat = a.getAttribute('data-cat');
    loadCategory(cat);
    window.scrollTo({top:220, behavior:'smooth'});
  });
});
document.querySelectorAll('.source-card').forEach(card=>{
  card.addEventListener('click', ()=>{
    const cat = card.getAttribute('data-category') || 'all';
    document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
    const target = document.querySelector('.nav-link[data-cat="'+cat+'"]');
    if(target) target.classList.add('active');
    loadCategory(cat);
    window.scrollTo({top:220, behavior:'smooth'});
  });
});

loadMore.addEventListener('click', ()=> renderNextBatch(9));

function stripHtml(html){ return html.replace(/(<([^>]+)>)/gi, ''); }

const observer = new IntersectionObserver((entries)=>{
  entries.forEach(ent=>{
    if(ent.isIntersecting) ent.target.classList.add('show');
  });
},{threshold:0.12});

loadCategory('all');
