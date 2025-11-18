console.log("✅ script.js loaded (zigzag + guide + pastel)");

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
  // light pastel background
  background(248, 250, 245);

  // soft subtle central wash
  noStroke();
  fill(210, 232, 220, 80); // pale green, transparent
  ellipse(width / 2, height / 2, width * 0.9, height * 0.9);

  // title / subtitle
  fill(51, 65, 85); // slate-ish
  textSize(20);
  text("The Garden That Remembers", width / 2, 40);

  textSize(12);
  fill(100, 116, 139);
  text(
    "Follow the plant path. Hover to see them glow; click to hear them remember.",
    width / 2,
    64
  );

  if (!dataLoaded) {
    textSize(14);
    fill(100, 116, 139);
    text("Loading plants...", width / 2, height / 2);
    drawWateringCan();
    return;
  }

  hoveredPlant = null;

  // ---- LAYOUT: vertical zigzag path in Number order ----
  const n = plants.length;

  const topMargin = 120;
  const bottomMargin = 140; // leave space for legend
  const availableHeight = height - topMargin - bottomMargin;
  const stepY = n > 1 ? max(90, availableHeight / (n - 1)) : 0; // at least 90px apart

  const leftX = width * 0.28;
  const rightX = width * 0.72;

  // assign positions in array order (already sorted by Number)
  plants.forEach((p, i) => {
    const y = topMargin + stepY * i;
    const x = i % 2 === 0 ? leftX : rightX; // zigzag: left, right, left...

    p.screenX = x;
    p.screenY = y;
  });

  // ---- VINE: straight lines between plants ----
  stroke(148, 163, 184, 180); // gentle gray-blue
  strokeWeight(2.5);
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

    // size from % of Grief (0–70)
    const size = map(p.griefPercent, 0, 70, 50, 100);
    p.drawSize = size;

    const c = stageToColor(p["Grief Stage"]);

    // glow behind image
    noStroke();
    fill(red(c), green(c), blue(c), 80);
    ellipse(x, y, size * 1.15, size * 1.15);

    // detect hover for tint
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
      // slightly softened at rest
      tint(240, 240, 240, 235);
    }

    if (img) {
      image(img, x, y, size, size);
    } else {
      // fallback: pastel circle if image missing
      noStroke();
      fill(red(c), green(c), blue(c), 220);
      ellipse(x, y, size * 0.6, size * 0.6);
    }
    pop();

    // label
    textSize(11);
    fill(51, 65, 85, 230);
    text(p["Plant Name"], x, y + size * 0.7);
  });

  // hover outline
  if (hoveredPlant) {
    const x = hoveredPlant.screenX;
    const y = hoveredPlant.screenY;
    const s = hoveredPlant.drawSize || 50;

    noFill();
    stroke(148, 163, 184, 230);
    strokeWeight(2);
    ellipse(x, y, s * 1.1, s * 1.1);
    noStroke();
  }

  updateTooltip();
  drawLegend();
  drawWateringCan();
}

// ---- Interaction helpers ----

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

// ---- pastel color mapping for grief stages ----
function stageToColor(stage) {
  switch (stage?.toLowerCase()) {
    case "denial":
      return color(165, 199, 255); // soft sky blue
    case "anger":
      return color(255, 179, 163); // pastel coral
    case "bargaining":
      return color(159, 230, 195); // mint green
    case "depression":
      return color(196, 181, 253); // lavender
    case "acceptance":
      return color(253, 230, 138); // butter yellow
    default:
      return color(209, 213, 219); // neutral gray
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
      full.length > 220 ? full.slice(0, 217).trimEnd() + "..." : full;
  }
  snippetEl.textContent = textContent;

  // position tooltip near plant
  const padding = 14;
  let x = activePlant.screenX + 24;
  let y = activePlant.screenY - 24;

  const rect = tooltip.getBoundingClientRect();
  if (x + rect.width + padding > window.innerWidth) {
    x = activePlant.screenX - rect.width - 24;
  }
  if (y + rect.height + padding > window.innerHeight) {
    y = activePlant.screenY - rect.height - 24;
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
    fill(55, 65, 81);
    ellipse(mouseX, mouseY, 6, 6);
  }
}

// ---- bottom-right guide / legend ----
function drawLegend() {
  const legendWidth = 260;
  const legendHeight = 170;
  const x = width - legendWidth - 24;
  const y = height - legendHeight - 24;

  // card background
  noStroke();
  fill(255, 255, 255, 235);
  rect(x, y, legendWidth, legendHeight, 16);

  // title
  let prevAlignH = textAlignHoriz;
  let prevAlignV = textAlignVert;

  textAlign(LEFT, TOP);
  fill(55, 65, 81);
  textSize(12);
  text("How to read this garden", x + 14, y + 12);

  textSize(11);
  fill(75, 85, 99);

  let lineY = y + 32;

  // color legend
  const stages = ["denial", "anger", "bargaining", "depression", "acceptance"];
  stages.forEach((stage, idx) => {
    const cy = lineY + idx * 16;
    const cx = x + 18;

    const c = stageToColor(stage);
    noStroke();
    fill(c);
    ellipse(cx, cy + 5, 10, 10);

    fill(75, 85, 99);
    text(stage.charAt(0).toUpperCase() + stage.slice(1), cx + 16, cy);
  });

  lineY += stages.length * 16 + 6;

  // size = % of grief processed
  fill(75, 85, 99);
  text("• Larger plants = more grief processed", x + 14, lineY);
  lineY += 16;

  // position & line
  text("• Path from top to bottom = days 1–10", x + 14, lineY);
  lineY += 16;

  text("• Line connecting them = your continuous journey", x + 14, lineY);
  lineY += 18;

  // interaction hint
  text("• Hover = plant brightens", x + 14, lineY);
  lineY += 16;
  text("• Click = journal snippet", x + 14, lineY);
  lineY += 16;
  text("• Hold = full journal entry", x + 14, lineY);

  // restore text alignment
  textAlign(CENTER, CENTER);
}

