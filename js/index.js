// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
import * as util from "./utils.js";

const NS = "http://www.w3.org/2000/svg";

const SCENE = {
  WIDTH: 36,
  HEIGHT: 18,
};
const PLAYER_SPEED = 3 / 1000;
const LEFT = ["a", "j"];
const RIGHT = ["d", "l"];
const UP = ["w", "i"];
const DOWN = ["s", "k"];
const MOVE = [].concat(LEFT, RIGHT, UP, DOWN).join("");
const FIREBALL = "fireball";
const WIND = "wind";
const LIGHTNING = "lightning";
const SPEED = "speed";
const NAVIGATE = "navigate";
const HELP = "help";
const TOMBSTONE = "tombstone";
const SORCERER = "sorcerer";

const MAP_HYPOT = 40;

const SPELLS = [
  {
    spell: "rbil",
    mnemonic: "libri",
    name: HELP,
    desc: "spell book",
  },
  {
    spell: "srbio-sgni",
    name: FIREBALL,
    mnemonic: "orbis ignis",
    damage: 1,
    pxPerMs: 6 / 1000,
    evil: false,
    x: undefined,
    y: undefined,
    tx: undefined,
    ty: undefined,
    el: undefined,
    purge: false,
  },
  {
    spell: "evn-stu",
    mnemonic: "ventus",
    name: WIND,
    x: undefined,
    y: undefined,
    r: 1,
    maxR: 10,
    pxPerMs: 6 / 1000,
    el: undefined,
    purge: false,
  },
  {
    spell: "sfnui-xul",
    mnemonic: "funis lux",
    name: LIGHTNING,
    damage: 2,
    msVisible: 1000,
    msDuration: 0,
    x: undefined,
    y: undefined,
    tx: undefined,
    ty: undefined,
    maxR: 10,
    el: undefined,
    purge: false,
  },
  {
    spell: "rop-erop",
    mnemonic: "propero",
    name: SPEED,
    pxPerMs: 5 / 1000,
    msInEffect: 10_000,
    msDuration: 0,
    purge: false,
  },
  {
    spell: "avn-gio",
    mnemonic: "navigo",
    name: NAVIGATE,
    msVisible: 2_000,
    msDuration: 0,
    purge: false,
  },
].map(Object.freeze);

const SUBSPELLS = new Set(SPELLS.flatMap(({ spell }) => spell.split("-")));

const ENEMIES = [
  {
    name: "bat",
    health: 1,
    pxPerMs: 2 / 1000,
  },
  {
    name: "ghost",
    health: 2,
    pxPerMs: 1 / 1000,
  },
  {
    name: SORCERER,
    health: 3,
    pxPerMs: 0.25 / 1000,
    msCooldown: 3000,
    msDuration: 0,
  },
].reduce(util.toDictOn("name"), {});

const SCROLLS = [
  { tile: "F", name: FIREBALL },
  { tile: "L", name: LIGHTNING },
  { tile: "W", name: WIND },
  { tile: "S", name: SPEED },
  { tile: "N", name: NAVIGATE },
]
  .reduce(
    util.toDictOn("tile"),
    {},
  );

const state = {
  player: {
    el: undefined,
    x: 2,
    y: 2,
    dx: 0,
    dy: 0,
    pxPerMs: PLAYER_SPEED,
    scrolls: [HELP],
  },
  help: false,
  forest: {
    dx: 0,
    dy: 0,
    data: [],
  },
  enemies: [],
  scrolls: [],
  movementKeys: new Set(),
  keysPressed: new Set(),
  spell: [],
  log: {
    progressEl: undefined,
    latestEl: undefined,
    compendiumEl: undefined,
    latest: "",
  },
  spells: [],
  zone: {
    el: undefined,
    x: 0,
    y: 0,
  },
  minimap: { discovered: [], cleared: [] },
};

function main() {
  state.zone.el = document.getElementById("map");
  state.log.progressEl = document.getElementById("spell-progress");
  state.log.latestEl = document.getElementById("latest-spell");
  const spellCompendium = document.getElementById("spell-compendium");
  state.log.compendiumEl = spellCompendium;

  fetch("/data/forest.txt")
    .then((res) => res.text())
    .then((res) => {
      const forest = res.replace(/ /g, "").replace(/\n+/g, "\n").split("\n");
      state.forest.data = forest;
      loadMap([0, 5], [8, 8]);
      requestAnimationFrame(loop.bind(null, performance.now()));
    });

  document.body.addEventListener("keydown", onKeyDown);
  document.body.addEventListener("keyup", onKeyUp);
  document.body.addEventListener("dblclick", document.body.requestFullscreen);
}

