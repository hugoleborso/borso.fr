---
summary: 'The sandbox has no QR decoder (no BarcodeDetector in Chromium, no zbarimg, no cv2); install jsqr and pngjs in your scratchpad and decode a PNG screenshot of the code.'
triggers:
  commands:
    - '\bBarcodeDetector\b'
    - '\bzbarimg\b'
    - '\bpyzbar\b'
  paths:
    - 'apps/*/site/src/**/*[Qq]r*'
---

# Decoding a QR code in the sandbox

Three agents of PR #421 looked for a decoder and found none (measured):
`typeof BarcodeDetector` is `undefined` in the pre-installed Chromium, and
`zbarimg`, `cv2` and `pyzbar` are not installed. Two of them fell back to
re-encoding the expected value and comparing SVG paths, which proves the
value only when the expected value is right.

A real decode takes one install in the scratchpad, outside the repository:

```sh
cd "$SCRATCHPAD/qr" && npm init -y >/dev/null && npm i jsqr@1.4.0 pngjs@7.0.0
node -e "const {PNG}=require('pngjs'),jsQR=require('jsqr');
const p=PNG.sync.read(require('fs').readFileSync(process.argv[1]));
console.log(jsQR(new Uint8ClampedArray(p.data),p.width,p.height)?.data)" shot.png
```

It read `http://localhost:5174/` from a 375 px screenshot of pragma's visitor
QR sheet (measured, PR #421).
