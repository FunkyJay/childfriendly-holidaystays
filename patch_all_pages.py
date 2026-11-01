import re, os, glob

ROOT = '.'

SB_CDN = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'

def patch_file(path, depth_prefix):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    orig = content

    site_tag = f'<script src="{depth_prefix}assets/site.js"></script>'
    if site_tag not in content:
        return False, 'no-site-tag'

    insert = (
        f'{SB_CDN}\n'
        f'<script src="{depth_prefix}assets/supabase-client.js"></script>\n'
        f'<script src="{depth_prefix}assets/auth.js"></script>\n'
    )
    if 'supabase-client.js' in content:
        return False, 'already-patched'

    content = content.replace(site_tag, insert + site_tag, 1)

    # sync.js alleen op lijstpagina's (index.html, eten.html) — herkenbaar aan filter.js
    filter_tag = f'<script src="{depth_prefix}assets/filter.js"></script>'
    if filter_tag in content:
        sync_tag = f'<script src="{depth_prefix}assets/sync.js"></script>'
        content = content.replace(filter_tag, filter_tag + '\n' + sync_tag, 1)

    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, 'patched'
    return False, 'no-change'

results = {'patched': 0, 'skipped': 0, 'errors': []}

# root-level pages
for name in ['index.html', 'eten.html', 'kaart.html']:
    if os.path.exists(name):
        ok, reason = patch_file(name, '')
        if ok: results['patched'] += 1
        else: results['skipped'] += 1
        if reason not in ('patched',): print(name, reason)

# hotels/ en eten/ detailpagina's
for folder in ['hotels', 'eten']:
    for path in glob.glob(f'{folder}/*.html'):
        try:
            ok, reason = patch_file(path, '../')
            if ok: results['patched'] += 1
            else: results['skipped'] += 1
        except Exception as e:
            results['errors'].append((path, str(e)))

print(results['patched'], 'patched,', results['skipped'], 'skipped,', len(results['errors']), 'errors')
if results['errors']:
    print(results['errors'][:5])
