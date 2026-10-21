"""Allowlisted personal assets; never included in public exports."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
def personal_overlay(root=ROOT, include_private=True):
    base = root / '.local/personal/overlay'
    if not include_private or not base.exists():
        return {}
    config_file = base/'assets/local-config.js'
    config = json.loads(config_file.read_text().split('=', 1)[1].strip().rstrip(';')) if config_file.exists() else {}
    allowed = {'assets/local-config.js'}
    for photo in config.get('wallpapers', []):
        identity = photo['id']
        if not identity.startswith('family-') or not all(c.isalnum() or c == '-' for c in identity):
            raise ValueError('Invalid personal photo identity')
        allowed.update('assets/wallpapers/'+identity+suffix+'.jpg' for suffix in ['', '-thumb', '-panel'])
        allowed.update('assets/materials/'+identity+'-'+suffix+'.jpg' for suffix in ['study-soft','field-blur','field-frost','field-clear'])
    result = {}
    for source in base.rglob('*'):
        if source.is_symlink():
            raise ValueError('Personal assets must not be symlinks')
        if not source.is_file():
            continue
        name = source.relative_to(base).as_posix()
        if name not in allowed:
            continue
        if name == 'assets/local-config.js' or (name.startswith(('assets/wallpapers/family-', 'assets/materials/family-')) and name.endswith('.jpg')):
            result[name] = source
        else:
            raise ValueError('Unexpected personal asset: ' + name)
    if config_file.exists() and set(result) != allowed:
        raise ValueError("Personal photo bundle is incomplete")
    return result
