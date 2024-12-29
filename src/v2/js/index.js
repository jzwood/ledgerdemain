// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
import * as utils from "./utils.js";

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
const QUICK = "quick";
const NAVIGATE = "navigate";
const HEDGEHOG = "hedgehog";
const HELP = "help";
const TOMBSTONE = "tombstone";
const SORCERER = "sorcerer";
const CHILD = "child";
const SHARE = "share";

const MAP_HYPOT = 40;

const SPELLS = [
  {
    spell: "rbil",
    mnemonic: "libri",
    name: HELP,
    desc: "show & hide spells",
  },
  {
    spell: "ech-snui",
    mnemonic: "echinus",
    name: HEDGEHOG,
    desc: "summon hedgehog",
    purge: false,
  },
  {
    spell: "srbio-sgni",
    name: FIREBALL,
    mnemonic: "orbis ignis",
    damage: 1,
    pxPerMs: 6 / 1000,
    friendly: true,
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
    maxR: 8,
    el: undefined,
    purge: false,
  },
  {
    spell: "rop-erop",
    mnemonic: "propero",
    name: QUICK,
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
  {
    spell: "agno-sco",
    mnemonic: "agnosco",
    name: SHARE,
    desc: "minimap → clipboard",
    purge: false,
  },
].map(Object.freeze);

const SUBSPELLS = new Set(SPELLS.flatMap(({ spell }) => spell.split("-")));

const ENEMIES = [
  {
    name: "bat",
    health: 1,
    blockers: ["@", "|"],
    pxPerMs: 2 / 1000,
  },
  {
    name: "ghost",
    blockers: ["@"],
    health: 2,
    pxPerMs: 1 / 1000,
  },
  {
    name: SORCERER,
    blockers: ["@", "~", "|", "C"],
    health: 3,
    pxPerMs: 0.25 / 1000,
    msCooldown: 3000,
    msDuration: 0,
  },
].reduce(utils.toDictOn("name"), {});

const FRIENDS = [
  {
    name: CHILD,
    blockers: ["@", "~", "|", "C"],
    pxPerMs: 1 / 1000,
  },
  {
    name: HEDGEHOG,
    blockers: ["@", "~", "|", "C", "-"],
    pxPerMs: 0.75 / 1000,
  },
].reduce(utils.toDictOn("name"), {});

const SCROLLS = [
  { tile: "F", name: FIREBALL },
  { tile: "L", name: LIGHTNING },
  { tile: "W", name: WIND },
  { tile: "Q", name: QUICK },
  { tile: "N", name: NAVIGATE },
  { tile: "X", name: SHARE },
]
  .reduce(
    utils.toDictOn("tile"),
    {},
  );

const state = {
  gameover: false,
  player: {
    el: undefined,
    x: 2,
    y: 2,
    dx: 0,
    dy: 0,
    pxPerMs: PLAYER_SPEED,
    scrolls: [HELP, HEDGEHOG],
    blockers: ["@", "~", "|"],
  },
  help: false,
  forest: {
    dx: 0,
    dy: 0,
    data: [],
  },
  enemies: [],
  friends: [],
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
  minimap: {
    discovered: [],
    cleared: [],
    text: utils.range(6).map(() => utils.range(6).fill("⬛")),
  },
};

function main() {
  state.zone.el = document.getElementById("map");
  state.log.progressEl = document.getElementById("spell-progress");
  state.log.latestEl = document.getElementById("latest-spell");
  state.log.compendiumEl = document.getElementById("spell-compendium");
  state.log.gameOverEl = document.getElementById("game-over");

  fetch("src/v2/data/forest.txt")
    .then((res) => res.text())
    .then((res) => {
      const forest = res.replace(/ /g, "").replace(/\n+/g, "\n").split("\n");
      state.forest.data = forest;
      var params = new URLSearchParams(location.search);
      const x = +(params.get("x") ?? 0);
      const y = +(params.get("y") ?? 5);
      loadMap([x, y], [10, 5]);
      requestAnimationFrame(loop.bind(null, performance.now()));
    });

  document.body.addEventListener("keydown", onKeyDown);
  document.body.addEventListener("keyup", onKeyUp);
  document.body.addEventListener("dblclick", document.body.requestFullscreen);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !state.gameover) {
      state.help = true;
      drawState();
    }
  });
  document.querySelector("#game-over > button").addEventListener(
    "click",
    copyToClipboard,
  );
}