function loadMap([x, y], [px, py]) {
  const WIDTH = 18;
  const HEIGHT = 9;
  const dx = x * WIDTH;
  const dy = y * HEIGHT;
  state.forest.dx = dx;
  state.forest.dy = dy;
  state.zone.el.replaceChildren();

  const player = tileToEl("X", 2 * px, 2 * py);
  state.zone.x = x;
  state.zone.y = y;
  state.zone.el.appendChild(player);
  state.player.el = player;
  state.player.x = px;
  state.player.y = py;
  state.enemies.length = 0; // clear enemies

  const clear = state.minimap.cleared.some((map) => map.x == x && map.y === y);

  for (let h = 0; h < HEIGHT; h++) {
    for (let w = 0; w < WIDTH; w++) {
      const tile = state.forest.data[dy + h][dx + w];
      const el = tileToEl(tile, 2 * w, 2 * h, clear);
      if (el instanceof SVGElement) {
        if (["|", "@", "~", "D", "T", "A", "C"].includes(tile)) {
          prependChild(state.zone.el, el);
        } else {
          state.zone.el.appendChild(el);
        }
      }
    }
  }

  const minimap = document.getElementById("minimap");
  minimap.replaceChildren();

  if (
    !state.minimap.cleared.some((map) => map.x === x && map.y === y) &&
    state.enemies.length === 0
  ) {
    state.minimap.cleared.push({ x, y });
  } else if (
    !state.minimap.discovered.some((map) => map.x === x && map.y === y)
  ) {
    state.minimap.discovered.push({ x, y });
  }

  const drawMiniTile = (color, { x, y }) => {
    const el = document.createElementNS(NS, "rect");
    el.setAttribute("x", x / 2);
    el.setAttribute("y", y / 2);
    el.setAttribute("width", 0.5);
    el.setAttribute("height", 0.5);
    el.setAttribute("fill", color);
    minimap.appendChild(el);
  };

  state.minimap.discovered.forEach((pos) => {
    drawMiniTile("rgb(255, 255, 0)", pos);
  });

  state.minimap.cleared.forEach((pos) => {
    drawMiniTile("rgb(0, 255, 0)", pos);
  });
}

function prependChild(parent, child) {
  if (parent.firstChild) {
    parent.insertBefore(child, parent.firstChild);
  } else {
    parent.appendChild(child);
  }
}

function tileToEl(tile, x, y, clear) {
  const name = ({
    "|": "tree",
    "@": "rock",
    "~": "water",
    "S": "sorcerer",
    "F": "scroll",
    "L": "scroll",
    "C": "scroll",
    "D": "dirt",
    "X": "witch",
    "B": "bat",
    "G": "ghost",
    "T": "tree",
    "A": "water",
    "C": "cobweb",
    "1": "child",
    "2": "child",
  })[tile];

  if (typeof name === "undefined") return undefined;

  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", name);
  el.setAttribute("href", "#" + name);

  const enemy = ENEMIES[name];
  if (enemy && clear) return undefined;

  if (enemy) {
    state.enemies.push({ ...enemy, el, x, y });
  }

  const scroll = SCROLLS[tile];
  if (scroll) {
    state.scrolls.push({ ...scroll, el, x, y });
  }
  return el;
}

function loop(t1, t2) {
  if (!state.help) {
    nextState(t2 - t1);
    drawState();
  }
  requestAnimationFrame(loop.bind(null, t2));
}

function isAlphaNum(char) {
  return /^[a-z0-9]$/i.test(char);
}

function onKeyDown(event) {
  const { key, code, repeat } = event;
  if (repeat) return null;

  if (code === "Space") {
    state.spell.pop();
    return null;
  }

  if (isAlphaNum(key)) {
    handleMovementStart(key);
    state.keysPressed.add(key);
  }

  if (MOVE.includes(key)) {
    state.movementKeys.add(key);
  }
}

function onKeyUp(event) {
  const { key, keyCode } = event;

  if (state.keysPressed.has(key)) {
    onSpell();
  }

  if (MOVE.includes(key)) {
    handleMovementStop(key);
  }
}

