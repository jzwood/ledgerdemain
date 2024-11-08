const playerEl = document.getElementById("player");
const enemies = Array.from(document.querySelectorAll(".enemy"));

const player = {
  x: 500,
  y: 50,
  spell: '',
  left() {
    this.x -= 10;
    playerEl.setAttribute("cx", this.x);
  },
  right() {
    this.x += 10;
    playerEl.setAttribute("cx", this.x);
  },
  down() {
    this.y += 10;
    playerEl.setAttribute("cy", this.y);
  },
  up() {
    this.y -= 10;
    playerEl.setAttribute("cy", this.y);
  },
};

function handleKeyDown(event) {
  const { key, keyCode, repeat } = event
  if (repeat) return null

  if (keyCode >= 97 && keyCode <= 122 ) {
    player.spell += key
  }


  switch (key) {
    case "ArrowLeft":
      player.left();
      break;
    case "ArrowRight":
      player.right();
      break;

    case "ArrowDown":
      player.down();
      break;

    case "ArrowUp":
      player.up();
      break;
  }
}

//setInterval(() => {
  //enemies.forEach((enemy) => {
    //const cx = +enemy.getAttribute("cx");
    //const cy = +enemy.getAttribute("cy");
    //const dx = player.x - cx;
    //const dy = player.y - cy;
    //const factor = 5;
    //if (dx !== 0) {
      //enemy.setAttribute("cx", cx + factor * dx / Math.abs(dx));
    //}
    //if (dy !== 0) {
      //enemy.setAttribute("cy", cy + factor * dy / Math.abs(dy));
    //}
  //});
//}, 1000);

document.body.addEventListener("keydown", handleKeyDown);
