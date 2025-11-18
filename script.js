console.log("✅ script.js loaded (static path + images + interactions)");

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
    plantImages[i] = loadImage(`plant${i}.png`, 
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

  noCursor(); // hide default mouse; we’ll draw watering can

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

  // ---- LAYOUT: static wavy path in Number order ----
  const marginX = 100;
  const xStart = marginX;
  const xEnd = width - marginX;
  const baseY = height * 0.55;
  const waveAmp = 60;

  const n = plants.length;

  plants.forEach((p) => {
    const t = n === 1 ? 0.5 : (p.Number - 1) / (n - 1); // 0..1 across the path
    const x = lerp(xStart, xEnd, t);
    const y = baseY + sin(t * TWO_PI) * waveAmp;

    p.screenX = x;
    p.screenY = y;
  });

  // ---- Draw connecting vine ----
  stroke(56, 189, 248, 140);
  strokeWeight(3);
  noFill();
  beginShape();
  plants.forEach((p) => {
    curveVertex(p.screenX, p.screenY);
  });
  endShape();

  // ---- Draw plants (images instead of circles) ----
  imageMode(CENTER);
  plants.forEach((p) => {
    const x = p.screenX;
    const y = p.screenY;

    // size based on % of Grief
    const size = map(p.griefPercent, 0, 70, 40, 90); // pixel width/height
    p.drawSize = size; // store for hit testing

    // base glow
    const c = stageToColor(p["Grief Stage"]);
    noStroke();
    fill(red(c), green(c), blue(c), 60);
    ellipse(x, y, size * 1.2, size * 1.2);

    // plant image
    const img = plantImages[p.Number];
    push();
    if (p === hoveredPlant) {
      // increase saturation/brightness on hover via stronger tint
      tint(255, 255, 255, 255);
    } else {
      // slightly muted when not hovered
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

  // determine hovered plant (do this after positions/sizes are set)
  hoveredPlant = getPlantUnderMouse();

  // subtle outline on hovered
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
      tooltipMode = "full";
    } else {
      tooltipMode = "snippet";
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

  // sort by Number ascending
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
      return color(148, 163, 184); // neutral
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
    // snippet mode
    textContent =
      full.length > 200 ? full.slice(0, 197).trimEnd() + "..." : full;
  }
  snippetEl.textContent = textContent;

  // position tooltip near plant (not mouse)
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
    push();
    // slightly transparent, in case
    tint(255, 255, 255, 240);
    const size = 40;
    image(wateringCanImg, mouseX, mouseY, size, size);
    pop();
  } else {
    // fallback cursor
    noStroke();
    fill(248, 250, 252);
    ellipse(mouseX, mouseY, 8, 8);
  }
}

