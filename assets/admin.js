(function(){
  var sb = window.sb;
  var ENTRY_FIELDS = ['id','naam','land','plaats','type','prijs','periode','website','categorie','slug','lat','lon','kind','image_url','checked_at'];
  var allEntries = [];
  var editingId = null;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // ---------- gate ----------
  async function checkGate(){
    var { data } = await sb.auth.getSession();
    var user = data && data.session ? data.session.user : null;
    if(!user){ showGate(); return; }
    var { data: adminRow } = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if(!adminRow){
      document.getElementById('gateMsg').textContent = 'Ingelogd, maar dit account is geen admin.';
      showGate();
      return;
    }
    document.getElementById('gate').hidden = true;
    document.getElementById('adminContent').hidden = false;
    loadEntries();
    loadSubmissions();
    loadAdmins();
  }
  function showGate(){
    document.getElementById('gate').hidden = false;
    document.getElementById('adminContent').hidden = true;
  }

  document.getElementById('gateLoginBtn').addEventListener('click', async function(){
    var email = document.getElementById('gateEmail').value.trim();
    var password = document.getElementById('gatePassword').value;
    var msg = document.getElementById('gateMsg');
    msg.textContent = 'Bezig...';
    var { error } = await sb.auth.signInWithPassword({ email: email, password: password });
    if(error){ msg.textContent = 'Fout: ' + error.message; return; }
    checkGate();
  });
  document.getElementById('logoutBtn').addEventListener('click', async function(){
    await sb.auth.signOut();
    showGate();
  });

  // ---------- tabs ----------
  document.querySelectorAll('.admin-tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.admin-tab').forEach(function(b){ b.classList.remove('active'); });
      document.querySelectorAll('.admin-panel').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ---------- ENTRIES ----------
  async function loadEntries(){
    var { data, error } = await sb.from('entries').select('*').order('id');
    if(error){ alert('Fout bij laden: ' + error.message); return; }
    allEntries = data;
    renderEntriesTable(allEntries);
  }

  function renderEntriesTable(rows){
    var table = document.getElementById('entriesTable');
    var head = '<tr><th>ID</th><th>Naam</th><th>Land</th><th>Plaats</th><th>Soort</th><th>Website</th><th>Acties</th></tr>';
    var body = rows.map(function(r){
      return '<tr>' +
        '<td>' + r.id + '</td>' +
        '<td>' + esc(r.naam) + '</td>' +
        '<td>' + esc(r.land) + '</td>' +
        '<td>' + esc(r.plaats) + '</td>' +
        '<td>' + esc(r.kind) + '</td>' +
        '<td>' + (r.website ? '<a href="' + esc(r.website) + '" target="_blank">site</a>' : '') + '</td>' +
        '<td class="admin-actions">' +
          '<button data-edit="' + r.id + '">Bewerk</button>' +
          '<button data-del="' + r.id + '" class="danger">Verwijder</button>' +
        '</td>' +
      '</tr>';
    }).join('');
    table.innerHTML = head + body;
    table.querySelectorAll('[data-edit]').forEach(function(b){
      b.addEventListener('click', function(){ openEntryForm(parseInt(b.dataset.edit, 10)); });
    });
    table.querySelectorAll('[data-del]').forEach(function(b){
      b.addEventListener('click', function(){ deleteEntry(parseInt(b.dataset.del, 10)); });
    });
  }

  document.getElementById('entrySearch').addEventListener('input', function(){
    var q = this.value.toLowerCase();
    renderEntriesTable(allEntries.filter(function(r){
      return (r.naam||'').toLowerCase().indexOf(q) !== -1 ||
             (r.plaats||'').toLowerCase().indexOf(q) !== -1 ||
             (r.land||'').toLowerCase().indexOf(q) !== -1;
    }));
  });

  function entryFormHtml(d){
    d = d || {};
    function f(name, label, type){
      type = type || 'text';
      return '<label>' + label + '<input type="' + type + '" id="f_' + name + '" value="' + esc(d[name] != null ? d[name] : '') + '"></label>';
    }
    return [
      '<h3>' + (d.id ? 'Plek #' + d.id + ' bewerken' : 'Nieuwe plek') + '</h3>',
      f('id','ID (uniek nummer)','number'),
      f('naam','Naam'),
      f('land','Land'),
      f('plaats','Plaats'),
      '<label>Soort<select id="f_kind"><option value="verblijf"' + (d.kind==='verblijf'?' selected':'') + '>verblijf</option><option value="eten"' + (d.kind==='eten'?' selected':'') + '>eten</option></select></label>',
      f('type','Type'),
      f('prijs','Prijs'),
      f('periode','Periode'),
      f('website','Website','url'),
      f('categorie','Categorie'),
      f('slug','Slug'),
      f('lat','Latitude','number'),
      f('lon','Longitude','number'),
      f('image_url','Afbeelding (pad/URL)'),
      f('checked_at','Laatst gecontroleerd','date'),
      '<label class="span2">Voorzieningen (één per regel)<textarea id="f_voorzieningen" rows="4">' + esc((d.voorzieningen||[]).join('\n')) + '</textarea></label>',
      '<div class="form-actions"><button class="cta-website" id="saveEntryBtn">Opslaan</button><button class="cta-website" id="cancelEntryBtn" style="background:#999;">Annuleren</button></div>'
    ].join('');
  }

  function openEntryForm(id){
    var d = id ? allEntries.find(function(e){ return e.id === id; }) : {};
    editingId = id || null;
    var form = document.getElementById('entryForm');
    form.innerHTML = entryFormHtml(d);
    form.classList.add('active');
    document.getElementById('saveEntryBtn').addEventListener('click', saveEntry);
    document.getElementById('cancelEntryBtn').addEventListener('click', function(){ form.classList.remove('active'); });
    form.scrollIntoView({ behavior: 'smooth' });
  }
  document.getElementById('newEntryBtn').addEventListener('click', function(){ openEntryForm(null); });

  async function saveEntry(){
    var row = {
      id: parseInt(document.getElementById('f_id').value, 10),
      naam: document.getElementById('f_naam').value.trim(),
      land: document.getElementById('f_land').value.trim(),
      plaats: document.getElementById('f_plaats').value.trim(),
      kind: document.getElementById('f_kind').value,
      type: document.getElementById('f_type').value.trim(),
      prijs: document.getElementById('f_prijs').value.trim(),
      periode: document.getElementById('f_periode').value.trim(),
      website: document.getElementById('f_website').value.trim() || null,
      categorie: document.getElementById('f_categorie').value.trim(),
      slug: document.getElementById('f_slug').value.trim(),
      lat: parseFloat(document.getElementById('f_lat').value) || null,
      lon: parseFloat(document.getElementById('f_lon').value) || null,
      image_url: document.getElementById('f_image_url').value.trim() || null,
      checked_at: document.getElementById('f_checked_at').value || null,
      voorzieningen: document.getElementById('f_voorzieningen').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean)
    };
    if(!row.id || !row.naam){ alert('ID en naam zijn verplicht.'); return; }
    var { error } = await sb.from('entries').upsert(row);
    if(error){ alert('Fout bij opslaan: ' + error.message); return; }
    document.getElementById('entryForm').classList.remove('active');
    loadEntries();
  }

  async function deleteEntry(id){
    if(!confirm('Plek #' + id + ' definitief verwijderen?')) return;
    var { error } = await sb.from('entries').delete().eq('id', id);
    if(error){ alert('Fout: ' + error.message); return; }
    loadEntries();
  }

  // ---------- SUBMISSIONS ----------
  async function loadSubmissions(){
    var { data, error } = await sb.from('submissions').select('*').order('created_at', { ascending: false });
    if(error){ document.getElementById('submissionsList').textContent = 'Fout: ' + error.message; return; }
    var pending = data.filter(function(s){ return s.status === 'pending'; });
    document.getElementById('pendingCount').textContent = pending.length;
    var list = document.getElementById('submissionsList');
    if(!data.length){ list.innerHTML = '<p>Geen meldingen.</p>'; return; }
    list.innerHTML = data.map(function(s){
      var entry = s.entry_id ? allEntries.find(function(e){ return e.id === s.entry_id; }) : null;
      var title = s.kind === 'new_place' ? 'Nieuwe plek: ' + esc((s.payload||{}).naam || '?') : 'Correctie bij: ' + esc(entry ? entry.naam : ('#' + s.entry_id));
      return '<div style="background:#fff; border-radius:12px; padding:1rem; margin-bottom:.8rem;">' +
        '<p><strong>' + title + '</strong> <span class="pill pill-' + s.status + '">' + s.status + '</span></p>' +
        '<p style="font-size:.85rem; color:#666;">' + esc(s.note || '') + '</p>' +
        (Object.keys(s.payload||{}).length ? '<pre style="font-size:.75rem; background:#f6f5f2; padding:.5rem; border-radius:6px; overflow-x:auto;">' + esc(JSON.stringify(s.payload, null, 1)) + '</pre>' : '') +
        '<p style="font-size:.75rem; color:#999;">Ingediend: ' + (s.submitter_email || 'anoniem') + ' &middot; ' + new Date(s.created_at).toLocaleString('nl-BE') + '</p>' +
        (s.status === 'pending' ?
          '<div class="admin-actions">' +
            '<button class="good" data-approve="' + s.id + '">Goedkeuren</button>' +
            '<button class="danger" data-reject="' + s.id + '">Afwijzen</button>' +
          '</div>' : '') +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-approve]').forEach(function(b){
      b.addEventListener('click', function(){ approveSubmission(parseInt(b.dataset.approve, 10)); });
    });
    list.querySelectorAll('[data-reject]').forEach(function(b){
      b.addEventListener('click', function(){ reviewSubmission(parseInt(b.dataset.reject, 10), 'rejected'); });
    });
  }

  async function approveSubmission(id){
    var { data: subs } = await sb.from('submissions').select('*').eq('id', id).single();
    if(!subs) return;
    if(subs.kind === 'correction' && subs.entry_id){
      var patch = {};
      Object.keys(subs.payload || {}).forEach(function(k){ if(subs.payload[k]) patch[k] = subs.payload[k]; });
      if(Object.keys(patch).length){
        await sb.from('entries').update(patch).eq('id', subs.entry_id);
      }
    } else if(subs.kind === 'new_place'){
      var { data: maxRow } = await sb.from('entries').select('id').order('id', { ascending: false }).limit(1).single();
      var newId = (maxRow ? maxRow.id : 0) + 1;
      await sb.from('entries').insert({
        id: newId, naam: subs.payload.naam || 'Onbekend', land: subs.payload.land,
        plaats: subs.payload.plaats, website: subs.payload.website, kind: 'verblijf',
        categorie: 'eigen'
      });
    }
    await reviewSubmission(id, 'approved');
    loadEntries();
  }

  async function reviewSubmission(id, status){
    var { data: userData } = await sb.auth.getSession();
    await sb.from('submissions').update({
      status: status, reviewed_at: new Date().toISOString(),
      reviewed_by: userData.session.user.id
    }).eq('id', id);
    loadSubmissions();
  }

  // ---------- USERS / ADMINS ----------
  async function loadAdmins(){
    var { data, error } = await sb.from('admins').select('user_id, added_at');
    var table = document.getElementById('adminsTable');
    if(error){ table.innerHTML = 'Fout: ' + error.message; return; }
    var ids = data.map(function(a){ return a.user_id; });
    var profilesById = {};
    if(ids.length){
      var { data: profiles } = await sb.from('profiles').select('id, display_name, email').in('id', ids);
      (profiles || []).forEach(function(p){ profilesById[p.id] = p; });
    }
    table.innerHTML = '<tr><th>Naam</th><th>E-mail</th><th>Admin sinds</th></tr>' +
      data.map(function(a){
        var p = profilesById[a.user_id];
        return '<tr><td>' + esc(p ? p.display_name : '—') + '</td><td>' + esc(p ? p.email : a.user_id) + '</td><td>' + new Date(a.added_at).toLocaleDateString('nl-BE') + '</td></tr>';
      }).join('');
  }

  document.getElementById('addAdminBtn').addEventListener('click', async function(){
    var email = document.getElementById('newAdminEmail').value.trim();
    var msg = document.getElementById('usersMsg');
    if(!email){ msg.textContent = 'Vul een e-mailadres in.'; return; }
    msg.textContent = 'Bezig...';
    var { data: sessionData } = await sb.auth.getSession();
    var token = sessionData && sessionData.session ? sessionData.session.access_token : null;
    try {
      var resp = await fetch('/api/add-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ email: email })
      });
      var result = await resp.json();
      if(!resp.ok){ msg.textContent = 'Fout: ' + (result.error || resp.statusText); return; }
      msg.textContent = result.email + ' is nu admin.';
      document.getElementById('newAdminEmail').value = '';
      loadAdmins();
    } catch(e){
      msg.textContent = 'Fout: ' + e;
    }
  });

  checkGate();
  sb.auth.onAuthStateChange(function(){ checkGate(); });
})();
