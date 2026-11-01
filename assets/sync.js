// Houdt de publieke lijstpagina's (index.html, eten.html) synchroon met de database:
// haalt bij elk paginabezoek de actuele data op en past bestaande kaarten aan,
// voegt nieuwe plekken toe en verwijdert kaarten van verwijderde plekken —
// zonder dat de site opnieuw gedeployed moet worden na een admin-wijziging.
(function(){
  var sb = window.sb;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function cardHtml(d){
    var prefix = window.SITE_REL || '';
    var folder = d.kind === 'eten' ? 'eten/' : 'hotels/';
    var href = prefix + folder + esc(d.slug || d.id) + '.html';
    var flagMap = {'België':'🇧🇪','Frankrijk':'🇫🇷','Oostenrijk':'🇦🇹','Duitsland':'🇩🇪','Luxemburg':'🇱🇺','Nederland':'🇳🇱','Spanje':'🇪🇸','Tsjechië':'🇨🇿','Hongarije':'🇭🇺','Italië':'🇮🇹','Portugal':'🇵🇹','Griekenland':'🇬🇷','Slovenië':'🇸🇮'};
    var flag = flagMap[d.land] || '';
    var photo = d.image_url
      ? '<img src="' + prefix + esc(d.image_url) + '" alt="' + esc(d.naam) + '" loading="lazy">'
      : '<div class="card-photo-placeholder">' + esc((d.naam||'?').charAt(0)) + '</div>';
    var search = (d.naam + ' ' + (d.land||'') + ' ' + (d.plaats||'') + ' ' + (d.type||'')).toLowerCase();
    return '<article class="card" id="e' + d.id + '" data-num="' + d.id + '" data-category="' + esc(d.categorie||'') + '" ' +
      'data-land="' + esc(d.land||'') + '" data-facilities="" data-search="' + esc(search) + '" data-sync-added="1">' +
      '<a class="card-photo-link" href="' + href + '"><div class="card-photo">' + photo + '<span class="card-num mono">' + String(d.id).padStart(4,'0') + '</span></div></a>' +
      '<button class="fav-btn" type="button" data-num="' + d.id + '" aria-pressed="false" aria-label="Bewaar ' + esc(d.naam) + ' als favoriet">&#9825;</button>' +
      '<div class="card-body"><div>' +
      '<a class="card-name-link" href="' + href + '"><h4 class="card-name">' + esc(d.naam) + '</h4></a>' +
      '<p class="card-loc">' + flag + '&nbsp;' + esc(d.land||'') + (d.plaats ? ' &middot; ' + esc(d.plaats) : '') + '</p>' +
      '</div><div class="card-foot"><a class="card-route" href="#">&#128663; Route</a></div></div>' +
      '</article>';
  }

  async function sync(){
    if(!document.querySelector('.card')) return; // geen lijstpagina
    var isEten = document.body.dataset.unit && document.body.dataset.unit.indexOf('eten') !== -1 ||
                 document.querySelector('[id^="cat-horeca"]') != null;
    var kind = isEten ? 'eten' : 'verblijf';

    var { data, error } = await sb.from('entries').select('*').eq('kind', kind);
    if(error || !data) return;

    var byId = {};
    data.forEach(function(d){ byId[d.id] = d; });

    // 1. bestaande kaarten updaten of verwijderen
    document.querySelectorAll('.card[data-num]').forEach(function(card){
      var num = parseInt(card.dataset.num, 10);
      var d = byId[num];
      if(!d){ card.remove(); return; } // verwijderd in admin
      var nameEl = card.querySelector('.card-name');
      if(nameEl && nameEl.textContent !== d.naam) nameEl.textContent = d.naam;
      var locEl = card.querySelector('.card-loc');
      if(locEl){
        var flagMap = {'België':'🇧🇪','Frankrijk':'🇫🇷','Oostenrijk':'🇦🇹','Duitsland':'🇩🇪','Luxemburg':'🇱🇺','Nederland':'🇳🇱','Spanje':'🇪🇸','Tsjechië':'🇨🇿','Hongarije':'🇭🇺'};
        var flag = flagMap[d.land] || '';
        locEl.innerHTML = flag + '&nbsp;' + esc(d.land||'') + (d.plaats ? ' &middot; ' + esc(d.plaats) : '');
      }
      if(d.image_url){
        var img = card.querySelector('.card-photo img');
        var ph = card.querySelector('.card-photo-placeholder');
        var prefix = window.SITE_REL || '';
        if(img){ if(img.getAttribute('src') !== prefix + d.image_url) img.setAttribute('src', prefix + d.image_url); }
        else if(ph){
          var newImg = document.createElement('img');
          newImg.src = prefix + d.image_url; newImg.alt = d.naam; newImg.loading = 'lazy';
          ph.replaceWith(newImg);
        }
      }
      card.dataset.land = d.land || '';
      card.dataset.category = d.categorie || card.dataset.category;
      window.SITE_BY_NUM[num] = Object.assign({}, window.SITE_BY_NUM[num], {
        naam: d.naam, land: d.land, plaats: d.plaats, website: d.website,
        prijs: d.prijs, periode: d.periode, type: d.type, voorzieningen: d.voorzieningen,
        lat: d.lat, lon: d.lon, checked_at: d.checked_at, image_url: d.image_url
      });
      delete byId[num]; // afgehandeld
    });

    // 2. nieuwe plekken (via admin toegevoegd) onderaan de passende categorie-sectie tonen
    var newOnes = Object.keys(byId).map(function(k){ return byId[k]; });
    if(newOnes.length){
      var fallbackSection = document.querySelector('.category .grid');
      newOnes.forEach(function(d){
        var section = document.getElementById('cat-' + d.categorie);
        var grid = section ? section.querySelector('.grid') : fallbackSection;
        if(!grid) return;
        grid.insertAdjacentHTML('beforeend', cardHtml(d));
        window.SITE_BY_NUM[d.id] = d;
      });
    }

    if(typeof window.SITE_REFRESH_CARDS === 'function') window.SITE_REFRESH_CARDS();
    if(typeof window.SITE_REFRESH_FAVS === 'function') window.SITE_REFRESH_FAVS();
    if(typeof window.SITE_REFRESH_BADGES === 'function') window.SITE_REFRESH_BADGES();
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(sync, 50); // na site.js/filter.js init
  });
})();
