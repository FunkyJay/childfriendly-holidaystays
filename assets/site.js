(function(){
  var DATA = window.SITE_ENTRIES || [];
  var byNum = {};
  DATA.forEach(function(d){ byNum[d.num] = d; });
  window.SITE_BY_NUM = byNum;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  var FAV_KEY = 'kfh_favorites_v1';
  function loadFavs(){
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); }
    catch(e){ return new Set(); }
  }
  function saveFavs(set){
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(set))); } catch(e){}
  }
  var favs = loadFavs();
  window.SITE_FAVS = favs;

  function applyFavClasses(){
    document.querySelectorAll('.fav-btn[data-num]').forEach(function(btn){
      var num = parseInt(btn.dataset.num, 10);
      var isFav = favs.has(num);
      btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      var label = btn.querySelector('.fav-btn-label');
      if(btn.classList.contains('fav-btn-lg')){
        btn.innerHTML = (isFav ? '&#9829; Bewaard' : '&#9825; Bewaar dit verblijf');
      } else {
        btn.textContent = isFav ? '♥' : '♡';
      }
      var card = btn.closest('.card');
      if(card) card.classList.toggle('is-fav', isFav);
    });
    var navPill = document.getElementById('navFavPill');
    var navCount = document.getElementById('navFavCount');
    if(navPill){
      navPill.hidden = favs.size === 0;
      if(navCount) navCount.textContent = favs.size;
    }
  }

  function updateCompareBar(){
    var bar = document.getElementById('comparebar');
    if(!bar) return;
    var count = favs.size;
    var countEl = document.getElementById('compareCount');
    if(countEl) countEl.textContent = count + (count === 1 ? ' favoriet' : ' favorieten');
    bar.hidden = count === 0;
  }

  function toggleFav(num){
    if(favs.has(num)){ favs.delete(num); } else { favs.add(num); }
    saveFavs(favs);
    applyFavClasses();
    updateCompareBar();
    if(typeof window.SITE_ON_FAV_CHANGE === 'function') window.SITE_ON_FAV_CHANGE();
  }
  window.SITE_TOGGLE_FAV = toggleFav;

  document.addEventListener('click', function(e){
    var btn = e.target.closest('.fav-btn');
    if(btn){
      e.preventDefault();
      toggleFav(parseInt(btn.dataset.num, 10));
      return;
    }
    var rm = e.target.closest('.compare-remove');
    if(rm){
      toggleFav(parseInt(rm.dataset.num, 10));
      renderCompareTable();
      return;
    }
  });

  function renderCompareTable(){
    var table = document.getElementById('compareTable');
    if(!table) return;
    var nums = Array.from(favs).sort(function(a,b){ return a-b; });
    if(nums.length === 0){
      table.innerHTML = '<tr><td class="compare-empty">Nog geen favorieten opgeslagen. Klik op het hartje bij een verblijf om het hier te tonen.</td></tr>';
      return;
    }
    var rows = [
      {label:'Land / plaats', get:function(d){ return esc(d.land) + (d.plaats ? ' &middot; ' + esc(d.plaats) : ''); }},
      {label:'Type', get:function(d){ return esc(d.type); }},
      {label:'Prijsindicatie', get:function(d){ return esc(d.prijs); }},
      {label:'Beste periode', get:function(d){ return esc(d.periode); }},
      {label:'Voorzieningen', get:function(d){
        if(!d.voorzieningen || !d.voorzieningen.length) return '';
        return '<ul>' + d.voorzieningen.map(function(v){ return '<li>' + esc(v) + '</li>'; }).join('') + '</ul>';
      }},
      {label:'Website', get:function(d){
        return d.website ? '<a href="' + esc(d.website) + '" target="_blank" rel="noopener">Bezoek site &#8599;</a>' : '&#8212;';
      }},
      {label:'Pagina', get:function(d){
        var prefix = window.SITE_REL || '';
        var folder = d.kind === 'eten' ? 'eten/' : 'hotels/';
        return '<a href="' + prefix + folder + esc(d.slug) + '.html">Bekijk detailpagina &rarr;</a>';
      }}
    ];
    var head = '<tr><th class="row-label"></th>' + nums.map(function(n){
      var d = byNum[n];
      if(!d) return '';
      return '<th class="col-head">' + esc(d.naam) + '<br><button class="compare-remove" data-num="' + n + '" type="button">verwijderen</button></th>';
    }).join('') + '</tr>';
    var body = rows.map(function(r){
      return '<tr><th class="row-label">' + r.label + '</th>' + nums.map(function(n){
        var d = byNum[n];
        return '<td>' + (d ? r.get(d) : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    table.innerHTML = head + body;
  }
  window.SITE_RENDER_COMPARE = renderCompareTable;

  document.addEventListener('DOMContentLoaded', function(){
    var modal = document.getElementById('compareModal');
    var openBtn = document.getElementById('compareOpenBtn');
    var closeBtn = document.getElementById('compareCloseBtn');
    var clearBtn = document.getElementById('compareClearBtn');
    if(openBtn) openBtn.addEventListener('click', function(){ renderCompareTable(); modal.hidden = false; });
    if(closeBtn) closeBtn.addEventListener('click', function(){ modal.hidden = true; });
    if(modal) modal.addEventListener('click', function(e){ if(e.target === modal) modal.hidden = true; });
    if(clearBtn) clearBtn.addEventListener('click', function(){
      favs.clear(); saveFavs(favs); applyFavClasses(); updateCompareBar();
      if(modal && !modal.hidden) renderCompareTable();
      if(typeof window.SITE_ON_FAV_CHANGE === 'function') window.SITE_ON_FAV_CHANGE();
    });

    applyFavClasses();
    updateCompareBar();

    var navToggle = document.getElementById('navToggle');
    var siteNav = document.getElementById('siteNav');
    if(navToggle && siteNav){
      function closeNav(){
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
      function toggleNav(){
        var isOpen = siteNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
      navToggle.addEventListener('click', function(e){ e.stopPropagation(); toggleNav(); });
      siteNav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeNav); });
      document.addEventListener('click', function(e){
        if(siteNav.classList.contains('open') && !siteNav.contains(e.target) && e.target !== navToggle){
          closeNav();
        }
      });
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeNav();
      });
    }
  });
})();
