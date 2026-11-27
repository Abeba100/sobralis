"""Render the existing eight-ray brand mark with only the Python standard library."""
from pathlib import Path
import math, struct, zlib

target = Path(__file__).parent / 'dist' / 'icons'
target.mkdir(exist_ok=True)
def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind+data) & 0xffffffff)
def icon(size):
    scale = 3
    n = size * scale
    rows=[]
    purple=(101,80,220)
    # Four full strokes make the familiar eight-ray mark. Keep inside maskable safe area.
    lines=[(math.cos(a), math.sin(a)) for a in (0, math.pi/4, math.pi/2, 3*math.pi/4)]
    for y in range(size):
        row=bytearray([0])
        for x in range(size):
            coverage=0
            for sy in range(scale):
                for sx in range(scale):
                    px=(x*scale+sx+.5)/n-.5
                    py=(y*scale+sy+.5)/n-.5
                    for dx,dy in lines:
                        along=max(-.235,min(.235,px*dx+py*dy))
                        if (px-along*dx)**2+(py-along*dy)**2 < .013**2:
                            coverage+=1
                            break
            alpha=coverage/(scale*scale)
            row.extend(round(c*(1-alpha)+255*alpha) for c in purple)
        rows.append(row)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
    name=f'icon-{size}.png' if size!=180 else 'apple-touch-icon.png'
    (target/name).write_bytes(png)
for size in (180,192,512):
    icon(size)
print('Created three application icons')
