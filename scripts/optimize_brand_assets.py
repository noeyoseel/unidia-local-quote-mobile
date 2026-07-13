from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    ROOT / "assets/images/icon.png": 1024,
    ROOT / "assets/images/splash-icon.png": 1024,
    ROOT / "assets/images/favicon.png": 512,
    ROOT / "assets/images/android-icon-foreground.png": 1024,
}

for path, size in TARGETS.items():
    with Image.open(path) as source:
        image = source.convert("RGB")
        image.thumbnail((size, size), Image.Resampling.LANCZOS)
        optimized = image.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        optimized.save(path, format="PNG", optimize=True, compress_level=9)
        print(f"{path.name}: {path.stat().st_size} bytes")