function onSpell() {
  const keys = Array.from(state.keysPressed);
  if (!keys.every((key) => MOVE.includes(key))) {
    const spell = keys.sort(util.abccmp).join("");
    if (SUBSPELLS.has(spell)) {
      state.spell.push(spell);
      cast();
    }
  }

  state.keysPressed.clear();
}

function createFireball(src, target, data) {
  const tx = target.x;
  const ty = target.y;
  const x = src.x;
  const y = src.y;
  const [vx, vy] = util.normalize(tx - x, ty - y, MAP_HYPOT);
  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", FIREBALL);
  el.setAttribute("href", "#" + FIREBALL);
  state.zone.el.appendChild(el);
  state.spells.push({ ...data, el, x, y, tx: tx + vx, ty: ty + vy });
}

function createTombstone({ x, y }) {
  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", TOMBSTONE);
  el.setAttribute("href", "#" + TOMBSTONE);
  state.zone.el.appendChild(el);
}

function cast() {
  const spell = state.spell.join("-").toLowerCase();
  const data = SPELLS.find((data) => spell.endsWith(data.spell));

  if (!data) {
    return null;
  }

  const { name } = data;
  state.log.latest = data.mnemonic;
  state.spell = state.spell.slice(0, -data.spell.split("-").length);
  state.player.dx = 0;
  state.player.dy = 0;

  if (name === HELP) {
    state.help = !state.help;
    drawState();
    return null;
  }

  if (state.help) return null;

  switch (name) {
    case FIREBALL: {
      const enemy = nearestEnemy();
      const target = enemy ??
        {
          x: state.player.x + util.rand(-1, 1),
          y: state.player.y + util.rand(-1, 1),
        };
      if (target) {
        createFireball(state.player, target, data);
      }
      break;
    }
    case WIND: {
      const href = "#" + name;
      const x = state.player.x;
      const y = state.player.y;
      const wind = document.querySelector(href);
      const el = wind.cloneNode(true);
      el.setAttribute("r", el.r);
      el.setAttribute("cx", x);
      el.setAttribute("cy", y);
      el.setAttribute("class", name);
      el.setAttribute("href", href);
      state.zone.el.appendChild(el);
      state.spells.push({ ...data, el, x, y });
      break;
    }
    case LIGHTNING: {
      const enemy = nearestEnemy();
      const href = "#" + name;
      const x = state.player.x;
      const y = state.player.y;
      const tx = enemy.x;
      const ty = enemy.y;
      const lightning = document.querySelector(href);
      const el = lightning.cloneNode(true);
      el.setAttribute("x1", x);
      el.setAttribute("y1", y);
      el.setAttribute("x2", tx);
      el.setAttribute("y2", ty);
      el.setAttribute("class", name);
      el.setAttribute("href", href);
      state.zone.el.appendChild(el);
      state.spells.push({ ...data, el, x, y, tx, ty });
      break;
    }
    case NAVIGATE: {
      const href = "#" + name;
      const x = state.player.x;
      const y = state.player.y;
      const cx = 3;
      const cy = 29;

      const tx = cx - 2 * state.forest.dx;
      const ty = cy - 2 * state.forest.dy;

      const compass = document.querySelector(href);
      const el = compass.cloneNode(true);
      el.setAttribute("x1", x);
      el.setAttribute("y1", y);
      el.setAttribute("x2", tx);
      el.setAttribute("y2", ty);
      el.setAttribute("class", name);
      el.setAttribute("href", href);
      state.zone.el.appendChild(el);
      state.spells.push({ ...data, el, x, y });
      break;
    }
    case SPEED: {
      state.spells.push({ ...data });
      break;
    }
  }
}

function nearestEnemy() {
  const { x, y } = state.player;
  return state.enemies.map((enemy) => ({
    ...enemy,
    distance: util.euclidian(enemy.x - x, enemy.y - y),
  })).sort((a, b) => a.distance - b.distance).at(0);
}

function handleMovementStart(key) {
  if (LEFT.includes(key)) {
    state.player.dx = -1;
  } else if (RIGHT.includes(key)) {
    state.player.dx = 1;
  } else if (UP.includes(key)) {
    state.player.dy = -1;
  } else if (DOWN.includes(key)) {
    state.player.dy = 1;
  }
}

