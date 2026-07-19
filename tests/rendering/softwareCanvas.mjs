const identity = [1, 0, 0, 1, 0, 0];

function multiply(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function inverse(m) {
  const determinant = m[0] * m[3] - m[1] * m[2];
  return [
    m[3] / determinant,
    -m[1] / determinant,
    -m[2] / determinant,
    m[0] / determinant,
    (m[2] * m[5] - m[3] * m[4]) / determinant,
    (m[1] * m[4] - m[0] * m[5]) / determinant,
  ];
}

function transformPoint(m, x, y) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

function parseColor(value) {
  const hex = value.startsWith("#") ? value.slice(1) : "000000";
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16), 255];
}

export class SoftwareCanvasContext {
  constructor(width, height) {
    this.canvas = { width, height };
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.stack = [];
    this.state = { transform: identity, alpha: 1, fillStyle: "#000000", filter: "none", font: "10px test", textAlign: "start", textBaseline: "alphabetic" };
  }

  get filter() { return this.state.filter; }
  set filter(value) { this.state.filter = value; }
  get globalAlpha() { return this.state.alpha; }
  set globalAlpha(value) { this.state.alpha = value; }
  get fillStyle() { return this.state.fillStyle; }
  set fillStyle(value) { this.state.fillStyle = value; }
  get font() { return this.state.font; }
  set font(value) { this.state.font = value; }
  get textAlign() { return this.state.textAlign; }
  set textAlign(value) { this.state.textAlign = value; }
  get textBaseline() { return this.state.textBaseline; }
  set textBaseline(value) { this.state.textBaseline = value; }

  save() { this.stack.push({ ...this.state, transform: [...this.state.transform] }); }
  restore() { this.state = this.stack.pop(); }
  clearRect(x, y, width, height) {
    for (let py = Math.max(0, y); py < Math.min(this.canvas.height, y + height); py++) {
      this.pixels.fill(0, (py * this.canvas.width + Math.max(0, x)) * 4, (py * this.canvas.width + Math.min(this.canvas.width, x + width)) * 4);
    }
  }
  translate(x, y) { this.state.transform = multiply(this.state.transform, [1, 0, 0, 1, x, y]); }
  rotate(angle) { this.state.transform = multiply(this.state.transform, [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]); }

  blendPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) return;
    const index = (y * this.canvas.width + x) * 4;
    const alpha = (color[3] / 255) * this.state.alpha;
    for (let channel = 0; channel < 3; channel++) this.pixels[index + channel] = Math.round(color[channel] * alpha + this.pixels[index + channel] * (1 - alpha));
    this.pixels[index + 3] = Math.round(255 * alpha + this.pixels[index + 3] * (1 - alpha));
  }

  fillRect(x, y, width, height) {
    const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([px, py]) => transformPoint(this.state.transform, px, py));
    const minX = Math.floor(Math.min(...corners.map((point) => point.x)));
    const maxX = Math.ceil(Math.max(...corners.map((point) => point.x)));
    const minY = Math.floor(Math.min(...corners.map((point) => point.y)));
    const maxY = Math.ceil(Math.max(...corners.map((point) => point.y)));
    const inverted = inverse(this.state.transform);
    const color = parseColor(this.state.fillStyle);
    for (let py = minY; py < maxY; py++) for (let px = minX; px < maxX; px++) {
      const local = transformPoint(inverted, px + 0.5, py + 0.5);
      if (local.x >= x && local.x < x + width && local.y >= y && local.y < y + height) this.blendPixel(px, py, color);
    }
  }

  drawImage(source, _x, _y, width, height) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / width) * source.width));
      const sourceY = Math.min(source.height - 1, Math.floor((y / height) * source.height));
      const index = (sourceY * source.width + sourceX) * 4;
      let color = Array.from(source.data.slice(index, index + 4));
      if (this.state.filter === "grayscale(100%)") {
        const gray = Math.round(color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114);
        color = [gray, gray, gray, color[3]];
      }
      this.blendPixel(x, y, color);
    }
  }

  fillText(text, centerX, centerY) {
    const fontSize = Number.parseFloat(this.state.font.match(/([\d.]+)px/)?.[1] ?? "10");
    const scale = Math.max(1, Math.round(fontSize / 7));
    const width = Math.max(0, text.length * 4 * scale - scale);
    const originX = this.state.textAlign === "center" ? centerX - width / 2 : centerX;
    const originY = this.state.textBaseline === "middle" ? centerY - (5 * scale) / 2 : centerY - 5 * scale;
    for (let characterIndex = 0; characterIndex < text.length; characterIndex++) {
      const code = text.charCodeAt(characterIndex);
      for (let row = 0; row < 5; row++) for (let column = 0; column < 3; column++) {
        // A fixed test-only bitmap font: spaces are blank; other glyphs derive
        // reproducibly from their character code and always retain edge pixels.
        const on = text[characterIndex] !== " " && (column === 0 || column === 2 || ((code >> ((row + column) % 7)) & 1) === 1);
        if (on) this.fillRect(originX + (characterIndex * 4 + column) * scale, originY + row * scale, scale, scale);
      }
    }
  }
}

export function makeSyntheticImage(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    data[index] = (x * 7 + y * 3) % 256;
    data[index + 1] = (x * 2 + y * 11) % 256;
    data[index + 2] = ((x >> 3) % 2 === (y >> 3) % 2) ? 230 : 35;
    data[index + 3] = 255;
  }
  return { width, height, data };
}
