export type Render2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const DISPLAY_FONT =
  "'Outfit', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/** Adds a rounded rectangle to the current path. */
export function addRoundRect(
  ctx: Render2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function drawImageCover(
  ctx: Render2D,
  image: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const width = 'width' in image ? Number(image.width) : 0;
  const height = 'height' in image ? Number(image.height) : 0;
  if (!width || !height) {
    return;
  }
  const scale = Math.max(dw / width, dh / height);
  const sourceWidth = dw / scale;
  const sourceHeight = dh / scale;
  ctx.drawImage(
    image,
    (width - sourceWidth) / 2,
    (height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    dx,
    dy,
    dw,
    dh,
  );
}

export function setLetterSpacing(ctx: Render2D, value: string): void {
  if (typeof ctx.letterSpacing === 'string') {
    ctx.letterSpacing = value;
  }
}

export function ellipsize(ctx: Render2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  const characters = Array.from(text);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${characters.slice(0, middle).join('')}…`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return `${characters.slice(0, Math.max(1, low)).join('')}…`;
}

export function wrapText(
  ctx: Render2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) {
    return [];
  }

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) {
        break;
      }
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const consumed = lines.join(' ').split(/\s+/).length;
    if (consumed < words.length) {
      lines[maxLines - 1] = ellipsize(
        ctx,
        `${lines[maxLines - 1]} ${words.slice(consumed).join(' ')}`,
        maxWidth,
      );
    }
  }

  return lines.map((line) => ellipsize(ctx, line, maxWidth));
}

export function createConicGradient(
  ctx: Render2D,
  startAngle: number,
  x: number,
  y: number,
  stops: { offset: number; color: string }[],
): CanvasGradient | null {
  if (typeof ctx.createConicGradient !== 'function') {
    return null;
  }
  const gradient = ctx.createConicGradient(startAngle, x, y);
  for (const stop of stops) {
    gradient.addColorStop(stop.offset, stop.color);
  }
  return gradient;
}
