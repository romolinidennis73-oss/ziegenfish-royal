import glob,os
src=''.join(open(f).read()+'\n' for f in sorted(glob.glob('src/*.js')))
t=open('template.html').read()
CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
os.makedirs('dist',exist_ok=True)
art=t.replace('%%THREE%%',CDN).replace('%%GAME%%',src)
open('dist/ziegenfisch-royale.html','w').write(art)
head='''<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Ziegenfisch">
<meta name="theme-color" content="#071a20"><link rel="manifest" href="manifest.json"><link rel="apple-touch-icon" href="icon-180.png">
</head><body>
'''
open('dist/index.html','w').write(head+art+'\n</body></html>')
print(len(art))
