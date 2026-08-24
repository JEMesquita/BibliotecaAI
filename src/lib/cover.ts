/** Capas geradas localmente (canvas) para livros sem capa no Open Library. */

const CLOTH: Array<[string, string, string]> = [
  ["#2b4a3c", "#131f19", "#edc36b"],
  ["#52302a", "#261411", "#e8b05e"],
  ["#25384f", "#101823", "#d9b36a"],
  ["#54401e", "#261d0d", "#f0ce87"],
  ["#41304b", "#1d1522", "#e3be8e"],
  ["#204141", "#0e1c1c", "#9fd0b0"],
  ["#5a3823", "#28170c", "#f2c98a"],
];

export function hashStr(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : ["—"];
}

export async function makeCover(title: string, author: string): Promise<string> {
  try {
    await Promise.all([
      document.fonts.load('700 34px "Fraunces"'),
      document.fonts.load('600 15px "Space Grotesk"'),
    ]);
  } catch {
    /* segue com fallback do canvas */
  }

  const W = 360;
  const H = 540;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const [top, bottom, accent] = CLOTH[hashStr(title || "?") % CLOTH.length];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // sombra da lombada
  const spine = ctx.createLinearGradient(0, 0, 44, 0);
  spine.addColorStop(0, "rgba(0,0,0,0.38)");
  spine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spine;
  ctx.fillRect(0, 0, 44, H);

  // vinheta
  const v = ctx.createRadialGradient(W / 2, H / 2, H / 5, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // moldura dupla
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";

  // selo do topo
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.font = '500 11px "Space Grotesk"';
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";
  } catch {
    /* navegadores antigos */
  }
  ctx.fillText("B I B L I O T E C A   P E S S O A L", W / 2, 64);
  ctx.globalAlpha = 1;

  // título
  let size = 36;
  ctx.font = `700 ${size}px "Fraunces", Georgia, serif`;
  let lines = wrapText(ctx, title || "Sem título", W - 104);
  while (lines.length > 4 && size > 20) {
    size -= 2;
    ctx.font = `700 ${size}px "Fraunces", Georgia, serif`;
    lines = wrapText(ctx, title || "Sem título", W - 104);
  }
  ctx.fillStyle = "#f3ead6";
  const lh = size * 1.22;
  const blockH = lines.length * lh;
  let y = H / 2 - blockH / 2 + size * 0.8;
  for (const line of lines) {
    ctx.fillText(line, W / 2 + 8, y);
    y += lh;
  }

  // ornamento
  const oy = H / 2 + blockH / 2 + 26;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 58, oy);
  ctx.lineTo(W / 2 - 12, oy);
  ctx.moveTo(W / 2 + 12, oy);
  ctx.lineTo(W / 2 + 58, oy);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, oy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = accent;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();

  // autor
  ctx.fillStyle = accent;
  ctx.font = '600 15px "Space Grotesk"';
  const authorLines = wrapText(ctx, (author || "Autor desconhecido").toUpperCase(), W - 110);
  let ay = H - 84 - (authorLines.length - 1) * 20;
  for (const line of authorLines) {
    ctx.fillText(line, W / 2 + 8, ay);
    ay += 20;
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}
