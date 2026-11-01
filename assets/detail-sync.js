// Houdt elke individuele detailpagina (hotels/*.html, eten/*.html) synchroon met
// de database: als een admin de plek bewerkt of verwijdert, zie je dat direct
// zonder dat de site opnieuw gedeployed moet worden.
(function(){
  var sb = window.sb;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  var FLAG_MAP = {'België':'🇧🇪','Frankrijk':'🇫🇷','Oostenrijk':'🇦🇹','Duitsland':'🇩🇪','Luxemburg':'🇱🇺','Nederland':'🇳🇱','Spanje':'🇪🇸','Tsjechië':'🇨🇿','Hongarije':'🇭🇺','Italië':'🇮🇹','Portugal':'🇵🇹','Griekenland':'🇬🇷','Slovenië':'🇸🇮'};

  function setRowValue(label, value){
    document.querySelectorAll('.info-row').forEach(function(row){
      var lbl = row.querySelector('.label');
      if(lbl && lbl.textContent.trim() === label){
        var val = row.querySelector('.value');
        if(val && value) val.textContent = value;
      }
    });
  }

  function showGoneBanner(){
    var body = document.querySelector('.detail-body');
    if(!body) return;
    var banner = document.createElement('div');
    banner.style.cssText = 'max-width:var(--maxw);margin:0 auto;padding:1rem 1.75rem;background:#fdeeee;color:#a33;font-weight:600;text-align:center;';
    banner.textContent = 'Deze plek is niet langer beschikbaar in de reisgids.';
    body.parentNode.insertBefore(banner, body);
  }

  async function sync(){
    var btn = document.querySelector('.fav-btn-lg[data-num]');
    if(!btn || !sb) return;
    var num = parseInt(btn.dataset.num, 10);

    var { data: d, error } = await sb.from('entries').select('*').eq('id', num).maybeSingle();
    if(error) return;
    if(!d){ showGoneBanner(); return; }

    var titleEl = document.querySelector('.detail-title');
    if(titleEl && titleEl.textContent !== d.naam){
      titleEl.textContent = d.naam;
      document.title = d.naam + ' — Familiereisgids';
    }
    var locEl = document.querySelector('.detail-loc');
    if(locEl){
      var flag = FLAG_MAP[d.land] || '';
      locEl.innerHTML = flag + '&nbsp;' + esc(d.land||'') + (d.plaats ? ' &middot; ' + esc(d.plaats) : '');
    }
    var descEl = document.querySelector('.detail-desc');
    // de beschrijving komt uit de meta-description van de oorspronkelijke pagina,
    // niet uit een los databaseveld — alleen aanpassen als een admin dat later toevoegt.

    setRowValue('Type', d.type);
    setRowValue('Prijsindicatie', d.prijs);
    setRowValue('Beste periode', d.periode);

    var websiteLink = document.querySelector('.cta-website');
    if(websiteLink && d.website && websiteLink.getAttribute('href') !== d.website){
      websiteLink.setAttribute('href', d.website);
    }

    var miniMap = document.getElementById('miniMap');
    if(miniMap && d.lat != null && d.lon != null){
      miniMap.dataset.lat = d.lat;
      miniMap.dataset.lon = d.lon;
      miniMap.dataset.name = d.naam;
    }

    if(d.voorzieningen && d.voorzieningen.length){
      var chipsBox = document.querySelector('.detail-chips');
      if(chipsBox){
        chipsBox.innerHTML = d.voorzieningen.map(function(v){ return '<span class="detail-chip">' + esc(v) + '</span>'; }).join('');
      }
    }

    if(d.image_url){
      var galleryImg = document.querySelector('.gallery-main img, .gallery-main .gallery-placeholder');
      var prefix = window.SITE_REL || '';
      if(galleryImg){
        if(galleryImg.tagName === 'IMG'){
          if(galleryImg.getAttribute('src') !== prefix + d.image_url) galleryImg.setAttribute('src', prefix + d.image_url);
        } else {
          var img = document.createElement('img');
          img.src = prefix + d.image_url; img.alt = d.naam; img.loading = 'lazy';
          galleryImg.replaceWith(img);
        }
      }
    }

    window.SITE_BY_NUM[num] = Object.assign({}, window.SITE_BY_NUM[num], d);
    if(typeof window.SITE_REFRESH_BADGES === 'function') window.SITE_REFRESH_BADGES();
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(sync, 50);
  });
})();
