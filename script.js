console.log("✅ script.js loaded (zigzag path + images + interactions)");

let plants = [];
let dataLoaded = false;

// hover / click state
let hoveredPlant = null;
let activePlant = null;       // plant currently “open” in tooltip
let tooltipMode = "snippet";  // "snippet" or "full"

// click+hold state
let mouseDown = false;
let mouseDownStart = 0;
let pressedPlant = null;
const LONG_PRESS_MS = 700;

// images
let plantImages = {};      // keyed by Number (1..10)
let wateringCanImg = null;

// preload images
function preload() {
  // plant images: plant1.png, plant2.png, ... plant10.png
  for (let i = 1; i <= 10; i++) {
    plantImages[i] = loadImage(
      `plant${i}.png`,
      () => console.log(`loaded plant${i}.png`),
      () => console.warn(`could not load plant${i}.png`)
    );
  }

  // watering can cursor
  wateringCanImg = loadImage(
    "wateringcan.png",
    () => console.log("loaded wateringcan.png"),
    () => console.warn("could not load wateringcan.png")
  );
}

function setup() {
  const container = document.getElementById("canvas-container");
  const canvas = createCanvas(container.clientWidth, container.clientHeight);
  canvas.parent("canvas-container");
  textFont("system-ui, -apple-system, BlinkMacSystemFont, sans-serif");
  textAlign(CENTER, CENTER);

  noCursor(); // hide default cursor; we’ll draw the watering can

  loadPlantData();
}

function windowResized() {
  const container = document.getElementById("canvas-container");
  resizeCanvas(container.clientWidth, container.clientHeight);
}

function draw() {
  background(9, 9, 18);

  // vignette
  noStroke();
  for (let r = max(width, height); r > 0; r -= 50) {
    let alpha = map(r, 0, max(width, height), 220, 0);
    fill(15, 23, 42, alpha);
    ellipse(width / 2, height / 2, r, r);
  }

  // title / subtitle
  fill(226, 232, 240);
  textSize(20);
  text("The Garden That Remembers", width / 2, 40);

  textSize(12);
  fill(148, 163, 184);
  text(
    "Follow the plant path. Hover to see them glow; click to hear them remember.",
    width / 2,
    64
  );

  if (!dataLoaded) {
    textSize(14);
    fill(148, 163, 184);
    text("Loading plants...", width / 2, height / 2);
    drawWateringCan();
    return;
  }

  hoveredPlant = null;

  // ---- LAYOUT: vertical zigzag path in Number order ----
  const n = plants.length;

  const topMargin = 140;
  const bottomMargin = 80;
  const availableHeight = height - topMargin - bottomMargin;
  const stepY = n > 1 ? max(90, availableHeight / (n - 1)) : 0; // at least 90px apart

  const leftX = width * 0.30;
  const rightX = width * 0.70;

  // assign positions in array order (already sorted by Number)
  plants.forEach((p, i) => {
    const y = topMargin + stepY * i;
    const x = (i % 2 === 0) ? leftX : rightX; // zigzag: left, right, left, right...

    p.screenX = x;
    p.screenY = y;
  });

  // ---- VINE: straight lines between plants ----
  stroke(56, 189, 248, 160); // soft cyan
  strokeWeight(3);
  noFill();
  for (let i = 0; i < n - 1; i++) {
    const a = plants[i];
    const b = plants[i + 1];
    line(a.screenX, a.screenY, b.screenX, b.screenY);
  }

  // ---- Draw plants (images) on top ----
  imageMode(CENTER);
  plants.forEach((p) => {
    const x = p.screenX;
    const y = p.screenY;

    // size from % of Grief
    const size = map(p.griefPercent, 0, 70, 40, 90);
    p.drawSize = size;

    const c = stageToColor(p["Grief Stage"]);

    // glow behind image
    noStroke();
    fill(red(c), green(c), blue(c), 60);
    ellipse(x, y, size * 1.2, size * 1.2);

    // detect hover first for tint
    const d = dist(mouseX, mouseY, x, y);
    const isHovered = d < size * 0.5 + 6;
    if (isHovered) {
      hoveredPlant = p;
    }

    // plant image with hover saturation
    const img = plantImages[p.Number];
    push();
    if (isHovered) {
      // brighter on hover
      tint(255, 255, 255, 255);
    } else {
      // slightly muted at rest
      tint(230, 230, 230, 230);
    }

    if (img) {
      image(img, x, y, size, size);
    } else {
      // fallback: colored circle if image missing
      noStroke();
      fill(red(c), green(c), blue(c), 220);
      ellipse(x, y, size * 0.6, size * 0.6);
    }
    pop();

    // label
    textSize(11);
    fill(226, 232, 240, 230);
    text(p["Plant Name"], x, y + size * 0.7);
  });

  // hover outline
  if (hoveredPlant) {
    const x = hoveredPlant.screenX;
    const y = hoveredPlant.screenY;
    const s = hoveredPlant.drawSize || 50;

    noFill();
    stroke(248, 250, 252, 230);
    strokeWeight(2);
    ellipse(x, y, s * 1.1, s * 1.1);
    noStroke();
  }

  updateTooltip();
  drawWateringCan();
}

