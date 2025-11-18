console.log("✅ script.js loaded (zigzag + guide + pastel, fixed spacing)");

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
let plantImages = {};      // keyed by Number
let wateringCanImg = null;

// preload images
function preload() {
  // plant images
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

  noCursor(); // hide default cursor

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

  // title and subtitle
  fill(51, 65, 85); // slate-ish
  textSize(20);
  text("The Garden That Remembers", width / 2, 40);

  textSize(12);
  fill(100, 116, 139);
  text(
    "Follow the plant path. Click to see a snippet of the story, hold to reveal it all",
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

  //vertical zigzag path in Number order ----
  const n = plants.length;

  const topMargin = 120;
  const bottomMargin = 140; // leave space for legend
  const availableHeight = height - topMargin - bottomMargin;

  let stepY = 0;
  if (n > 1) {
    if (availableHeight > 0) {
      // evenly distribute plants from topMargin to height - bottomMargin
      stepY = availableHeight / (n - 1);
    } else {
      // if window is super tiny, fall back to some spacing
      stepY = 90;
    }
  }

  const leftX = width * 0.28;
  const rightX = width * 0.72;

  // assign positions in array order
  plants.forEach((p, i) => {
    const y = topMargin + stepY * i;
    const x = i % 2 === 0 ? leftX : rightX; // zigzag 0 if i is even, 1 if i is odd

    p.screenX = x;
    p.screenY = y;
  });

  //straight lines between plants
  stroke(148, 163, 184, 180); // gray-blue
  strokeWeight(2.5);
  noFill();
  for (let i = 0; i < n - 1; i++) {
    const a = plants[i];
    const b = plants[i + 1];
    line(a.screenX, a.screenY, b.screenX, b.screenY);
  }

  //Draw plants (images) on top
  imageMode(CENTER);
  plants.forEach((p) => {
    const x = p.screenX;
    const y = p.screenY;

    // size from % of Grief
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
    // click or long press on a plant
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

//  D3 data load 
async function loadPlantData() {
  const data = await d3.csv("plantdata.csv", d3.autoType);
  console.log("raw data:", data);

  // sort by Number ascending 
  const sorted = data.slice().sort((a, b) => a.Number - b.Number);

  
  plants = sorted.map((d) => {
    let gp = d["% of Grief"]; //pulls string 
    if (typeof gp === "string") {
      gp = parseFloat(gp); // turns percent into number
    }
    return {
      ...d, //copies original fields
      griefPercent: gp, // clean numeric field
    };
  });

  dataLoaded = true;
}

//  pastel color mapping for grief stages 
function stageToColor(stage) {
  switch (stage?.toLowerCase()) {
    case "denial":
      return color(165, 199, 255); // blue
    case "anger":
      return color(255, 179, 163); //  coral
    case "bargaining":
      return color(159, 230, 195); //  green
    case "depression":
      return color(196, 181, 253); // lavender
    case "acceptance":
      return color(253, 230, 138); // yellow
    default:
      return color(209, 213, 219); // neutral gray
  }
}

//  tooltip content and positioning 
function updateTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (!activePlant) {
    tooltip.style.display = "none";
    return;
  }

  tooltip.style.display = "block";
//grab internal elemenets
  const nameEl = tooltip.querySelector(".plant-name");
  const stageEl = tooltip.querySelector(".stage");
  const snippetEl = tooltip.querySelector(".snippet");

  nameEl.textContent = activePlant["Plant Name"];

  stageEl.textContent = `${activePlant["Grief Stage"]} • ${activePlant["% of Grief"]} grief processed`;

  const full = activePlant["Journal Entry"] || ""; //whole journal entry
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
//if overflow, flip
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

//  draw watering can cursor 
function drawWateringCan() {
  if (wateringCanImg) {
    imageMode(CENTER);
    noTint();
    const size = 80; // scale down
    image(wateringCanImg, mouseX, mouseY, size, size);
  } else {
    // fallback cursor
    noStroke();
    fill(55, 65, 81);
    ellipse(mouseX, mouseY, 6, 6);
  }
}

//  bottom right guide
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

  // position and line
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

  // restore center alignment for main drawing
  textAlign(CENTER, CENTER);
}

