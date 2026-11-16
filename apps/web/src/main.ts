import init, { version, Document } from "./wasm/roomboard_wasm";

const scene = document.getElementById("scene") as HTMLCanvasElement;
const interaction = document.getElementById("interaction") as HTMLCanvasElement;

function resize(): void {
  for (const c of [scene, interaction]) {
    c.width = c.clientWidth * devicePixelRatio;
    c.height = c.clientHeight * devicePixelRatio;
  }
}
window.addEventListener("resize", resize);
resize();

async function start(): Promise<void> {
  await init();
  const doc = new Document();
  doc.add_page();
  console.info(`RoomBoard core ${version()}, pages: ${doc.page_count()}`);
}

void start();
