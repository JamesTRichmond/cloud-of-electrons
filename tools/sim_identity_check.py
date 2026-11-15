# Deterministic headless comparison of two page URLs (e.g. main vs this branch with the flag off).
# Seeds Math.random, freezes performance.now and drives requestAnimationFrame from a virtual clock, steps FRAMES
# frames (before the first poem starts at 4 s), then compares screenshots pixel by pixel.
# usage: python3 tools/sim_identity_check.py DEVTOOLS_PORT URL_A URL_B [frames] [out_prefix]
# Needs a headless Chrome already running with --remote-debugging-port=DEVTOOLS_PORT, plus websocket-client, numpy, Pillow.
import json, sys, time, urllib.request, itertools, base64, io
import websocket, numpy as np
from PIL import Image
port, ua, ub = sys.argv[1], sys.argv[2], sys.argv[3]
frames = int(sys.argv[4]) if len(sys.argv) > 4 else 180
pre = sys.argv[5] if len(sys.argv) > 5 else None
INIT = r'''(()=>{let s=0x2545F491;Math.random=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
let vt=1000;performance.now=()=>vt;const q=[];window.requestAnimationFrame=cb=>{q.push(cb);return q.length};
window.__vstep=n=>{for(let k=0;k<n;k++){vt+=1000/60;const c=q.splice(0);for(const f of c)f(vt)}return vt};window.__vq=()=>q.length;})();'''
def page():
    for _ in range(100):
        try: return [x for x in json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json')) if x['type'] == 'page'][0]
        except Exception: time.sleep(.2)
def run(url):
    ws = websocket.create_connection(page()['webSocketDebuggerUrl'], suppress_origin=True, timeout=300); ids = itertools.count(1)
    def call(m, p=None):
        i = next(ids); ws.send(json.dumps({'id': i, 'method': m, 'params': p or {}}))
        while True:
            r = json.loads(ws.recv())
            if r.get('id') == i: return r.get('result', {})
    ev = lambda e: call('Runtime.evaluate', {'expression': e, 'returnByValue': True}).get('result', {}).get('value')
    call('Page.enable'); call('Runtime.enable')
    s = call('Page.addScriptToEvaluateOnNewDocument', {'source': INIT})
    for attempt in range(3):
        call('Page.navigate', {'url': url}) if attempt == 0 else call('Page.reload')
        for _ in range(100):
            time.sleep(.2)
            if ev('!!window.coeDots&&window.__vq&&window.__vq()>0'): break
        time.sleep(3)  # let async boot (fonts, json, audio setup) settle while the clock is frozen
        if ev('!!window.coeDots'): break
    for k in range(frames): ev('window.__vstep(1)'); time.sleep(.005)
    time.sleep(.5)
    info = ev('({backend:window.coeSimBackend??null,phase:window.coePhase??null})')
    png = base64.b64decode(call('Page.captureScreenshot', {'format': 'png'})['data'])
    call('Page.removeScriptToEvaluateOnNewDocument', {'identifier': s['identifier']}); ws.close()
    return np.asarray(Image.open(io.BytesIO(png)).convert('RGB'), dtype=np.int16), png, info
a, pa, ia = run(ua); b, pb, ib = run(ub)
d = np.abs(a - b)
if pre: open(pre + '-a.png', 'wb').write(pa); open(pre + '-b.png', 'wb').write(pb)
print(json.dumps({'a': ua.split('/', 3)[-1], 'b': ub.split('/', 3)[-1], 'frames': frames, 'infoA': ia, 'infoB': ib,
                  'identical': bool(d.max() == 0), 'maxDiff': int(d.max()), 'pixelsDiffering': int((d.max(axis=2) > 0).sum()), 'meanAbsDiff': float(d.mean()),
                  'meanLumaA': float(a.mean()), 'meanLumaB': float(b.mean())}))
