(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var mapEl = document.getElementById('map');
    if(!mapEl || typeof L === 'undefined') return;

    var DATA = window.SITE_ENTRIES || [];
    var rel = window.SITE_REL || '';

    var map = L.map('map', {scrollWheelZoom: true}).setView([48.5, 10.5], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var CAT_COLORS = {
      smaller: '#ff5a4e', midrange: '#ec5aa8', luxury: '#ffa617', mountains: '#16b28a', unique: '#8b5cf6'
    };
    var CAT_LABELS = {
      smaller: 'Kleinschalig', midrange: 'Middenklasse', luxury: 'Luxe resorts', mountains: 'Bergvakanties', unique: 'Bijzonder'
    };

    var clusterGroups = {};
    var bounds = [];

    function esc(s){
      return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
      });
    }

    DATA.forEach(function(d){
      if(d.lat == null || d.lon == null) return;
      var cat = d.categorie;
      var color = CAT_COLORS[cat] || '#5b6470';
      if(!clusterGroups[cat]){
        clusterGroups[cat] = L.markerClusterGroup({
          iconCreateFunction: function(cluster){
            return L.divIcon({
              html: '<div style="background:' + color + ';color:#fff;width:2.1rem;height:2.1rem;border-radius:100px;display:flex;align-items:center;justify-content:center;font:700 .75rem sans-serif;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);">' + cluster.getChildCount() + '</div>',
              className: '', iconSize: [34, 34]
            });
          }
        });
      }
      var icon = L.divIcon({
        html: '<div style="background:' + color + ';width:1.05rem;height:1.05rem;border-radius:100px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);"></div>',
        className: '', iconSize: [16, 16]
      });
      var marker = L.marker([d.lat, d.lon], {icon: icon});
      var popup =
        '<div class="popup-name">' + esc(d.naam) + '</div>' +
        '<div class="popup-loc">' + esc(d.land) + (d.plaats ? ' &middot; ' + esc(d.plaats) : '') + '</div>' +
        '<a href="' + rel + 'hotels/' + esc(d.slug) + '.html">Bekijk pagina &rarr;</a>';
      marker.bindPopup(popup);
      clusterGroups[cat].addLayer(marker);
      bounds.push([d.lat, d.lon]);
    });

    Object.keys(clusterGroups).forEach(function(cat){
      map.addLayer(clusterGroups[cat]);
    });
    if(bounds.length){ map.fitBounds(bounds, {padding: [30, 30], maxZoom: 6}); }

    document.querySelectorAll('.map-legend input[type="checkbox"]').forEach(function(cb){
      cb.addEventListener('change', function(){
        var cat = cb.dataset.cat;
        var group = clusterGroups[cat];
        if(!group) return;
        if(cb.checked){ map.addLayer(group); } else { map.removeLayer(group); }
      });
    });
  });
})();