function loadMap([x, y], [px, py]) {
  const WIDTH = 18;
  const HEIGHT = 9;
  const dx = x * WIDTH;
  const dy = y * HEIGHT;
  state.forest.dx = dx;
  state.forest.dy = dy;
  state.zone.el.replaceChildren();

  const player = tileToEl("^", 2 * px, 2 * py);
  state.zone.x = x;
  state.zone.y = y;
  state.zone.el.appendChild(player);
  state.player.el = player;
  state.player.x = px;
  state.player.y = py;
  state.enemies.length = 0; // clear enemies
  state.spell.length = 0;
  state.friends.length = 0;
  state.scrolls.length = 0;

  const clear = state.minimap.cleared.some((map) => map.x == x && map.y === y);

  for (let h = 0; h < HEIGHT; h++) {
    for (let w = 0; w < WIDTH; w++) {
      const tile = state.forest.data[dy + h][dx + w];
      const el = tileToEl(tile, 2 * w, 2 * h, clear);
      if (el instanceof SVGElement) {
        if (["|", "@", "~", "-", "T", "A", "C"].includes(tile)) {
          prependChild(state.zone.el, el);
        } else {
          state.zone.el.appendChild(el);
        }
      }
    }
  }

  updateMinimap(x, y);
}

function updateMinimap(x, y) {
  const minimap = document.getElementById("minimap");
  const gameoverMinimap = document.querySelector("#game-over > pre");
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
    if (state.zone.x === x && state.zone.y === y) {
      el.setAttribute("fill", "red");
    }
    minimap.appendChild(el);
  };

  state.minimap.discovered.forEach(({ x, y }) => {
    drawMiniTile("rgb(255, 255, 0)", { x, y });
    state.minimap.text[y][x] = "🟨";
  });

  state.minimap.cleared.forEach(({ x, y }) => {
    drawMiniTile("rgb(0, 255, 0)", { x, y });
    state.minimap.text[y][x] = "🟩";
  });

  state.minimap.text[y][x] = "🟥";
  gameoverMinimap.textContent = state.minimap.text.map((row) => row.join(""))
    .join("\n");
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
    "-": "dirt",
    "1": CHILD,
    "2": CHILD,
    "@": "rock",
    "A": "water",
    "B": "bat",
    "C": "cobweb",
    "F": "scroll",
    "G": "ghost",
    "L": "scroll",
    "N": "scroll",
    "Q": "scroll",
    "X": "scroll",
    "S": SORCERER,
    "T": "tree",
    "W": "scroll",
    "^": "witch",
    "|": "tree",
    "~": "water",
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

  const friend = FRIENDS[name];
  if (friend) {
    state.friends.push({ ...friend, el, x, y });
  }

  const scroll = SCROLLS[tile];
  if (scroll && state.player.scrolls.includes(scroll.name)) return undefined;

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

  if (code == "Escape") {
    state.help = false;
  }

  if (repeat || state.player.dead) return null;

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
    const spell = keys.sort(utils.abccmp).join("");
    if (SUBSPELLS.has(spell)) {
      state.spell.push(spell);
      if (state.spell.length > 8) {
        state.spell.shift();
      }
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
  const [vx, vy] = utils.normalize(tx - x, ty - y, MAP_HYPOT);
  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", FIREBALL);
  el.setAttribute("href", "#" + FIREBALL);
  state.zone.el.appendChild(el);
  state.spells.push({ ...data, el, x, y, tx: tx + vx, ty: ty + vy });
}

function createTombstone(entity) {
  const { x, y } = entity;
  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", TOMBSTONE);
  el.setAttribute("href", "#" + TOMBSTONE);
  state.zone.el.appendChild(el);

  entity.el.style.transformOrigin = `${entity.x}px ${entity.y + 1}px`;
  entity.el.style.transform =
    "rotateX(180deg) skew(40deg) scale(0.8) translateX(0.2px)";
  entity.el.style.opacity = 0.4;
}

function createHedgehog(src) {
  const data = FRIENDS[HEDGEHOG];
  const x = src.x;
  const y = src.y;
  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", HEDGEHOG);
  el.setAttribute("href", "#" + HEDGEHOG);
  state.zone.el.appendChild(el);
  state.friends.push({ ...data, el, x, y });
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
          x: state.player.x + utils.rand(-1, 1),
          y: state.player.y + utils.rand(-1, 1),
        };
      createFireball(state.player, target, data);
      break;
    }
    case WIND: {
      const href = "#" + name;
      const x = state.player.x;
      const y = state.player.y;
      const wind = document.querySelector(href);
      const el = wind.cloneNode(true);
      el.setAttribute("r", 0);
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
      const target = enemy ??
        {
          x: utils.rand(0, SCENE.WIDTH),
          y: utils.rand(0, SCENE.HEIGHT),
        };

      const href = "#" + name;
      const x = state.player.x;
      const y = state.player.y;
      const dx = target.x - state.player.x;
      const dy = target.y - state.player.y;
      const distance = utils.euclidian(dx, dy);
      const [vx, vy] = utils.normalize(dx, dy, Math.min(data.maxR, distance));
      const tx = x + vx;
      const ty = y + vy;

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
    case HEDGEHOG: {
      createHedgehog(state.player);
      break;
    }
    case QUICK: {
      state.spells.push({ ...data });
      break;
    }
    case SHARE: {
      copyToClipboard();
      break;
    }
  }
}

