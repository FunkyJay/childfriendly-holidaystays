(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var searchInput = document.getElementById('searchInput');
    if(!searchInput) return; // not on a page with the filter bar

    var categoryFilter = document.getElementById('categoryFilter');
    var countryFilter = document.getElementById('countryFilter');
    var capacityFilter = document.getElementById('capacityFilter');
    var favOnlyToggle = document.getElementById('favOnlyToggle');
    var resultCount = document.getElementById('resultCount');
    var noResults = document.getElementById('noResults');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));

    function runFilter(){
      var q = searchInput.value.trim().toLowerCase();
      var cat = categoryFilter.value;
      var country = countryFilter.value;
      var minCapacity = capacityFilter && capacityFilter.value ? parseInt(capacityFilter.value, 10) : 0;
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
        if(favOnly && !favs.has(num)) matches = false;
        card.style.display = matches ? '' : 'none';
        if(matches) visibleCount++;
      });

      document.querySelectorAll('.category').forEach(function(section){
        var grid = section.querySelector('.grid');
        if(!grid) return;
        var children = Array.prototype.slice.call(grid.children);
        var sectionHasVisible = false;
        var pendingHeading = null;
        children.forEach(function(el){
          if(el.classList.contains('land-heading')){
            pendingHeading = el;
            pendingHeading.style.display = 'none';
          } else if(el.classList.contains('card')){
            if(el.style.display !== 'none'){
              sectionHasVisible = true;
              if(pendingHeading){ pendingHeading.style.display = ''; pendingHeading = null; }
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
    var resetBtn = document.getElementById('filterResetBtn');
    if(resetBtn) resetBtn.addEventListener('click', function(){
      searchInput.value = ''; categoryFilter.value = ''; countryFilter.value = '';
      if(capacityFilter) capacityFilter.value = '';
      favOnlyToggle.checked = false;
      runFilter();
    });

    window.SITE_ON_FAV_CHANGE = function(){
      if(favOnlyToggle.checked) runFilter();
    };

    runFilter();
  });
})();
