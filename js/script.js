// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
const ABC = "qazwsxedcrfvtgbyhnujmikolp";
const cmp = (a, b) => ABC.indexOf(a) - ABC.indexOf(b);

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
  state.player = {el: playerEl, x: 500, y: 50, dx: 0, dy: 0}
  state.enemies = enemyEls.map((enemy) =>
    ({el: enemy, x: Math.random() * 700, y: Math.random() * 500})
  );
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

  if (state.keysPressed.has(key)) {
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
  //console.log(keys, state.spell);
}

const LEFT = "aj";
const RIGHT = "dl";
const UP = "wi";
const DOWN = "sk";
const HORIZ = LEFT + RIGHT;
const VERT = UP + DOWN;
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
  // TODO make this smarter so that if you lift up right but you're already pressing left you start moving left
  if (HORIZ.includes(key)) {
    state.player.dx = 0;
  } else if (VERT.includes(key)) {
    state.player.dy = 0;
  }
}

const PX_PER_SECOND = 200;
const SECONDS_PER_MS = 1 / 1000;
const FACTOR = PX_PER_SECOND * SECONDS_PER_MS;
const BUFFER = 50
function nextState(delta) {
  const { dx, dy } = state.player;
  const t = FACTOR * delta;
  state.player.x += dx * t;
  state.player.y += dy * t;

  const t2 = 0.5 * t;
  state.enemies.forEach((enemy) => {
    const dx = state.player.x - enemy.x
    const dy = state.player.y - enemy.y
    const t2 = (0.5 * t) / Math.sqrt(dx * dx + dy * dy)
    enemy.x += dx * t2
    enemy.y += dy * t2
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
