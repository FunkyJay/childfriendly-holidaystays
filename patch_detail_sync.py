import glob

for folder in ['hotels', 'eten']:
    for path in glob.glob(f'{folder}/*.html'):
        with open(path, encoding='utf-8') as f:
            content = f.read()
        site_tag = '<script src="../assets/site.js"></script>'
        detail_sync_tag = '<script src="../assets/detail-sync.js"></script>'
        if detail_sync_tag in content:
            continue
        if site_tag not in content:
            print('SKIP (no site tag):', path)
            continue
        content = content.replace(site_tag, site_tag + '\n' + detail_sync_tag, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

print('done')
