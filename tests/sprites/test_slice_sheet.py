import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.sprites.slice_sheet import EDGE_TRIM, detect_grid, key_cell, make_portrait, process_cell


def test_background_key_preserves_outline_and_enclosed_background_color() -> None:
    cell = np.full((80, 80, 3), (180, 120, 210), dtype=np.int64)
    cell[20:60, 20:60] = (20, 20, 30)
    cell[22:58, 22:58] = (180, 120, 210)
    result = np.asarray(key_cell(cell))
    assert result[0, 0, 3] == 0
    assert np.all(result[16:56, 16:56, 3] == 255)
    assert tuple(result[30, 30, :3]) == (180, 120, 210)


@pytest.mark.parametrize('column', [0, 4, 8])
def test_source_front_frame_keeps_dark_outline(column: int) -> None:
    with Image.open(ROOT / 'assets/source/sheet_hyungsub_gyeongsub_ppaman.png') as image:
        source = np.asarray(image.convert('RGB')).astype(np.int64)
    columns, rows = detect_grid(source)
    x0, x1 = columns[column]
    y0, y1 = rows[0]
    cell = source[y0:y1, x0:x1]
    trimmed = cell[EDGE_TRIM:-EDGE_TRIM, EDGE_TRIM:-EDGE_TRIM]
    result = np.asarray(key_cell(cell))
    assert np.all(result[..., 3][trimmed.max(axis=2) < 60] == 255)


def test_import_resampling_keeps_original_colors() -> None:
    cell = np.full((80, 80, 3), (180, 120, 210), dtype=np.int64)
    cell[20:60, 20:60] = (20, 20, 30)
    cell[22:58, 22:58] = (255, 230, 205)
    cell[23:57:2, 23:57:2] = (45, 70, 95)
    colors = set(map(tuple, cell.reshape(-1, 3)))
    for image in (process_cell(cell, 32, 32, 0.5), make_portrait(cell)):
        pixels = np.asarray(image)
        assert set(map(tuple, pixels[..., :3][pixels[..., 3] == 255])) <= colors


def test_background_key_removes_purple_fringe_without_eroding_blue_outline() -> None:
    cell = np.full((80, 80, 3), (191, 131, 248), dtype=np.int64)
    cell[19:61, 19:61] = (150, 100, 210)
    cell[20:60, 20:60] = (60, 70, 170)
    result = np.asarray(key_cell(cell))
    assert result[15, 20, 3] == 0
    assert np.all(result[16:56, 16:56, 3] == 255)


@pytest.mark.parametrize(('source_name', 'ids'), [
    ('sheet_hyungsub_gyeongsub_ppaman.png', ('hyungsub', 'gyeongsub', 'ppaman')),
    ('sheet_junhee.png', ('junhee',)),
])
def test_cli_source_sheets_produce_complete_engine_frames(tmp_path: Path, source_name: str, ids: tuple[str, ...]) -> None:
    source_path = ROOT / 'assets/source' / source_name
    result = subprocess.run([sys.executable, str(ROOT / 'tools/sprites/slice_sheet.py'), str(source_path), *ids],
                            cwd=tmp_path, capture_output=True, text=True, check=True)
    assert 'Traceback' not in result.stderr
    with Image.open(source_path) as image:
        source = np.asarray(image.convert('RGB')).astype(np.int64)
    columns, rows = detect_grid(source)
    for index, cid in enumerate(ids):
        with Image.open(tmp_path / 'assets/sprites' / f'{cid}.png') as sheet:
            assert sheet.mode == 'RGBA'
            assert sheet.width % 4 == sheet.height % 4 == 0
            fw, fh = sheet.width // 4, sheet.height // 4
            for output_row, input_row in enumerate((0, 3, 1, 2)):
                frames = []
                for frame in range(4):
                    actual = sheet.crop((frame * fw, output_row * fh, (frame + 1) * fw, (output_row + 1) * fh))
                    assert actual.getbbox() is not None
                    x0, x1 = columns[index * 4 + frame]
                    y0, y1 = rows[input_row]
                    cell = source[y0:y1, x0:x1]
                    scale = 1 / max(1, round((rows[0][1] - rows[0][0]) / 100))
                    expected = process_cell(cell, fw, fh, scale)
                    assert actual.tobytes() == expected.tobytes()
                    pixels = np.asarray(actual)
                    assert set(np.unique(pixels[..., 3])) <= {0, 255}
                    assert set(map(tuple, pixels[..., :3][pixels[..., 3] == 255])) <= set(map(tuple, cell.reshape(-1, 3)))
                    frames.append(actual.tobytes())
                assert len(set(frames)) > 1
        with Image.open(tmp_path / 'assets/portraits' / f'{cid}.png') as portrait:
            assert portrait.mode == 'RGBA' and portrait.size == (96, 96)
            assert portrait.getbbox() is not None
