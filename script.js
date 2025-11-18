console.log("✅ script.js loaded (static path version)");

let plants = [];
let dataLoaded = false;
let hoveredPlant = null;

function setup() {
  const container = document.getElementById("canvas-container");
  const canvas = createCanvas(container.clientWidth, container.clientHeight);
  canvas.parent("canvas-container");
  textFont("system-ui, -apple-system, BlinkMacSystemFont, sans-serif");
  textAlign(CENTER, CENTER);
  noStroke();

  loadPlantData();
}

function windowResized() {
  const container = document.getElementById("canvas-container");
  resizeCanvas(container.clientWidth, container.clientHeight);
}

function draw() {
  background(9, 9, 18);

  // soft gradient-ish vignette
  noStroke();
  for (let r = max(width, height); r > 0; r -= 50) {
    let alpha = map(r, 0, max(width, height), 220, 0);
    fill(15, 23, 42, alpha);
    ellipse(width / 2, height / 2, r, r);
  }

  // title + subtitle
  fill(226, 232, 240);
  textSize(20);
  text("The Garden That Remembers", width / 2, 40);

  textSize(12);
  fill(148, 163, 184);
  text("Follow the path of plants to walk through ten days of grief and care.", width / 2, 64);

  if (!dataLoaded) {
    textSize(14);
    fill(148, 163, 184);
    text("Loading plants...", width / 2, height / 2);
    return;
  }

  hoveredPlant = null;

  // ---- LAYOUT: static path connected by lines ----
  // Place plants along a gentle wavy horizontal path
  const marginX = 100;
  const xStart = marginX;
  const xEnd = width - marginX;
  const baseY = height * 0.55;
  const waveAmp = 60; // how wiggly the vine is

  // Precompute positions for each plant, in Number order
  const n = plants.length;
  plants.forEach((p, idx) => {
    const t = n === 1 ? 0.5 : (p.Number - 1) / (n - 1); // 0..1 along path
    const x = lerp(xStart, xEnd, t);
    const y = baseY + sin(t * TWO_PI) * waveAmp;

    p.screenX = x;
    p.screenY = y;
  });

  // ---- Draw connecting "vine" line first ----
  stroke(56, 189, 248, 140); // soft cyan line
  strokeWeight(3);
  noFill();
  beginShape();
  plants.forEach((p) => {
    curveVertex(p.screenX, p.screenY);
  });
  endShape();

  // ---- Draw plants on top ----
  plants.forEach((p) => {
    const x = p.screenX;
    const y = p.screenY;

    // size from % of Grief (0–70)
    const size = map(p.griefPercent, 0, 70, 18, 40);

    const c = stageToColor(p["Grief Stage"]);

    // glow
    drawingContext.shadowBlur = 18;
    drawingContext.shadowColor = color(red(c), green(c), blue(c), 130);

    // main bloom
    fill(red(c), green(c), blue(c), 215);
    noStroke();
    ellipse(x, y, size, size);

    // inner core
    drawingContext.shadowBlur = 0;
    fill(15, 23, 42, 180);
    ellipse(x, y, size * 0.55, size * 0.55);

    // label
    textSize(11);
    fill(226, 232, 240, 230);
    text(p["Plant Name"], x, y + size * 0.9);

    // hover detection
    const d = dist(mouseX, mouseY, x, y);
    if (d < size / 2 + 6) {
      hoveredPlant = p;
    }
  });

  // highlight ring on hovered plant
  if (hoveredPlant) {
    const x = hoveredPlant.screenX;
    const y = hoveredPlant.screenY;
    const size = map(hoveredPlant.griefPercent, 0, 70, 18, 40);

    noFill();
    stroke(248, 250, 252, 230);
    strokeWeight(2);
    ellipse(x, y, size + 12, size + 12);
    noStroke();
  }

  updateTooltip();
}

// ---- D3 data load ----
async function loadPlantData() {
  const data = await d3.csv("plantdata.csv", d3.autoType);
  console.log("raw data:", data);

  // ensure sorted by Number ascending
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

// ---- map grief stage -> color ----
function stageToColor(stage) {
  switch (stage?.toLowerCase()) {
    case "denial":
      return color(96, 165, 250); // cool blue
    case "anger":
      return color(248, 113, 113); // soft red
    case "bargaining":
      return color(45, 212, 191); // teal
    case "depression":
      return color(129, 140, 248); // indigo
    case "acceptance":
      return color(250, 204, 21); // warm gold
    default:
      return color(148, 163, 184); // neutral gray
  }
}

// ---- tooltip DOM logic ----
function updateTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (!hoveredPlant) {
    tooltip.style.display = "none";
    return;
  }

  tooltip.style.display = "block";

  const nameEl = tooltip.querySelector(".plant-name");
  const stageEl = tooltip.querySelector(".stage");
  const snippetEl = tooltip.querySelector(".snippet");

  nameEl.textContent = hoveredPlant["Plant Name"];

  stageEl.textContent = `${hoveredPlant["Grief Stage"]} • ${hoveredPlant["% of Grief"]} grief processed`;

  const full = hoveredPlant["Journal Entry"] || "";
  const short =
    full.length > 200 ? full.slice(0, 197).trimEnd() + "..." : full;
  snippetEl.textContent = short;

  const padding = 14;
  let x = mouseX + 18;
  let y = mouseY + 18;

  const rect = tooltip.getBoundingClientRect();
  if (x + rect.width + padding > window.innerWidth) {
    x = mouseX - rect.width - 18;
  }
  if (y + rect.height + padding > window.innerHeight) {
    y = mouseY - rect.height - 18;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}
