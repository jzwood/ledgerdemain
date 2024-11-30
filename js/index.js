// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
const ABC = "qazwsxedcrfvtgbyhnujmikolp";
const NS = "http://www.w3.org/2000/svg";
const cmp = (a, b) => ABC.indexOf(a) - ABC.indexOf(b);
const intcmp = (a, b) => b - a;
const euclidian = (dx, dy) => Math.sqrt((dx * dx) + (dy * dy));
const scale = (f, dx, dy) => {
  return [f * dx, f * dy];
};
const normalize = (dx, dy, f = 1) => {
  const d = Math.max(euclidian(dx, dy), 0.001);
  return scale(f / d, dx, dy);
};
const count = (arr, fxn) =>
  arr.reduce((acc, val) => fxn(val) ? acc + 1 : acc, 0);
const taxicab = (dx, dy) => Math.abs(dx) + Math.abs(dy);

const LEFT = ["a", "j"];
const RIGHT = ["d", "l"];
const UP = ["w", "i"];
const DOWN = ["s", "k"];
const MOVE = [].concat(LEFT, RIGHT, UP, DOWN).join("");
const FIREBALL = "fireball";
const WIND = "wind";
const LIGHTNING = "lightning";

const MAX_MANA = 4;
const MAP_HYPOT = 40;

const SPELLS = [
  {
    spell: "sgni",
    name: FIREBALL,
    mnemonic: "ignis",
    damage: 1,
    mana: 2,
    x: undefined,
    y: undefined,
    tx: undefined,
    ty: undefined,
    el: undefined,
    purge: false,
  },
  {
    spell: "evtn-su",
    mnemonic: "ventus",
    name: WIND,
    mana: 1,
    x: undefined,
    y: undefined,
    r: 1,
    maxR: 10,
    drPerMs: 6 / 1000,
    el: undefined,
    purge: false,
  },
  {
    spell: "sfnui-xul",
    mnemonic: "funis-lux",
    name: LIGHTNING,
    damage: 2,
    mana: 2,
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
    spell: "bil",
    mnemonic: "lib",
    name: "book",
    el: undefined,
    purge: false,
  },
].map(Object.freeze);

const state = {
  player: {
    el: undefined,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    mana: 2,
  },
  forest: {
    dx: 0,
    dy: 0,
    data: [],
  },
  enemies: [],
  movementKeys: new Set(),
  keysPressed: new Set(),
  spell: [],
  log: {
    progressEl: undefined,
    latestEl: undefined,
    latest: "",
  },
  spells: [],
  zoneEl: undefined,
};

function main() {
  state.zoneEl = document.getElementById("map");
  fetch("/data/forest.txt")
    .then((res) => res.text())
    .then((res) => {
      const forest = res.replace(/ /g, "").replace(/\n+/g, "\n").split("\n");
      state.forest.data = forest;
      loadMap([0, 6], [7, 7], forest);
    });
  state.log.progressEl = document.getElementById("spell-progress");
  state.log.latestEl = document.getElementById("latest-spell");
  requestAnimationFrame(loop.bind(null, performance.now()));
  document.body.addEventListener("keydown", onKeyDown);
  document.body.addEventListener("keyup", onKeyUp);
  document.body.addEventListener("dblclick", document.body.requestFullscreen);
}

function loadMap([x, y], [px, py], forest) {
  const WIDTH = 18;
  const HEIGHT = 9;
  const dx = x * WIDTH;
  const dy = y * HEIGHT;
  state.forest.dx = dx;
  state.forest.dy = dy;
  state.zoneEl.replaceChildren();

  const player = tileToEl("W", 2 * px, 2 * py);
  state.zoneEl.appendChild(player);
  state.player.el = player;
  state.player.x = px;
  state.player.y = py;

  for (let h = 0; h < HEIGHT; h++) {
    for (let w = 0; w < WIDTH; w++) {
      const tile = forest[dy + h][dx + w];
      const el = tileToEl(tile, 2 * w, 2 * h);
      if (el instanceof SVGElement) {
        if (["|", "@", "~"].includes(tile)) {
          prependChild(state.zoneEl, el);
        } else {
          state.zoneEl.appendChild(el);
        }
      }
    }
  }
}

function prependChild(parent, child) {
  if (parent.firstChild) {
    parent.insertBefore(child, parent.firstChild);
  } else {
    parent.appendChild(child);
  }
}

function tileToEl(tile, x, y) {
  const type = ({
    "|": "tree",
    "@": "rock",
    "~": "water",
    "W": "player",
    "B": "bat",
  })[tile];

  if (typeof type === "undefined") return undefined;

  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", type);
  el.setAttribute("href", "#" + type);
  if (type === "bat") {
    state.enemies.push({ name: type, el, x, y, health: 2 });
  }
  return el;
}

