// Vercel serverless function (Node runtime).
// Voegt een admin toe op basis van e-mailadres. Vereist dat de aanroeper zelf al
// ingelogd admin is (gecontroleerd via zijn JWT + de admins-tabel, met de service
// role key die hier server-side blijft en nooit naar de browser gaat).
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = req.headers.authorization || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');

  if (!jwt) {
    res.status(401).json({ error: 'Niet ingelogd' });
    return;
  }

  try {
    // 1. wie is de aanroeper?
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${jwt}` }
    });
    if (!userResp.ok) { res.status(401).json({ error: 'Ongeldige sessie' }); return; }
    const callingUser = await userResp.json();

    // 2. is de aanroeper admin?
    const checkResp = await fetch(
      `${SUPABASE_URL}/rest/v1/admins?user_id=eq.${callingUser.id}&select=user_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const checkRows = await checkResp.json();
    if (!Array.isArray(checkRows) || checkRows.length === 0) {
      res.status(403).json({ error: 'Geen admin-rechten' });
      return;
    }

    const { email } = req.body || {};
    if (!email) { res.status(400).json({ error: 'E-mailadres ontbreekt' }); return; }

    // 3. zoek de doel-gebruiker op e-mail
    const lookupResp = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const lookupData = await lookupResp.json();
    const users = lookupData.users || lookupData || [];
    const target = Array.isArray(users) ? users.find(u => u.email === email) : null;
    if (!target) {
      res.status(404).json({ error: 'Geen gebruiker met dit e-mailadres gevonden. Die persoon moet eerst zelf een account aanmaken.' });
      return;
    }

    // 4. voeg toe aan admins-tabel
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/admins`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ user_id: target.id, added_by: callingUser.id })
    });
    if (!insertResp.ok) {
      const errBody = await insertResp.text();
      res.status(500).json({ error: 'Opslaan mislukt: ' + errBody });
      return;
    }

    res.status(200).json({ success: true, user_id: target.id, email: target.email });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
