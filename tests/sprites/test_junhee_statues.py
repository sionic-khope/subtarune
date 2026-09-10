import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
POSES = ('arms_crossed', 'laugh', 'gesture', 'arms_raised', 'thinking', 'look_back')


def test_teal_statues_use_six_approved_pose_images() -> None:
    # Given the existing thirteen teal forest statue placements.
    data = json.loads((ROOT / 'assets/maps/teal2.json').read_text())
    # When their artwork is resolved.
    statues = [e for e in data['entities'] if e.get('id', '').startswith('statue_')]
    # Then all poses are used without adding or removing placements.
    assert len(statues) == 13
    assert {e['image'] for e in statues} == {
        f'assets/props/statue_junhee_{pose}.png' for pose in POSES
    }


def test_imported_statues_keep_source_colors_and_prop_footprint() -> None:
    # Given the approved source sheet.
    with Image.open(ROOT / 'assets/source/junhee-statues/statues.png') as source:
        rgb = np.asarray(source.convert('RGB'))
    colors = set(map(tuple, rgb.reshape(-1, 3)))
    # When each delivered pose is loaded.
    for pose in POSES:
        with Image.open(ROOT / f'assets/props/statue_junhee_{pose}.png') as prop:
            pixels = np.asarray(prop)
            # Then delivery preserves colors, binary alpha and the existing footprint.
            assert prop.size == (44, 60)
            assert prop.mode == 'RGBA'
            assert prop.getbbox()[3] == 60
            assert set(np.unique(pixels[..., 3])) == {0, 255}
            opaque = pixels[..., :3][pixels[..., 3] == 255]
            assert set(map(tuple, opaque)) <= colors
            assert not np.any((opaque[:, 0] > 200) & (opaque[:, 1] < 60) & (opaque[:, 2] > 200))
