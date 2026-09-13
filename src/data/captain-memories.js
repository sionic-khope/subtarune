/** Caption-free illustrations for the captain's backstory. */
export const CAPTAIN_MEMORIES = Object.freeze({
  origin: 'assets/illustrations/yoplait-origin.png',
  split: 'assets/illustrations/yoplait-split.png',
  demon: 'assets/illustrations/yoplait-demon.png',
  hack: 'assets/illustrations/yoplait-hack.png',
});

const images = new Map();
let loading = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Cannot load captain illustration: ${src}`));
    image.src = src;
  });
}

/** Await during Game.load; publish the complete set atomically, and allow failed loads to retry. */
export function preloadCaptainMemories(loader = loadImage) {
  if (!loading) {
    loading = Promise.all(Object.entries(CAPTAIN_MEMORIES).map(async ([id, src]) => [id, await loader(src)]))
      .then(entries => { for (const [id, image] of entries) images.set(id, image); })
      .catch(error => { loading = null; throw error; });
  }
  return loading;
}

/** Get a ready illustration; a missing preload is an integration error, never a blank card. */
export function captainMemoryImage(id) {
  if (!images.has(id)) throw new Error(`Captain illustration is not preloaded: ${id}`);
  return images.get(id);
}
