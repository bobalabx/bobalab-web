"""Minimal stand-in for the `brotli` Python module (decompress only).

fontTools needs `brotli` to read WOFF2 files. Rather than installing another
package, this shim pipes the bytes through Node's built-in zlib Brotli
decoder. It is only put on sys.path by build-wordmark.py when the real module
is missing, and it is never used at site build or run time.
"""

import subprocess

MODE_GENERIC = 0
MODE_TEXT = 1
MODE_FONT = 2

_JS = (
    "const z=require('zlib');const c=[];process.stdin.on('data',d=>c.push(d));"
    "process.stdin.on('end',()=>process.stdout.write(z.brotliDecompressSync(Buffer.concat(c))));"
)


def decompress(data):
    out = subprocess.run(["node", "-e", _JS], input=data, capture_output=True, check=True)
    return out.stdout


def compress(*_args, **_kwargs):  # pragma: no cover - not needed for reading
    raise NotImplementedError("brotli shim is decompress-only")
