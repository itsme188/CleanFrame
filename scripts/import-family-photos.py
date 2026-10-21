"""Prepare exported album images for a private TV build. Originals remain untouched."""
import argparse, hashlib, json, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('folder', type=Path, help='Folder exported from Apple Photos')
args = parser.parse_args()
files = sorted(p for p in args.folder.iterdir() if p.is_file() and p.suffix.lower() in ['.jpg','.jpeg','.png','.heic','.heif','.tif','.tiff'])
if not files:
    raise SystemExit('No supported photographs in the supplied folder.')
base = ROOT / '.local/personal/overlay/assets'
for name in ['wallpapers','materials']:
    (base/name).mkdir(parents=True, exist_ok=True)
config_path = base/'local-config.js'
config = json.loads(config_path.read_text().split('=',1)[1].strip().rstrip(';')) if config_path.exists() else {}
entries=[]; seen=set()
for source in files:
    identity='family-'+hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    if identity in seen:
        continue
    seen.add(identity)
    with tempfile.TemporaryDirectory() as temporary:
        path=source
        if source.suffix.lower() in ['.heic','.heif']:
            path=Path(temporary)/'converted.jpg'
            subprocess.run(['sips','-s','format','jpeg',str(source),'--out',str(path)],check=True,capture_output=True)
        with Image.open(path) as image:
            original=ImageOps.exif_transpose(image).convert('RGB')
            # Preserve the complete family photograph; fill spare space with a soft copy.
            canvas=ImageOps.fit(original,(1920,1080)).filter(ImageFilter.GaussianBlur(48))
            canvas=ImageEnhance.Brightness(canvas).enhance(.65)
            fitted=ImageOps.contain(original,(1920,1080))
            canvas.paste(fitted,((1920-fitted.width)//2,(1080-fitted.height)//2))
    def save(image,path,quality=86):
        image.save(path,'JPEG',quality=quality,optimize=True) # No EXIF/location metadata.
    save(canvas,base/'wallpapers'/(identity+'.jpg'),90)
    save(canvas.resize((320,180)),base/'wallpapers'/(identity+'-thumb.jpg'))
    for suffix,radius,brightness in [('study-soft',14,.48),('field-blur',28,.65),('field-frost',42,.65),('field-clear',2,.7)]:
        material=ImageEnhance.Brightness(canvas.filter(ImageFilter.GaussianBlur(radius))).enhance(brightness)
        save(material,base/'materials'/(identity+'-'+suffix+'.jpg'))
        if suffix=='field-frost':save(material.resize((320,180)),base/'wallpapers'/(identity+'-panel.jpg'))
    entries.append({'id':identity,'name':'Family photo '+str(len(entries)+1),'src':'assets/wallpapers/'+identity+'.jpg','thumb':'assets/wallpapers/'+identity+'-thumb.jpg','tone':'light','ut':{'tr':'mist','br':'mist'},'frostVeil':.2,'family':True})
config['wallpapers']=entries
config['revision']='family-'+hashlib.sha256(json.dumps([e['id'] for e in entries]).encode()).hexdigest()[:12]
config_path.write_text('window.CleanFrameLocal = '+json.dumps(config,indent=2)+';\n')
print('Prepared',len(entries),'private photos. Originals unchanged; location metadata omitted.')
