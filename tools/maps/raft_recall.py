# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# Run: imported by the owning map generators.
"""Explicit recall lever positions on existing boarding banks."""
from typing import Final, TypedDict

RECALL_IMAGES: Final = ('assets/props/raft_call_lever_off.png', 'assets/props/raft_call_lever_on.png')
PLACEMENTS: Final = {
    'void2': (('raft1', 'start', 98, 164), ('raft1', 'end', 654, 172)),
    'void3': (
        ('raft3_1', 'start', 132, 488), ('raft3_1', 'end', 394, 484),
        ('raft3_2', 'start', 490, 332), ('raft3_2', 'end', 390, 98),
        ('raft3_3', 'start', 492, 512), ('raft3_3', 'end', 394, 704),
        ('raft3_6', 'start', 490, 392), ('raft3_6', 'end', 778, 484),
        ('raft3_4', 'start', 490, 100), ('raft3_4', 'end', 906, 60),
        ('raft3_5', 'start', 1002, 130), ('raft3_5', 'end', 906, 340),
    ),
    'void4': (('raft4', 'start', 132, 330), ('raft4', 'end', 2250, 340)),
    'void8': (('raft8', 'start', 196, 240), ('raft8', 'end', 3210, 242)),
    'void9': (
        ('raft9a', 'start', 196, 178), ('raft9a', 'end', 1330, 174),
        ('raft9b', 'start', 1448, 194), ('raft9b', 'end', 1436, 864),
        ('raft9c', 'start', 1330, 952), ('raft9c', 'end', 196, 938),
        ('raft9d', 'start', 60, 964), ('raft9d', 'end', 60, 1516),
        ('raft9e', 'start', 196, 1580), ('raft9e', 'end', 1330, 1580),
    ),
    'teal5': (('raft5', 'start', 294, 468), ('raft5', 'end', 2842, 274)),
    'obj5': (('obj5_raft', 'start', 730, 392),),
    'youngcle14': (
        ('raft14a', 'start', 356, 708), ('raft14a', 'end', 1680, 708),
        ('raft14b', 'start', 1808, 652), ('raft14b', 'end', 1808, 124),
        ('raft14c', 'start', 1860, 140), ('raft14c', 'end', 3178, 140),
    ),
    'jjajang_sakura3': (('sakura_raft', 'start', 516, 824), ('sakura_raft', 'end', 1430, 1508)),
    'jjajang_sakura6': (('sakura6_raft', 'start', 292, 404), ('sakura6_raft', 'end', 1230, 406)),
    'jjajang_night_coast2': (
        ('coast2_a', 'start', 1404, 328), ('coast2_a', 'end', 2220, 328),
        ('coast2_b', 'start', 2220, 1608), ('coast2_b', 'end', 1404, 1608),
        ('coast2_c', 'start', 2268, 2280), ('coast2_c', 'end', 3084, 2280),
    ),
    'jjajang_night_coast3': (('coast3_a', 'start', 2972, 2056), ('coast3_a', 'end', 3788, 2056)),
}


class RecallLever(TypedDict):
    """Map entity contract consumed by RaftRecall."""

    type: str
    id: str
    raft: str
    endpoint: str
    image: str
    imageOn: str
    x: int
    y: int
    w: int
    h: int
    ix: int
    iy: int
    solid: bool


def recall_levers(map_id: str) -> list[RecallLever]:
    """Return independently authored, bank-mounted controls for one map."""
    return [
        {'type': 'raft_recall', 'id': f'{raft}_recall_{endpoint}',
         'raft': raft, 'endpoint': endpoint, 'image': RECALL_IMAGES[0],
         'imageOn': RECALL_IMAGES[1], 'x': x, 'y': y, 'w': 12, 'h': 16,
         'ix': x - 10, 'iy': y - 32, 'solid': True}
        for raft, endpoint, x, y in PLACEMENTS.get(map_id, ())
    ]
