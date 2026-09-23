#!/bin/sh
set -eu
cd "$(dirname "$0")/../../../.."
uv run --with pillow --with numpy python - <<'PY'
from pathlib import Path
import json
import numpy as np
from PIL import Image
root = Path("assets/source/memory308/jiroesub")
out = Path("assets/enemies")
out.mkdir(exist_ok=True)
frames = []
checks = []
for name, count in (("battle", 4), ("web", 1)):
    meta = json.loads((root / f"{name}-processed/pipeline-meta.json").read_text())
    sheet = Image.open(root / f"{name}-processed/sheet-transparent.png").convert("RGBA")
    for i in range(count):
        source = sheet.crop(((i % 2) * 128, (i // 2) * 128, (i % 2 + 1) * 128, (i // 2 + 1) * 128)) if count == 4 else sheet
        source_data = np.array(source)
        source_data[:, :, 3] = np.where(source_data[:, :, 3] >= 128, 255, 0)
        source_data[source_data[:, :, 3] == 0, :3] = 0
        source = Image.fromarray(source_data)
        info = meta["frames"][i]
        anchor = info["paste_position"][0] + (info["anchor_source"][0] - info["crop_bbox"][0]) * info["source_to_output_scale"]
        dx = round(64 - anchor)
        dy = 120 - source.getbbox()[3]
        final = Image.new("RGBA", (128, 128))
        final.paste(source, (dx, dy))
        data = np.array(final)
        data[:, :, 3] = np.where(data[:, :, 3] >= 128, 255, 0)
        data[data[:, :, 3] == 0, :3] = 0
        final = Image.fromarray(data)
        bbox = final.getbbox()
        assert bbox and bbox[0] > 0 and bbox[1] > 0 and bbox[2] < 128 and bbox[3] == 120
        assert np.count_nonzero(data[:, :, 3]) > 1000
        checks.append({"asset": name, "frame": i, "bbox": bbox, "height": bbox[3]-bbox[1], "translation": [dx,dy], "foot_center_after_translation": anchor+dx, "alpha_values": sorted(np.unique(data[:,:,3]).tolist()), "clipped": False})
        if name == "battle":
            frames.append(final)
        else:
            final.save(out / "jiroesub-web.png")
atlas = Image.new("RGBA", (256, 256))
for i, frame in enumerate(frames):
    atlas.paste(frame, ((i % 2) * 128, (i // 2) * 128))
atlas.save(out / "jiroesub-battle.png")
frames[0].save(out / "jiroesub-front.png")
frames[0].save(root / "runtime-animation.gif", save_all=True, append_images=frames[1:], duration=[500,220,180,260], loop=0, disposal=2, transparency=0)
projectile = Image.open(root / "kuromi-processed/sheet-transparent.png").convert("RGBA")
projectile_data = np.array(projectile)
projectile_data[:,:,3] = np.where(projectile_data[:,:,3] >= 128, 255, 0)
projectile_data[projectile_data[:,:,3] == 0,:3] = 0
projectile = Image.fromarray(projectile_data)
Path("assets/projectiles").mkdir(exist_ok=True)
projectile.save("assets/projectiles/jiroesub-kuromi.png")
checks.append({"asset":"kuromi", "size":projectile.size, "bbox":projectile.getbbox(), "alpha_values": sorted(np.unique(projectile_data[:,:,3]).tolist())})
comparison = Image.new("RGBA", (768, 256), (38,38,48,255))
comparison.alpha_composite(frames[0].resize((256,256), Image.Resampling.NEAREST), (0,0))
comparison.alpha_composite(Image.open(out / "jiroesub-web.png").resize((256,256), Image.Resampling.NEAREST),(256,0))
comparison.alpha_composite(projectile.resize((256,256), Image.Resampling.NEAREST),(512,0))
comparison.save(root / "comparison-2x.png")
atlas.resize((768,768), Image.Resampling.NEAREST).save(root / "battle-preview-3x.png")
(root / "final-qc.json").write_text(json.dumps({"frames":checks,"battle_processor_qc":json.loads((root/"battle-processed/pipeline-meta.json").read_text())["qc_summary"],"binary_alpha":True,"per_frame_resize":False,"pivot":[64,120]}, indent=2)+"\n")
print(json.dumps(checks))
PY
