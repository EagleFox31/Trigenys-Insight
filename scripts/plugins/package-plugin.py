"""Build and inspect a public-upload copy without touching the installed plugin."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--require-ready', action='store_true')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
source = repo / 'plugins/trigenys-insight/submission'
out = repo / 'dist/plugin-submission'
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((source / 'plugin.json').read_text())
mcp = json.loads((source / 'mcp.json').read_text())
assert manifest['$schema'] == 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
assert re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?', manifest['name'])
assert re.fullmatch(r'\d+\.\d+\.\d+', manifest['version'])
assert mcp['$schema'] == 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json'
assert len(mcp['mcpServers']) == 1
server = next(iter(mcp['mcpServers'].values()))
assert server['type'] == 'streamable-http'
assert server['url'] == 'https://insight.trigenys.com/api/mcp'
assert server['extensions']['com.openai']['auth']['type'] == 'oauth'
assert server['extensions']['com.openai']['auth']['client'] == {'mode': 'dcr'}
openai = manifest['extensions']['com.openai']
assert 'apps' not in manifest and 'apps' not in openai
assert not (source / '.app.json').exists()
interface = openai['interface']
for key, maximum in [('displayName', 30), ('shortDescription', 30), ('longDescription', 4000), ('developerName', 80)]:
    assert isinstance(interface[key], str) and 0 < len(interface[key]) <= maximum, key
prompts = interface['defaultPrompt']
assert isinstance(prompts, list) and 1 <= len(prompts) <= 3
assert len(set(prompts)) == len(prompts)
assert all(isinstance(p, str) and p.strip() and '\n' not in p and len(p) <= 128 for p in prompts)
for key in ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']:
    if key in interface:
        assert interface[key].startswith('https://') and len(interface[key]) <= 1024
for key in ['logo', 'composerIcon']:
    icon = (source / interface[key]).resolve()
    assert icon.is_relative_to(source.resolve())
    data = icon.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n' and len(data) <= 5 * 1024 * 1024
    width, height = struct.unpack('>II', data[16:24])
    assert width == height and width >= (256 if key == 'logo' else 48)
cases = openai['review']['test_cases']
assert len(cases['positive']) >= 5 and len(cases['negative']) >= 3
for kind, items in cases.items():
    for case in items:
        required = ['description', 'prompt'] + (['tools_triggered', 'expected_behavior'] if kind == 'positive' else [])
        assert all(isinstance(case.get(key), str) and case[key].strip() for key in required)
assert openai['review']['commerce'] is False
assert openai['publication']['countries'] == []
for translation in openai['publication'].get('translations', {}).values():
    assert 0 < len(translation['shortDescription']) <= 30

checks = json.loads((repo / 'plugins/trigenys-insight/readiness.json').read_text())
missing = [f'interface.{key}' for key in ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL'] if not interface.get(key)]
missing += [key for key, value in checks.items() if value is not True]
if not openai['review'].get('demo_recording_url'):
    missing.append('review.demo_recording_url')
ready = not missing
archive = out / f"trigenys-insight-{manifest['version']}-{'submission' if ready else 'preparation'}.zip"
paths = sorted(p for p in source.rglob('*') if p.is_file())
assert all(not p.is_symlink() for p in paths)
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for path in paths:
        bundle.write(path, str(path.relative_to(source)))
# Inspect the completed archive, not just the input directory.
with zipfile.ZipFile(archive) as bundle:
    assert set(bundle.namelist()) == {'plugin.json', 'mcp.json', 'assets/logo.png'}
    assert json.loads(bundle.read('plugin.json')) == manifest
    assert json.loads(bundle.read('mcp.json')) == mcp
    assert all(not name.startswith('/') and '..' not in Path(name).parts for name in bundle.namelist())
report = {'package_valid': True, 'ready_for_submission': ready, 'missing': sorted(set(missing)),
          'archive': archive.name, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': [str(p.relative_to(source)) for p in paths]}
(out / 'readiness-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
if args.require_ready and not ready:
    raise SystemExit('Submission is blocked until the missing materials are verified.')