function handleMovementStop(key) {
  const hasKey = (key) => state.movementKeys.has(key);
  if (LEFT.includes(key)) {
    state.player.dx = RIGHT.some(hasKey) ? 1 : 0;
  } else if (RIGHT.includes(key)) {
    state.player.dx = LEFT.some(hasKey) ? -1 : 0;
  } else if (UP.includes(key)) {
    state.player.dy = DOWN.some(hasKey) ? 1 : 0;
  } else if (DOWN.includes(key)) {
    state.player.dy = UP.some(hasKey) ? -1 : 0;
  }
  state.movementKeys.delete(key);
}

const EPSILON = 1;
function nextState(delta) {
  nextPlayer(delta);
  nextSpells(delta);
  nextEnemies(delta);
}

function posToTile(x, y) {
  const fy = state.forest.dy + Math.round(y * 0.5);
  const fx = state.forest.dx + Math.round(x * 0.5);
  return state.forest.data[fy]?.[fx];
}

const EMPTY = "_";
function isWalkable(x, y) {
  const { forest } = state;
  const fyt = forest.dy + Math.round((y - 0.5) * 0.5);
  const fyb = forest.dy + Math.round(y * 0.5);

  const rowt = forest.data[fyt];
  const rowb = forest.data[fyb];

  const fxl = forest.dx + Math.round(x * 0.5);
  const fxr = forest.dx + Math.round((x - 1) * 0.5);

  return [rowt?.[fxl], rowt?.[fxr], rowb?.[fxl], rowb?.[fxr]].every((tile) =>
    tile && /\w/.test(tile)
  );
}

function nextPlayer(delta) {
  const { dx, dy, pxPerMs } = state.player;
  const t = pxPerMs * delta;
  const { x: x0, y: y0 } = state.player;
  const x = x0 + dx * t;
  const y = y0 + dy * t;
  const moving = dx !== 0 || dy !== 0;
  const BORDER = 0.5;

  state.scrolls.forEach((scroll) => {
    const dx = scroll.x - x;
    const dy = scroll.y - y;
    const distance = util.euclidian(dx, dy);
    if (distance < EPSILON) {
      state.player.scrolls.push(scroll.name);
      scroll.purge = true;
    }
  });

  if (x < BORDER) {
    loadMap([state.zone.x - 1, state.zone.y], [SCENE.WIDTH - BORDER, y]);
  } else if (x > SCENE.WIDTH - BORDER) {
    loadMap([state.zone.x + 1, state.zone.y], [BORDER, y]);
  } else if (y < -BORDER) {
    loadMap([state.zone.x, state.zone.y - 1], [x, SCENE.HEIGHT - BORDER]);
  } else if (y > SCENE.HEIGHT - BORDER) {
    loadMap([state.zone.x, state.zone.y + 1], [x, BORDER]);
  } else if (moving && isWalkable(x, y)) {
    state.player.x = x;
    state.player.y = y;
  } else if (moving && isWalkable(x0, y)) {
    state.player.y = y;
  } else if (moving && isWalkable(x, y0)) {
    state.player.x = x;
  }
}

function nextSpells(delta) {
  state.spells.forEach((spell) => {
    switch (spell.name) {
      case FIREBALL: {
        const dx = spell.tx - spell.x;
        const dy = spell.ty - spell.y;
        const distance = util.euclidian(dx, dy);
        const t = (spell.pxPerMs * delta) / distance;
        if (Math.abs(dx) > EPSILON) {
          spell.x += dx * t;
        }
        if (Math.abs(dy) > EPSILON) {
          spell.y += dy * t;
        }
        if (distance < EPSILON + EPSILON) {
          spell.purge = true;
        }
        break;
      }
      case WIND: {
        spell.r = spell.r + delta * spell.pxPerMs;
        if (spell.r > spell.maxR) {
          spell.purge = true;
        }
        break;
      }
      case LIGHTNING: {
        spell.msDuration += delta;
        if (spell.msDuration > spell.msVisible) {
          spell.purge = true;
        }
        break;
      }
      case NAVIGATE: {
        spell.msDuration += delta;
        if (spell.msDuration > spell.msVisible) {
          spell.purge = true;
        }
        break;
      }
      case SPEED: {
        spell.msDuration += delta;
        state.player.pxPerMs = Math.max(state.player.pxPerMs, spell.pxPerMs);
        if (spell.msDuration > spell.msInEffect) {
          state.player.pxPerMs = PLAYER_SPEED;
          spell.purge = true;
        }
        break;
      }
    }
  });
}

