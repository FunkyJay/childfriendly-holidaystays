// Supabase client init — gedeeld door alle pagina's.
// De anon key is bewust publiek (client-side) zichtbaar: alle beveiliging zit in
// Row Level Security policies op de database, niet in het verbergen van deze key.
window.SUPABASE_URL = 'https://qymkvmvutwhpxincroqx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_N4ReAcgPKPe2xJWSKq2_6Q_v-ES6Ugu';

window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
