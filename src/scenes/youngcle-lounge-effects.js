import { MAPS } from '../data/maps.js';
import { CHAR_SCALE, drawEmote, SCREEN_H, SCREEN_W, TileMap } from '../world/world.js';

export const YOUNGCLE_CAGE_IMAGE = 'assets/props/youngcle_electric_cage.png';
export const YOUNGCLE_DOOR_WALLS = 'assets/props/youngcle1_walls.png';
export const YOUNGCLE_ANGEL_DOOR = 'assets/props/youngcle_angel_door145.png';

export function setYoungcleDoorCutaway(game, visible) {
  if (!visible) { game.youngcleDoorCutaway = null; return; }
  const definition = MAPS.youngcle1;
  const map = new TileMap({ ...definition, rows: [...definition.rows] });
  map.bake();
  game.youngcleDoorCutaway = { map, cam: { x: 0, y: 0 } };
}

export function youngcleCageDropWaiter(game, node) {
  const actors = (node.targets || []).map(id => game.entities.find(entity => entity.id === id)).filter(Boolean);
  if (!actors.length) return { update: () => true };
  const remainingHeroes = [game.player, ...game.entities.filter(entity => entity.id === 'gyeongsub' || entity.id === 'ppaman')].filter(Boolean);
  const top = game.camera.y - 176;
  const cages = actors.map(actor => ({ actor, x: actor.x + actor.w / 2 - 48,
    y: top, hitY: actor.y - 126,
    trails: Array.from({ length: 5 }, () => ({ x: 0, y: 0, life: 0 })),
    trailIndex: 0, trailClock: 0 }));
  game.youngcleCages = cages;
  game.sound.sfx(node.sfx || 'plug', { volume: node.volume ?? 0.7 });
  const fallDuration = node.fallDuration ?? 0.72;
  const impactHold = node.impactHold ?? 0.22;
  const carryDuration = node.carryDuration ?? 0.95;
  let elapsed = 0;
  let impacted = false;
  return { update(dt) {
    elapsed += dt;
    for (const cage of cages) {
      cage.trailClock += dt;
      for (const trail of cage.trails) trail.life -= dt;
      if (cage.trailClock >= 0.065) {
        cage.trailClock = 0;
        const trail = cage.trails[cage.trailIndex];
        trail.x = cage.x; trail.y = cage.y; trail.life = 0.32;
        cage.trailIndex = (cage.trailIndex + 1) % cage.trails.length;
      }
    }
    if (elapsed <= fallDuration) {
      const p = Math.min(1, elapsed / fallDuration);
      const eased = p * p * p;
      for (const cage of cages) cage.y = top + (cage.hitY - top) * eased;
      return false;
    }
    if (!impacted) {
      impacted = true;
      game.sound.stopBgm(node.fadeOut ?? 0.18);
      game.sound.sfx(node.impactSfx || 'thud', { volume: node.impactVolume ?? 0.82 });
      if (node.impactBodySfx) game.sound.sfx(node.impactBodySfx, { volume: node.impactBodyVolume ?? 0.56 });
      if (remainingHeroes.length) {
        for (const hero of remainingHeroes) hero.emote = { kind: '!', t: 0, life: 1 };
        game.sound.sfx('chime');
      }
      game.shake = { time: 0.52, amp: 6 };
      for (const { actor } of cages) actor.jitter = { t: 0.48, amp: 2 };
    }
    if (elapsed <= fallDuration + impactHold) return false;
    const p = Math.min(1, (elapsed - fallDuration - impactHold) / carryDuration);
    const eased = p * p * (3 - 2 * p);
    const bottom = game.camera.y + SCREEN_H + 48;
    for (const cage of cages) {
      cage.y = cage.hitY + (bottom - cage.hitY) * eased;
      cage.actor.x = cage.x + 36;
      cage.actor.y = cage.y + 126;
      cage.actor.moving = false;
      cage.actor.frame = 0;
      cage.actor.facing = 'up';
    }
    if (p < 1) return false;
    for (const { actor } of cages) { actor.visible = false; actor.solid = false; actor.jitter = null; }
    game.youngcleCages = null;
    return true;
  } };
}

export function clearYoungcleLoungeEffects(game) {
  game.youngcleDoorCutaway = null;
  game.youngcleCages = null;
}

export function drawYoungcleLoungeEffects(ctx, game, cam) {
  if (game.youngcleCages) {
    const image = game.propImages[YOUNGCLE_CAGE_IMAGE];
    if (image) for (const cage of game.youngcleCages) {
      for (const trail of cage.trails) {
        if (trail.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, Math.min(0.34, trail.life));
        ctx.drawImage(image, Math.round(trail.x - cam.x), Math.round(trail.y - cam.y), 96, 160);
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(image, Math.round(cage.x - cam.x), Math.round(cage.y - cam.y), 96, 160);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    const zoom = game.zoom;
    if (zoom.s < 0.9999) {
      ctx.translate(SCREEN_W / 2, SCREEN_H / 2);
      ctx.scale(zoom.s, zoom.s);
      ctx.translate(-SCREEN_W / 2, -SCREEN_H / 2);
    }
    for (const hero of [game.player, ...game.entities.filter(entity => entity.id === 'gyeongsub' || entity.id === 'ppaman')]) {
      if (hero?.emote?.kind !== '!') continue;
      const height = Math.round(hero.sprite.fh / hero.sprite.px * CHAR_SCALE * (hero.def.visualScale || 1));
      drawEmote(ctx, hero.emote, Math.round(hero.x + hero.w / 2 - cam.x), Math.round(hero.y + hero.h - height - cam.y));
    }
    ctx.restore();
  }
  if (!game.youngcleDoorCutaway) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#07101b';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const shot = game.youngcleDoorCutaway;
  shot.map.draw(ctx, shot.cam);
  const walls = game.propImages[YOUNGCLE_DOOR_WALLS];
  if (walls) ctx.drawImage(walls, 0, 0);
  const door = game.propImages[YOUNGCLE_ANGEL_DOOR];
  if (door) ctx.drawImage(door, 48, 48, 144, 144);
  ctx.restore();
}