function loop(t1, t2) {
  nextState(t2 - t1);
  drawState();
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
    const spell = keys.sort(cmp).join("");
    state.spell.push(spell);
    const fullSpell = state.spell.join("-").toLowerCase();
    cast(fullSpell);
  }

  state.keysPressed.clear();
}

function cast(spell) {
  const data = SPELLS.find((data) => spell.endsWith(data.spell));

  if (!data) {
    return null;
  }

  const { name } = data;
  state.log.latest = data.mnemonic;
  state.spell = state.spell.slice(0, -data.spell.split("-").length);

  switch (name) {
    case FIREBALL: {
      const enemy = nearestEnemy();
      if (enemy) {
        const tx = enemy.x;
        const ty = enemy.y;
        const x = state.player.x;
        const y = state.player.y;
        const [vx, vy] = normalize(tx - x, ty - y, MAP_HYPOT);
        const el = document.createElementNS(NS, "use");
        el.setAttribute("x", x);
        el.setAttribute("y", y);
        el.setAttribute("class", name);
        el.setAttribute("href", "#" + name);
        state.zoneEl.appendChild(el);
        state.spells.push({ ...data, el, x, y, tx: tx + vx, ty: ty + vy });
      }
      break;
    }
    case WIND: {
      const href = "#" + name;
      const x = state.player.x;
      const y = state.player.y;
      const wind = document.querySelector(href);
      const el = wind.cloneNode(true);
      el.setAttribute("r", wind.r);
      el.setAttribute("cx", x);
      el.setAttribute("cy", y);
      el.setAttribute("class", name);
      el.setAttribute("href", href);
      state.zoneEl.appendChild(el);
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
      state.zoneEl.appendChild(el);
      state.spells.push({ ...data, el, x, y, tx, ty });
      break;
    }
  }
}

function nearestEnemy() {
  const { x, y } = state.player;
  return state.enemies.map((enemy) => ({
    ...enemy,
    distance: euclidian(enemy.x - x, enemy.y - y),
  })).sort((a, b) => b.distance - a.distance).at(0);
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

const PX_PER_SECOND = 3;
const SECONDS_PER_MS = 1 / 1000;
const FACTOR = PX_PER_SECOND * SECONDS_PER_MS;
const BUFFER = 50;
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
  const fy = state.forest.dy + Math.round(y * 0.5);
  const row = state.forest.data[fy];

  const fxl = state.forest.dx + Math.round(x * 0.5);
  const fxr = state.forest.dx + Math.round((x - 1) * 0.5);

  return /\w/.test(row?.[fxl] ?? "") && /\w/.test(row?.[fxr] ?? "");
}

function nextPlayer(delta) {
  const t = FACTOR * delta;
  const { dx, dy } = state.player;
  const x = state.player.x + dx * t;
  const y = state.player.y + dy * t;

  if (isWalkable(x, y)) {
    state.player.x = x;
    state.player.y = y;
  }
}

function nextSpells(delta) {
  state.spells.forEach((spell) => {
    switch (spell.name) {
      case FIREBALL: {
        const dx = spell.tx - spell.x;
        const dy = spell.ty - spell.y;
        const distance = euclidian(dx, dy);
        const t = (FACTOR * delta) / distance;
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
        spell.r = spell.r + delta * spell.drPerMs;
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
    }
  });
}

function nextEnemies(delta) {
  const t = FACTOR * delta;
  state.enemies.forEach((enemy) => {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const t2 = (0.75 * t) / euclidian(dx, dy);
    // TODO have the enemies chase oscillating ghost targets so they don't clump
    if (Math.abs(dx) > EPSILON) {
      enemy.x += dx * t2;
    }
    if (Math.abs(dy) > EPSILON) {
      enemy.y += dy * t2;
    }
  });
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
          const dx = enemy.x - spell.x;
          const dy = enemy.y - spell.y;
          const dist = euclidian(dx, dy);
          if (dist <= EPSILON) {
            enemy.health -= spell.damage;
            spell.purge = true;
          }
          break;
        }
        case WIND: {
          const dx = enemy.x - spell.x;
          const dy = enemy.y - spell.y;
          const dist = euclidian(dx, dy);
          if (dist < spell.r) {
            const [vx, vy] = normalize(dx, dy, spell.r);
            enemy.x = spell.x + vx;
            enemy.y = spell.y + vy;
          }
          break;
        }
        case LIGHTNING: {
          const dx = enemy.x - spell.tx;
          const dy = enemy.y - spell.ty;
          const dist = euclidian(dx, dy);
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
      enemy.el.remove();
    }
  });
  state.spells.forEach((spell, index, spells) => {
    if (spell.purge) {
      spells.splice(index, 1);
      spell.el.remove();
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

  state.log.progressEl.textContent = state.spell.join("-");
  state.log.latestEl.textContent = state.log.latest;
}

main();