// ---- Interaction helpers ----

// Return plant under mouse (or null)
// (used for click + hold detection)
function getPlantUnderMouse() {
  let hit = null;
  plants.forEach((p) => {
    const size = p.drawSize || 50;
    const d = dist(mouseX, mouseY, p.screenX, p.screenY);
    if (d < size * 0.5 + 6) {
      hit = p;
    }
  });
  return hit;
}

function mousePressed() {
  if (!dataLoaded) return;
  mouseDown = true;
  mouseDownStart = millis();
  pressedPlant = getPlantUnderMouse();
}

function mouseReleased() {
  if (!mouseDown) return;
  mouseDown = false;

  const duration = millis() - mouseDownStart;
  const plantUnderMouse = getPlantUnderMouse();

  if (pressedPlant && plantUnderMouse && pressedPlant === plantUnderMouse) {
    // click or long-press on a plant
    activePlant = pressedPlant;
    if (duration >= LONG_PRESS_MS) {
      tooltipMode = "full";    // long hold → full entry
    } else {
      tooltipMode = "snippet"; // quick click → snippet
    }
  } else {
    // clicked off plants -> close tooltip
    activePlant = null;
  }

  pressedPlant = null;
}

// ---- D3 data load ----
async function loadPlantData() {
  const data = await d3.csv("plantdata.csv", d3.autoType);
  console.log("raw data:", data);

  // sort by Number ascending (1..10)
  const sorted = data.slice().sort((a, b) => a.Number - b.Number);

  plants = sorted.map((d) => {
    let gp = d["% of Grief"];
    if (typeof gp === "string") {
      gp = parseFloat(gp); // handles "10.00%"
    }
    return {
      ...d,
      griefPercent: gp,
    };
  });

  dataLoaded = true;
}

// ---- color mapping for grief stages ----
function stageToColor(stage) {
  switch (stage?.toLowerCase()) {
    case "denial":
      return color(96, 165, 250); // blue
    case "anger":
      return color(248, 113, 113); // red
    case "bargaining":
      return color(45, 212, 191); // teal
    case "depression":
      return color(129, 140, 248); // indigo
    case "acceptance":
      return color(250, 204, 21); // gold
    default:
      return color(148, 163, 184); // neutral gray
  }
}

// ---- tooltip content + positioning ----
function updateTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (!activePlant) {
    tooltip.style.display = "none";
    return;
  }

  tooltip.style.display = "block";

  const nameEl = tooltip.querySelector(".plant-name");
  const stageEl = tooltip.querySelector(".stage");
  const snippetEl = tooltip.querySelector(".snippet");

  nameEl.textContent = activePlant["Plant Name"];

  stageEl.textContent = `${activePlant["Grief Stage"]} • ${activePlant["% of Grief"]} grief processed`;

  const full = activePlant["Journal Entry"] || "";
  let textContent;

  if (tooltipMode === "full") {
    textContent = full;
  } else {
    // snippet
    textContent =
      full.length > 200 ? full.slice(0, 197).trimEnd() + "..." : full;
  }
  snippetEl.textContent = textContent;

  // position tooltip near plant
  const padding = 14;
  let x = activePlant.screenX + 20;
  let y = activePlant.screenY - 20;

  const rect = tooltip.getBoundingClientRect();
  if (x + rect.width + padding > window.innerWidth) {
    x = activePlant.screenX - rect.width - 20;
  }
  if (y + rect.height + padding > window.innerHeight) {
    y = activePlant.screenY - rect.height - 20;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

// ---- draw watering can cursor ----
function drawWateringCan() {
  if (wateringCanImg) {
    imageMode(CENTER);
    noTint();
    const size = 80; // scale 700x700 down
    image(wateringCanImg, mouseX, mouseY, size, size);
  } else {
    // fallback cursor
    noStroke();
    fill(248, 250, 252);
    ellipse(mouseX, mouseY, 6, 6);
  }
}