function nextEnemies(delta) {
  state.enemies.forEach((enemy) => {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const t = (enemy.pxPerMs * delta) / util.euclidian(dx, dy);
    // TODO have the enemies chase oscillating ghost targets so they don't clump
    if (Math.abs(dx) > EPSILON) {
      enemy.x += dx * t;
    }
    if (Math.abs(dy) > EPSILON) {
      enemy.y += dy * t;
    }
    if (enemy.name === SORCERER) {
      enemy.msDuration += delta;
      if (enemy.msDuration > enemy.msCooldown) {
        enemy.msDuration = 0;
        const data = SPELLS.find(({ name }) => name === FIREBALL);
        createFireball(
          enemy,
          state.player,
          { ...data, evil: true },
        );
      }
    }
  });

  if (
    state.enemies.length === 0 &&
    !state.minimap.cleared.some((map) =>
      map.x === state.zone.x && map.y === state.zone.y
    )
  ) {
    state.minimap.cleared.push({ x: state.zone.x, y: state.zone.y });
  }
}

function drawState() {
  state.player.el?.setAttribute("x", state.player.x);
  state.player.el?.setAttribute("y", state.player.y);
  state.enemies.forEach((enemy, ei, enemies) => {
    enemy.el.setAttribute("x", enemy.x);
    enemy.el.setAttribute("y", enemy.y);
    state.spells.forEach((spell, si, spells) => {
      switch (spell.name) {
        case FIREBALL: {
          if (!spell.evil) {
            const dx = enemy.x - spell.x;
            const dy = enemy.y - spell.y;
            const dist = util.euclidian(dx, dy);
            if (dist <= EPSILON) {
              enemy.health -= spell.damage;
              spell.purge = true;
            }
          }
          break;
        }
        case WIND: {
          const dx = enemy.x - spell.x;
          const dy = enemy.y - spell.y;
          const dist = util.euclidian(dx, dy);
          if (dist < spell.r) {
            const [vx, vy] = util.normalize(dx, dy, spell.r);
            enemy.x = spell.x + vx;
            enemy.y = spell.y + vy;
          }
          break;
        }
        case LIGHTNING: {
          const dx = enemy.x - spell.tx;
          const dy = enemy.y - spell.ty;
          const dist = util.euclidian(dx, dy);
          if (dist < EPSILON) {
            enemy.health -= spell.damage;
            spell.damage = 0;
          }
          break;
        }
      }
    });
    if (enemy.health <= 0) {
      enemies.splice(ei, 1);
      createTombstone(enemy);
      enemy.el.style.transformOrigin = `${enemy.x}px ${enemy.y + 1}px`;
      enemy.el.style.transform =
        "rotateX(180deg) skew(40deg) scale(0.8) translateX(0.2px)";
      enemy.el.style.opacity = 0.4;
    }
  });
  state.spells.forEach((spell, index, spells) => {
    if (spell.purge) {
      spells.splice(index, 1);
      spell?.el?.remove();
    } else {
      switch (spell.name) {
        case FIREBALL: {
          spell.el.setAttribute("x", spell.x);
          spell.el.setAttribute("y", spell.y);
          break;
        }
        case WIND: {
          spell.el.setAttribute("r", spell.r);
          break;
        }
        case LIGHTNING: {
          const faded = Math.min(1, spell.msDuration / spell.msVisible);
          spell.el.style.opacity = 1 - faded;
          break;
        }
      }
    }
  });

  state.scrolls.forEach((scroll, index, scrolls) => {
    if (scroll.purge) {
      scrolls.splice(index, 1);
      scroll?.el?.remove();
    }
  });

  state.log.compendiumEl.replaceChildren();
  if (state.help) {
    [{ spell: "spell", mnemonic: "latin", desc: "name" }].concat(
      SPELLS.filter(({ name }) => state.player.scrolls.includes(name)),
    )
      .forEach((data) => {
        const el = document.createElement("div");
        el.classList.add("compendium-row");
        const left = document.createElement("div");
        left.textContent = data.spell;
        const right = document.createElement("div");
        right.textContent = `${data.mnemonic}/${data.desc ?? data.name}`;
        el.appendChild(left);
        el.appendChild(right);
        state.log.compendiumEl.appendChild(el);
      });
  }

  state.log.compendiumEl.classList.toggle("hidden", !state.help);
  state.log.progressEl.textContent = state.spell.join("-");
  state.log.latestEl.textContent = state.log.latest;
}

main();
