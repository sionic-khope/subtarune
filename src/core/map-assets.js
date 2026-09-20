/** Map definitions and visible images are prepared once, before a destination is published. */
export class MapAssetCache {
  constructor({ maps, loadMap, loadImage, loadTiles, extraSources = () => [] }) {
    this.maps = maps;
    this.loadMap = loadMap;
    this.loadImage = loadImage;
    this.loadTiles = loadTiles;
    this.extraSources = extraSources;
    this.images = {};
    this.preparing = new Map();
    this.definitions = new Map();
    this.imagePromises = new Map();
    this.prepared = new Set();
  }

  ready(id) { return this.prepared.has(id); }

  image(src) {
    // 실패(null)는 기억하지 않는다 — 다음에 다시 부르면 다시 받는다(BUILD269: 한 번 끊긴 그림이 세션 내내 없던 문제)
    if (!this.imagePromises.has(src)) this.imagePromises.set(src, Promise.resolve().then(() => this.loadImage(src)).then((image) => { if (!image) this.imagePromises.delete(src); return image; }));
    return this.imagePromises.get(src);
  }

  definition(id) {
    if (!this.definitions.has(id)) this.definitions.set(id, Promise.resolve().then(() => this.loadMap(id)).then(override => {
      if (override) this.maps[id] = override;
      const def = this.maps[id];
      if (!def) this.definitions.delete(id);
      return def;
    }).catch(error => { this.definitions.delete(id); throw error; }));
    return this.definitions.get(id);
  }

  prepare(id) {
    if (this.preparing.has(id)) return this.preparing.get(id);
    if (this.ready(id)) return Promise.resolve(this.maps[id]);
    const task = (async () => {
      const def = await this.definition(id);
      if (!def) throw new Error(`Unknown map: ${id}`);
      const sources = new Set([
        def.image,
        ...((def.entities || []).map(e => e.image)),
        ...(def.preload || []),
        ...(def.backdrop ? [`assets/backdrops/${def.backdrop}.png`] : []),
        ...this.extraSources(id, def),
      ].filter(Boolean));
      const [entries] = await Promise.all([
        Promise.all([...sources].map(async src => [src, await this.image(src)])),
        this.loadTiles(def),
      ]);
      for (const [src, image] of entries) this.images[src] = image;
      this.prepared.add(id);
      return def;
    })().catch(error => { this.preparing.delete(id); throw error; });
    this.preparing.set(id, task);
    return task;
  }
}
