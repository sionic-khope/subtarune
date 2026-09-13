/** Test the C probe against an optional entity-relative inspectRect, preserving its collision/staging box. */
export function probeOverlaps(entity, probe) {
  const bounds = entity.def?.inspectRect;
  if (!bounds) return entity.overlaps(probe);
  const x = entity.x + bounds.x, y = entity.y + bounds.y;
  return x < probe.x + probe.w && x + bounds.w > probe.x
    && y < probe.y + probe.h && y + bounds.h > probe.y;
}
