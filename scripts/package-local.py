"""Sign this independent installation using its saved Samsung SDK profile."""
import json
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as XML
import zipfile
from font_assets import write_widget_archive

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / '.local/tizen-sdk/tools/ide/bin/tizen'
config = json.loads((ROOT / '.local/signing.json').read_text())
profiles = Path(config['profiles_path'])
if not CLI.is_file() or not profiles.is_file():
    raise SystemExit('Local SDK or saved Samsung profile is missing.')
if config['profile'] not in [p.get('name') for p in XML.parse(profiles).getroot().iter('profile')]:
    raise SystemExit('The requested Samsung signing profile was not found.')
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
unsigned = dist / 'CleanFrame-unsigned.wgt'
write_widget_archive(unsigned)
subprocess.run([str(CLI), 'cli-config', 'default.profiles.path=' + str(profiles)], check=True)
signed = dist / 'signed-local'
signed.mkdir(exist_ok=True)
subprocess.run([str(CLI), 'package', '-t', 'wgt', '-s', config['profile'],
                '-o', str(signed), '--', str(unsigned)], check=True)
package = signed / unsigned.name
with zipfile.ZipFile(package) as archive:
    if not {'author-signature.xml', 'signature1.xml'}.issubset(archive.namelist()):
        raise SystemExit('Signed package is missing required signatures.')
    ns = '{http://tizen.org/ns/widgets}application'
    expected = XML.parse(ROOT / 'app/config.xml').getroot().find(ns).attrib
    actual = XML.fromstring(archive.read('config.xml')).find(ns).attrib
    if actual != expected:
        raise SystemExit('Signed package identity does not match this project.')
shutil.copy2(package, dist / 'CleanFrame.wgt')
print('Verified signed package:', dist / 'CleanFrame.wgt')
