(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var searchInput = document.getElementById('searchInput');
    if(!searchInput) return; // not on a page with the filter bar

    var categoryFilter = document.getElementById('categoryFilter');
    var countryFilter = document.getElementById('countryFilter');
    var capacityFilter = document.getElementById('capacityFilter');
    var facilityFilter = document.getElementById('facilityFilter');
    var favOnlyToggle = document.getElementById('favOnlyToggle');
    var resultCount = document.getElementById('resultCount');
    var noResults = document.getElementById('noResults');
    var nearMeBtn = document.getElementById('nearMeBtn');
    var sortDistanceToggle = document.getElementById('sortDistanceToggle');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
    var byNum = window.SITE_BY_NUM || {};

    var userLoc = null; // {lat, lon}
    var LOC_KEY = 'kfh_user_location_v1';
    try {
      var saved = JSON.parse(localStorage.getItem(LOC_KEY) || 'null');
      if(saved && typeof saved.lat === 'number' && typeof saved.lon === 'number') userLoc = saved;
    } catch(e){}

    function haversineKm(lat1, lon1, lat2, lon2){
      var R = 6371;
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    function updateDistanceBadges(){
      if(!userLoc) return;
      cards.forEach(function(card){
        var num = parseInt(card.dataset.num, 10);
        var d = byNum[num];
        if(!d || d.lat == null || d.lon == null) return;
        var km = haversineKm(userLoc.lat, userLoc.lon, d.lat, d.lon);
        card.dataset.distanceKm = km.toFixed(1);
        var badge = card.querySelector('.card-distance');
        var photoBox = card.querySelector('.card-photo');
        var text = Math.round(km) + ' km';
        if(!badge && photoBox){
          badge = document.createElement('span');
          badge.className = 'card-distance';
          photoBox.insertBefore(badge, photoBox.firstChild);
        }
        if(badge) badge.textContent = '📍 ' + text;
      });
    }

    function setUserLocation(lat, lon){
      userLoc = {lat: lat, lon: lon};
      try { localStorage.setItem(LOC_KEY, JSON.stringify(userLoc)); } catch(e){}
      updateDistanceBadges();
      if(sortDistanceToggle){ sortDistanceToggle.disabled = false; }
      runFilter();
    }
    window.SITE_SET_USER_LOCATION = setUserLocation;

    if(nearMeBtn){
      nearMeBtn.addEventListener('click', function(){
        if(!navigator.geolocation){
          alert('Locatiebepaling wordt niet ondersteund door je browser.');
          return;
        }
        nearMeBtn.disabled = true;
        nearMeBtn.textContent = '📍 Locatie opvragen…';
        navigator.geolocation.getCurrentPosition(function(pos){
          setUserLocation(pos.coords.latitude, pos.coords.longitude);
          nearMeBtn.disabled = false;
          nearMeBtn.textContent = '📍 Bij mij in de buurt ✓';
        }, function(err){
          nearMeBtn.disabled = false;
          nearMeBtn.textContent = '📍 Bij mij in de buurt';
          alert('Kon je locatie niet bepalen. Controleer of locatietoegang is toegestaan.');
        }, {timeout: 10000});
      });
      if(userLoc){ nearMeBtn.textContent = '📍 Bij mij in de buurt ✓'; }
    }

    if(sortDistanceToggle){
      sortDistanceToggle.disabled = !userLoc;
    }

    if(userLoc) updateDistanceBadges();

    function runFilter(){
      var q = searchInput.value.trim().toLowerCase();
      var cat = categoryFilter.value;
      var country = countryFilter.value;
      var minCapacity = capacityFilter && capacityFilter.value ? parseInt(capacityFilter.value, 10) : 0;
      var facility = facilityFilter ? facilityFilter.value : '';
      var favOnly = favOnlyToggle.checked;
      var favs = window.SITE_FAVS || new Set();
      var visibleCount = 0;

      cards.forEach(function(card){
        var num = parseInt(card.dataset.num, 10);
        var matches = true;
        if(q && card.dataset.search.indexOf(q) === -1) matches = false;
        if(cat && card.dataset.category !== cat) matches = false;
        if(country && card.dataset.land !== country) matches = false;
        if(minCapacity && parseInt(card.dataset.capacity, 10) < minCapacity) matches = false;
        if(facility && (card.dataset.facilities || '').split(',').indexOf(facility) === -1) matches = false;
        if(favOnly && !favs.has(num)) matches = false;
        card.style.display = matches ? '' : 'none';
        if(matches) visibleCount++;
      });

      var sortByDistance = sortDistanceToggle && sortDistanceToggle.checked && userLoc;

      document.querySelectorAll('.category').forEach(function(section){
        var grid = section.querySelector('.grid');
        if(!grid) return;
        var children = Array.prototype.slice.call(grid.children);

        if(sortByDistance){
          // reorder visible cards within this grid by distance, push land-headings out of the way
          var cardsInGrid = children.filter(function(el){ return el.classList.contains('card'); });
          cardsInGrid.sort(function(a, b){
            var da = parseFloat(a.dataset.distanceKm);
            var db = parseFloat(b.dataset.distanceKm);
            if(isNaN(da)) da = Infinity;
            if(isNaN(db)) db = Infinity;
            return da - db;
          });
          cardsInGrid.forEach(function(c){ grid.appendChild(c); });
          // hide all land-headings when sorting by distance (order no longer grouped by country)
          grid.querySelectorAll('.land-heading').forEach(function(h){ h.style.display = 'none'; });
        }

        var sectionHasVisible = false;
        var pendingHeading = null;
        Array.prototype.slice.call(grid.children).forEach(function(el){
          if(el.classList.contains('land-heading')){
            pendingHeading = el;
            if(!sortByDistance) pendingHeading.style.display = 'none';
          } else if(el.classList.contains('card')){
            if(el.style.display !== 'none'){
              sectionHasVisible = true;
              if(pendingHeading && !sortByDistance){ pendingHeading.style.display = ''; pendingHeading = null; }
            }
          }
        });
        section.style.display = sectionHasVisible ? '' : 'none';
      });

      var unitLabel = document.body.dataset.unit || 'resultaten';
      resultCount.textContent = visibleCount + ' van ' + cards.length + ' ' + unitLabel;
      noResults.classList.toggle('show', visibleCount === 0);
    }

    searchInput.addEventListener('input', runFilter);
    categoryFilter.addEventListener('change', runFilter);
    countryFilter.addEventListener('change', runFilter);
    favOnlyToggle.addEventListener('change', runFilter);
    if(capacityFilter) capacityFilter.addEventListener('change', runFilter);
    if(facilityFilter) facilityFilter.addEventListener('change', runFilter);
    if(sortDistanceToggle) sortDistanceToggle.addEventListener('change', runFilter);
    var resetBtn = document.getElementById('filterResetBtn');
    if(resetBtn) resetBtn.addEventListener('click', function(){
      searchInput.value = ''; categoryFilter.value = ''; countryFilter.value = '';
      if(capacityFilter) capacityFilter.value = '';
      if(facilityFilter) facilityFilter.value = '';
      favOnlyToggle.checked = false;
      if(sortDistanceToggle) sortDistanceToggle.checked = false;
      runFilter();
    });

    window.SITE_ON_FAV_CHANGE = function(){
      if(favOnlyToggle.checked) runFilter();
    };

    runFilter();
  });
})();
