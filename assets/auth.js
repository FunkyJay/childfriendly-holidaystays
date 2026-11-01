// Authenticatie: login/registratie-modal, sessiebeheer, favorieten-sync, meldingsformulier.
(function(){
  var sb = window.sb;
  var currentUser = null;
  var currentIsAdmin = false;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // ---------- UI: auth modal + nav pill injection ----------
  function injectAuthUI(){
    if(document.getElementById('authModal')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="modal" id="authModal" hidden>',
      '  <div class="modal-box">',
      '    <button class="modal-close" id="authModalClose" type="button" aria-label="Sluiten">&times;</button>',
      '    <div id="authModalBody"></div>',
      '  </div>',
      '</div>',
      '<div class="modal" id="reportModal" hidden>',
      '  <div class="modal-box">',
      '    <button class="modal-close" id="reportModalClose" type="button" aria-label="Sluiten">&times;</button>',
      '    <div id="reportModalBody"></div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap);
    document.getElementById('authModalClose').addEventListener('click', function(){ hideModal('authModal'); });
    document.getElementById('reportModalClose').addEventListener('click', function(){ hideModal('reportModal'); });
    document.getElementById('authModal').addEventListener('click', function(e){ if(e.target.id === 'authModal') hideModal('authModal'); });
    document.getElementById('reportModal').addEventListener('click', function(e){ if(e.target.id === 'reportModal') hideModal('reportModal'); });
  }

  function showModal(id){ document.getElementById(id).hidden = false; }
  function hideModal(id){ document.getElementById(id).hidden = true; }

  function renderAuthBody(){
    var body = document.getElementById('authModalBody');
    if(currentUser){
      body.innerHTML =
        '<h3>Welkom' + (currentUser.email ? ', ' + esc(currentUser.email) : '') + '</h3>' +
        (currentIsAdmin ? '<p><a href="' + (window.SITE_REL||'') + 'admin.html" class="cta-website">Naar admin-paneel &rarr;</a></p>' : '') +
        '<p><button class="cta-website" id="authLogoutBtn" type="button">Uitloggen</button></p>';
      document.getElementById('authLogoutBtn').addEventListener('click', async function(){
        await sb.auth.signOut();
        hideModal('authModal');
      });
      return;
    }
    body.innerHTML =
      '<h3>Inloggen / Account aanmaken</h3>' +
      '<p class="auth-msg" id="authMsg"></p>' +
      '<form id="authForm">' +
      '  <input type="email" id="authEmail" placeholder="e-mailadres" required autocomplete="email">' +
      '  <input type="password" id="authPassword" placeholder="wachtwoord (min. 6 tekens)" required minlength="6" autocomplete="current-password">' +
      '  <div class="auth-btn-row">' +
      '    <button type="submit" class="cta-website" id="authLoginBtn">Inloggen</button>' +
      '    <button type="button" class="cta-website" id="authSignupBtn">Account aanmaken</button>' +
      '  </div>' +
      '</form>';
    document.getElementById('authForm').addEventListener('submit', function(e){
      e.preventDefault();
      doLogin();
    });
    document.getElementById('authSignupBtn').addEventListener('click', doSignup);
  }

  async function doLogin(){
    var email = document.getElementById('authEmail').value.trim();
    var password = document.getElementById('authPassword').value;
    var msg = document.getElementById('authMsg');
    msg.textContent = 'Bezig...';
    var { error } = await sb.auth.signInWithPassword({ email: email, password: password });
    if(error){ msg.textContent = 'Fout: ' + error.message; return; }
    hideModal('authModal');
  }

  async function doSignup(){
    var email = document.getElementById('authEmail').value.trim();
    var password = document.getElementById('authPassword').value;
    var msg = document.getElementById('authMsg');
    if(!email || password.length < 6){ msg.textContent = 'Vul e-mail en een wachtwoord van min. 6 tekens in.'; return; }
    msg.textContent = 'Bezig...';
    var { error } = await sb.auth.signUp({ email: email, password: password });
    if(error){ msg.textContent = 'Fout: ' + error.message; return; }
    msg.textContent = 'Account aangemaakt! Check je e-mail om te bevestigen, en log daarna in.';
  }

  // ---------- meldingsformulier (correctie of nieuwe plek) ----------
  function renderReportBody(num){
    var d = num ? (window.SITE_BY_NUM || {})[num] : null;
    var body = document.getElementById('reportModalBody');
    body.innerHTML =
      '<h3>' + (d ? 'Fout melden bij "' + esc(d.naam) + '"' : 'Nieuwe plek voorstellen') + '</h3>' +
      '<p class="auth-msg" id="reportMsg"></p>' +
      '<form id="reportForm">' +
      (d ? '' :
        '  <input type="text" id="reportNaam" placeholder="Naam van de plek" required>' +
        '  <input type="text" id="reportLand" placeholder="Land">' +
        '  <input type="text" id="reportPlaats" placeholder="Plaats">' +
        '  <input type="url" id="reportWebsite" placeholder="Website (optioneel)">' +
      '') +
      '  <textarea id="reportNote" placeholder="' + (d ? 'Wat klopt niet? Of wat moet aangepast worden?' : 'Vertel kort waarom deze plek kindvriendelijk is') + '" rows="4" required></textarea>' +
      '  <input type="email" id="reportEmail" placeholder="jouw e-mail (optioneel, voor terugkoppeling)">' +
      '  <button type="submit" class="cta-website">Versturen</button>' +
      '</form>';
    document.getElementById('reportForm').addEventListener('submit', async function(e){
      e.preventDefault();
      var msg = document.getElementById('reportMsg');
      msg.textContent = 'Versturen...';
      var payload = {};
      if(!d){
        payload = {
          naam: document.getElementById('reportNaam').value.trim(),
          land: document.getElementById('reportLand').value.trim(),
          plaats: document.getElementById('reportPlaats').value.trim(),
          website: document.getElementById('reportWebsite').value.trim()
        };
      }
      var row = {
        kind: d ? 'correction' : 'new_place',
        entry_id: d ? d.num : null,
        payload: payload,
        note: document.getElementById('reportNote').value.trim(),
        submitted_by: currentUser ? currentUser.id : null,
        submitter_email: document.getElementById('reportEmail').value.trim() || (currentUser ? currentUser.email : null)
      };
      var { error } = await sb.from('submissions').insert(row);
      if(error){ msg.textContent = 'Fout: ' + error.message; return; }
      msg.textContent = 'Bedankt! Je melding is verstuurd en wordt nagekeken.';
      document.getElementById('reportForm').reset();
    });
  }
  window.SITE_OPEN_REPORT = function(num){
    injectAuthUI();
    renderReportBody(num);
    showModal('reportModal');
  };

  // ---------- favorieten-sync met Supabase ----------
  async function syncFavoritesOnLogin(){
    if(!currentUser) return;
    var { data, error } = await sb.from('favorites').select('entry_id').eq('user_id', currentUser.id);
    if(error) return;
    var remoteNums = (data || []).map(function(r){ return r.entry_id; });
    var localFavs = window.SITE_FAVS || new Set();
    var merged = new Set(remoteNums);
    localFavs.forEach(function(n){ merged.add(n); });
    // push any local-only favorites up to the server
    var toInsert = Array.from(localFavs).filter(function(n){ return remoteNums.indexOf(n) === -1; })
      .map(function(n){ return { user_id: currentUser.id, entry_id: n }; });
    if(toInsert.length){ await sb.from('favorites').insert(toInsert); }
    window.SITE_FAVS = merged;
    try { localStorage.setItem('kfh_favorites_v1', JSON.stringify(Array.from(merged))); } catch(e){}
    if(typeof window.SITE_REFRESH_FAVS === 'function') window.SITE_REFRESH_FAVS();
  }

  var origToggleFavReady = false;
  function hookFavToggle(){
    if(origToggleFavReady) return;
    origToggleFavReady = true;
    document.addEventListener('click', function(e){
      var btn = e.target.closest('.fav-btn');
      if(!btn || !currentUser) return;
      var num = parseInt(btn.dataset.num, 10);
      // after site.js's own toggle already ran (localStorage), mirror to server
      setTimeout(function(){
        var isFav = (window.SITE_FAVS || new Set()).has(num);
        if(isFav){ sb.from('favorites').upsert({ user_id: currentUser.id, entry_id: num }); }
        else { sb.from('favorites').delete().eq('user_id', currentUser.id).eq('entry_id', num); }
      }, 0);
    });
  }

  // ---------- "Fout melden" knoppen toevoegen aan elke kaart/detailpagina ----------
  function addReportLinks(){
    document.querySelectorAll('.fav-btn[data-num]').forEach(function(btn){
      var num = parseInt(btn.dataset.num, 10);
      var panel = btn.closest('.info-panel');
      if(panel && !panel.querySelector('.report-link')){
        var a = document.createElement('a');
        a.className = 'report-link';
        a.href = '#';
        a.textContent = '⚠ Fout melden bij deze plek';
        a.addEventListener('click', function(e){ e.preventDefault(); window.SITE_OPEN_REPORT(num); });
        panel.appendChild(a);
      }
    });
  }

  function injectNavAuthLink(){
    var nav = document.getElementById('siteNav');
    if(!nav || nav.querySelector('.nav-auth-link')) return;
    var li = document.createElement('a');
    li.href = '#';
    li.className = 'nav-auth-link';
    li.textContent = 'Account';
    li.addEventListener('click', function(e){
      e.preventDefault();
      injectAuthUI();
      renderAuthBody();
      showModal('authModal');
    });
    nav.appendChild(li);

    // "nieuwe plek voorstellen" link, los van een specifieke entry
    var suggestLi = document.createElement('a');
    suggestLi.href = '#';
    suggestLi.className = 'nav-suggest-link';
    suggestLi.textContent = 'Plek voorstellen';
    suggestLi.addEventListener('click', function(e){
      e.preventDefault();
      injectAuthUI();
      window.SITE_OPEN_REPORT(null);
      showModal('reportModal');
    });
    nav.appendChild(suggestLi);
  }

  async function refreshAuthState(){
    var { data } = await sb.auth.getSession();
    currentUser = data && data.session ? data.session.user : null;
    currentIsAdmin = false;
    if(currentUser){
      var { data: adminRow } = await sb.from('admins').select('user_id').eq('user_id', currentUser.id).maybeSingle();
      currentIsAdmin = !!adminRow;
      syncFavoritesOnLogin();
    }
    window.SITE_CURRENT_USER = currentUser;
    window.SITE_IS_ADMIN = currentIsAdmin;
  }

  sb.auth.onAuthStateChange(function(){ refreshAuthState(); });

  document.addEventListener('DOMContentLoaded', function(){
    injectAuthUI();
    injectNavAuthLink();
    addReportLinks();
    hookFavToggle();
    refreshAuthState();
  });
})();
