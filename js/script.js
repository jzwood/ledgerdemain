// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
const ABC = "qazwsxedcrfvtgbyhnujmikolp";
const cmp = (a, b) => ABC.indexOf(a) - ABC.indexOf(b);

const LEFT = ["a", "j"];
const RIGHT = ["d", "l"];
const UP = ["w", "i"];
const DOWN = ["s", "k"];
const MOVE = [].concat(LEFT, RIGHT, UP, DOWN).join("");

const state = {
  player: undefined,
  enemies: [],
  keysPressed: new Set(),
  spell: [],
  actionQueue: [],
};

function init() {
  const playerEl = document.getElementById("player");
  const enemyEls = Array.from(document.querySelectorAll(".enemy"));
  state.player = {
    el: playerEl,
    x: 500,
    y: 50,
    dx: 0,
    dy: 0,
    ghosts: [0, 0, 0, 0],
  };
  state.enemies = enemyEls.map((enemy) => ({
    el: enemy,
    x: Math.random() * 700,
    y: Math.random() * 500,
  }));
  requestAnimationFrame(loop.bind(null, performance.now()));
}

function loop(t1, t2) {
  nextState(t2 - t1);
  drawState();
  requestAnimationFrame(loop.bind(null, t2));
}

function isAlpha(char) {
  return /^\w$/.test(char);
}

function onKeyDown(event) {
  const { key, keyCode, repeat } = event;
  if (repeat) return null;

  if (isAlpha(key)) {
    handleMovementStart(key);
    state.keysPressed.add(key);
  }
}

function onKeyUp(event) {
  const { key, keyCode } = event;

  if (state.keysPressed.has(key) && !MOVE.includes(key)) {
    endSpellSegment();
  }

  if (isAlpha(key)) {
    handleMovementStop(key);
  }

  state.keysPressed.delete(key);
}

function endSpellSegment() {
  const keys = Array.from(state.keysPressed).sort(cmp).join("");
  state.spell.push(keys);
  state.keysPressed.clear();
  console.log(keys, state.keysPressed);
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
  console.log(state.keysPressed, "2");
  const hasKey = (key) => state.keysPressed.has(key);
  if (LEFT.includes(key)) {
    state.player.dx = RIGHT.some(hasKey) ? 1 : 0;
  } else if (RIGHT.includes(key)) {
    state.player.dx = LEFT.some(hasKey) ? -1 : 0;
  } else if (UP.includes(key)) {
    state.player.dy = DOWN.some(hasKey) ? 1 : 0;
  } else if (DOWN.includes(key)) {
    state.player.dy = UP.some(hasKey) ? -1 : 0;
  }
}

const PX_PER_SECOND = 100;
const SECONDS_PER_MS = 1 / 1000;
const FACTOR = PX_PER_SECOND * SECONDS_PER_MS;
const BUFFER = 50;
const EPSILON = 1
function nextState(delta) {
  const { dx, dy } = state.player;
  const t = FACTOR * delta;
  state.player.x += dx * t;
  state.player.y += dy * t;

  const t2 = 0.5 * t;
  state.enemies.forEach((enemy) => {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const t2 = (0.5 * t) / Math.sqrt(dx * dx + dy * dy);
    // TODO have the enemies chase oscillating ghost targets so they don't clump
    if (Math.abs(dx) > EPSILON) {
      enemy.x += dx * t2;
    }
    if (Math.abs(dy) > EPSILON){
      enemy.y += dy * t2;
    }
  });
}

function drawState() {
  state.player.el.setAttribute("cx", state.player.x);
  state.player.el.setAttribute("cy", state.player.y);
  state.enemies.forEach((enemy) => {
    enemy.el.setAttribute("cx", enemy.x);
    enemy.el.setAttribute("cy", enemy.y);
  });
}

init();
document.body.addEventListener("keydown", onKeyDown);
document.body.addEventListener("keyup", onKeyUp);