function nearestEnemy() {
  const { x, y } = state.player;
  return state.enemies.map((enemy) => ({
    ...enemy,
    distance: utils.euclidian(enemy.x - x, enemy.y - y),
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
  nextFriends(delta);
  nextScrolls();
}

function posToTile(x, y) {
  const fy = state.forest.dy + Math.round(y * 0.5);
  const fx = state.forest.dx + Math.round(x * 0.5);
  return state.forest.data[fy]?.[fx];
}

function isWalkable(x, y, blockers) {
  const { forest } = state;
  const fyt = forest.dy + Math.round(0.5 * (y - 0.5));
  const fyb = forest.dy + Math.round(0.5 * y);

  const rowt = forest.data[fyt];
  const rowb = forest.data[fyb];

  const fxl = forest.dx + Math.round(0.5 * x);
  const fxr = forest.dx + Math.round(0.5 * (x - 1));

  return [rowt?.[fxl], rowt?.[fxr], rowb?.[fxl], rowb?.[fxr]].every((tile) =>
    tile && !blockers.includes(tile)
  );
}

function copyToClipboard() {
  const minimap = state.minimap.text.map((row) => row.join("")).join("\n");
  navigator.clipboard
    .writeText(minimap)
    .catch(() => console.info(minimap));
}

function nextPlayer(delta) {
  let { x: x1, y: y1, dx, dy, pxPerMs, blockers } = state.player;
  [dx, dy] = utils.normalize(dx, dy, pxPerMs * delta);
  const x2 = x1 + dx;
  const y2 = y1 + dy;
  const moving = dx !== 0 || dy !== 0;
  const HALF_PLAYER_WIDTH = 0.5;
  const PLAYER_HEIGHT = 1;

  if (x2 < -0.5) {
    loadMap([state.zone.x - 1, state.zone.y], [
      SCENE.WIDTH - 0.5,
      utils.round(y2),
    ]);
  } else if (x2 > SCENE.WIDTH - 0.5) {
    loadMap([state.zone.x + 1, state.zone.y], [
      -HALF_PLAYER_WIDTH,
      utils.round(y2),
    ]);
  } else if (y2 < -0.5) {
    loadMap([state.zone.x, state.zone.y - 1], [
      utils.round(x2),
      SCENE.HEIGHT - 1,
    ]);
  } else if (y2 > SCENE.HEIGHT - 1) {
    loadMap([state.zone.x, state.zone.y + 1], [utils.round(x2), -0.5]);
  } else if (moving) {
    const [x, y] = nextXY(x1, y1, x2, y2, blockers);
    state.player.x = x;
    state.player.y = y;
  }

  if (state.player.dead) {
    state.player.dx = 0;
    state.player.dy = 0;
  }
}

function nextXY(x1, y1, x2, y2, blockers) {
  if (isWalkable(x2, y2, blockers)) {
    return [x2, y2];
  } else if (isWalkable(x1, y2, blockers)) {
    return [x1, y2];
  } else if (isWalkable(x2, y1, blockers)) {
    return [x2, y1];
  } else {
    return [x1, y1];
  }
}

function nextScrolls() {
  const { x, y } = state.player;
  state.scrolls.forEach((scroll) => {
    const dx = scroll.x - x;
    const dy = scroll.y - y;
    const distance = utils.euclidian(dx, dy);
    if (distance < EPSILON) {
      state.player.scrolls.push(scroll.name);
      state.help = true;
      scroll.purge = true;
    }
  });
}

function nextSpells(delta) {
  state.spells.forEach((spell) => {
    switch (spell.name) {
      case FIREBALL: {
        let dx = spell.tx - spell.x;
        let dy = spell.ty - spell.y;
        const dist = utils.euclidian(dx, dy);
        if (dist < EPSILON + EPSILON) {
          spell.purge = true;
        } else {
          [dx, dy] = utils.normalize(dx, dy, spell.pxPerMs * delta);
          spell.x += dx;
          spell.y += dy;
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
        if (spell.msDuration > 0) {
          spell.damage = 0;
        }
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
      case QUICK: {
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

function nextMove(entities, delta, action = undefined) {
  const FORCE_FIELD = 2 * EPSILON;
  entities.forEach((entity, i) => {
    let dx = state.player.x - entity.x;
    let dy = state.player.y - entity.y;
    let c;

    const dist = utils.euclidian(dx, dy);
    if (dist >= EPSILON) {
      [dx, dy, c] = entities.reduce((acc, other, j) => {
        if (i === j) return acc;
        let dx = entity.x - other.x;
        let dy = entity.y - other.y;

        const dist = utils.euclidian(dx, dy);
        if (dist > FORCE_FIELD) return acc;

        [dx, dy] = utils.normalize(dx, dy, FORCE_FIELD - dist);
        const [pdx, pdy, pc] = acc;
        return [pdx + dx, pdy + dy, pc + 1];
      }, [dx, dy, 1]);

      [dx, dy] = utils.normalize(dx, dy, entity.pxPerMs * delta);

      const [nx, ny] = nextXY(
        entity.x,
        entity.y,
        entity.x + dx,
        entity.y + dy,
        entity.blockers,
      );
      entity.x = nx;
      entity.y = ny;
    }

    action && action(entity, dist);
  });
}

function nextEnemies(delta) {
  nextMove(state.enemies, delta, (enemy, dist) => {
    if (dist < EPSILON) {
      state.player.dead = true;
    }

    if (enemy.name === SORCERER) {
      enemy.msDuration += delta;
      if (enemy.msDuration > enemy.msCooldown) {
        enemy.msDuration = 0;
        enemy.msCooldown = utils.rand(2500, 3500);
        const data = SPELLS.find(({ name }) => name === FIREBALL);
        createFireball(
          enemy,
          state.player,
          { ...data, friendly: false },
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

function nextFriends(delta) {
  nextMove(state.friends, delta);
}

function drawState() {
  if (state.player.el) {
    state.player.el.setAttribute("x", state.player.x);
    state.player.el.setAttribute("y", state.player.y);
  }

  if (state.player.dead && !state.gameover) {
    state.gameover = true;

    createTombstone(state.player);
  }

  state.enemies.forEach((enemy, ei, enemies) => {
    enemy.el.setAttribute("x", enemy.x);
    enemy.el.setAttribute("y", enemy.y);
    state.spells.forEach((spell, si, spells) => {
      switch (spell.name) {
        case FIREBALL: {
          if (spell.friendly) {
            const dx = enemy.x - spell.x;
            const dy = enemy.y - spell.y;
            const dist = utils.euclidian(dx, dy);
            if (dist <= EPSILON) {
              enemy.health -= spell.damage;
              spell.purge = true;
            }
          } else {
            const dx = state.player.x - spell.x;
            const dy = state.player.y - spell.y;
            const dist = utils.euclidian(dx, dy);
            if (dist <= EPSILON) {
              state.player.dead = true;
              spell.purge = true;
            }
          }
          break;
        }
        case WIND: {
          const dx = enemy.x - spell.x;
          const dy = enemy.y - spell.y;
          const dist = utils.euclidian(dx, dy);
          if (dist < spell.r) {
            const [vx, vy] = utils.normalize(dx, dy, spell.r);
            const [nx, ny] = nextXY(
              enemy.x,
              enemy.y,
              spell.x + vx,
              spell.y + vy,
              enemy.blockers,
            );
            enemy.x = nx;
            enemy.y = ny;
          }
          break;
        }
        case LIGHTNING: {
          const dx = enemy.x - spell.tx;
          const dy = enemy.y - spell.ty;
          const dist = utils.euclidian(dx, dy);
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
    }
  });

  state.friends.forEach((friend, ei) => {
    friend.el.setAttribute("x", friend.x);
    friend.el.setAttribute("y", friend.y);
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
    [{ spell: "spell", mnemonic: "latin", desc: "description" }].concat(
      SPELLS.filter(({ name }) => state.player.scrolls.includes(name)),
    )
      .forEach((data) => {
        const el = document.createElement("div");
        el.classList.add("compendium-row");
        const left = document.createElement("div");
        left.textContent = data.spell;
        left.style.whiteSpace = "nowrap";
        const right = document.createElement("div");
        right.textContent = `${data.mnemonic}/${data.desc ?? data.name}`;
        el.appendChild(left);
        el.appendChild(right);
        state.log.compendiumEl.appendChild(el);
      });
  }

  state.log.compendiumEl.classList.toggle("hidden", !state.help);
  state.log.gameOverEl.classList.toggle("hidden", !state.gameover);
  state.log.progressEl.textContent = state.spell.join("-");
  state.log.latestEl.textContent = state.log.latest;
}

main();
