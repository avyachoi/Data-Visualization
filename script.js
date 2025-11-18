console.log("✅ script.js loaded");

let plants = [];
let dataLoaded = false;

// for hover state
let hoveredPlant = null;

// p5 setup
function setup() {
  const container = document.getElementById("canvas-container");
  const canvas = createCanvas(container.clientWidth, container.clientHeight);
  canvas.parent("canvas-container");
  textFont("system-ui, -apple-system, BlinkMacSystemFont, sans-serif");
  textAlign(CENTER, CENTER);
  noStroke();

  loadPlantData(); // kick off d3 load
}

function windowResized() {
  const container = document.getElementById("canvas-container");
  resizeCanvas(container.clientWidth, container.clientHeight);
}

function draw() {
  background(9, 9, 18);

  // soft vignette
  noStroke();
  for (let r = width; r > 0; r -= 40) {
    let alpha = map(r, 0, width, 200, 0);
    fill(15, 23, 42, alpha);
    ellipse(width / 2, height / 2, r, r);
  }

  // title
  fill(226, 232, 240);
  textSize(20);
  text("The Garden That Remembers", width / 2, 40);

  textSize(12);
  fill(148, 163, 184);
  text("Hover a plant to reveal a memory", width / 2, 64);

  if (!dataLoaded) {
    textSize(14);
    fill(148, 163, 184);
    text("Loading plants...", width / 2, height / 2);
    return;
  }

  hoveredPlant = null;

  // polar layout around center
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = min(width, height) * 0.27;

  plants.forEach((p, i) => {
    const angle = map(p.Number, 1, plants.length, -HALF_PI, TWO_PI - HALF_PI);
    const orbitRadius = baseRadius + sin(frameCount * 0.01 + i) * 10;

    const x = cx + orbitRadius * cos(angle);
    const y = cy + orbitRadius * sin(angle);

    p.screenX = x;
    p.screenY = y;

    // size from % of Grief
    const size = map(p.griefPercent, 0, 70, 18, 40);

    // glow
    const c = stageToColor(p["Grief Stage"]);
    drawingContext.shadowBlur = 18;
    drawingContext.shadowColor = color(red(c), green(c), blue(c), 120);

    // base circle
    fill(red(c), green(c), blue(c), 200);
    ellipse(x, y, size, size);

    // inner core
    drawingContext.shadowBlur = 0;
    fill(15, 23, 42, 160);
    ellipse(x, y, size * 0.5, size * 0.5);

    // label (only common name)
    noStroke();
    textSize(11);
    fill(226, 232, 240, 220);
    text(p["Plant Name"], x, y + size * 0.9);

    // hover detection
    const d = dist(mouseX, mouseY, x, y);
    if (d < size / 2 + 6) {
      hoveredPlant = p;
    }
  });

  // subtle highlight ring on hovered plant
  if (hoveredPlant) {
    const x = hoveredPlant.screenX;
    const y = hoveredPlant.screenY;
    const size = map(hoveredPlant.griefPercent, 0, 70, 18, 40);

    noFill();
    stroke(248, 250, 252, 220);
    strokeWeight(2);
    ellipse(x, y, size + 10, size + 10);
    noStroke();
  }

  updateTooltip();
}

// d3 data load
async function loadPlantData() {
  const data = await d3.csv("plantdata.csv", d3.autoType);
  console.log("raw data:", data);

  plants = data.map((d) => {
    // parse % of Grief like "10.00%"
    let gp = d["% of Grief"];
    if (typeof gp === "string") {
      gp = parseFloat(gp); // parseFloat handles trailing '%'
    }
    return {
      ...d,
      griefPercent: gp,
    };
  });

  dataLoaded = true;
}

// map grief stage -> color
function stageToColor(stage) {
  // adjust to match your CSV values exactly
  switch (stage?.toLowerCase()) {
    case "denial":
      return color(96, 165, 250); // cool blue
    case "anger":
      return color(248, 113, 113); // red
    case "bargaining":
      return color(45, 212, 191); // teal
    case "depression":
      return color(129, 140, 248); // indigo
    case "acceptance":
      return color(250, 204, 21); // warm gold
    default:
      return color(148, 163, 184); // neutral
  }
}

// tooltip DOM logic
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
    full.length > 180 ? full.slice(0, 177).trimEnd() + "..." : full;
  snippetEl.textContent = short;

  // position near mouse
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



window.onload = function() {
	loadData();
}
