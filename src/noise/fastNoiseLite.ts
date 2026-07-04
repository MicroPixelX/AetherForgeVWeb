// Minimal, self-contained noise port (value-noise gradient variant) for worldgen.
// Pure TS, no deps. Public API matches a subset of FastNoiseLite.

export class FastNoiseLite {
  private perm = new Uint8Array(512);
  private freq = 0.01;

  constructor(seed: number = 0) {
    this.setSeed(seed);
  }

  setSeed(seed: number): void {
    let h = seed >>> 0;
    const src = new Uint8Array(256);
    for (let i = 0; i < 256; i++) src[i] = i & 0xff;
    // Fisher-Yates with a deterministic LCG seeded by `seed`.
    const rng = () => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 0x100000000;
    };
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = src[i]; src[i] = src[j]; src[j] = t;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = src[i & 255];
  }

  setFrequency(f: number): void { this.freq = f; }

  // 2D value-gradient noise in [-1, 1].
  noise2D(x: number, y: number): number {
    const xi = Math.floor(x * this.freq);
    const yi = Math.floor(y * this.freq);
    const xf = (x * this.freq) - xi;
    const yf = (y * this.freq) - yi;
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const grad = (hash: number, dx: number, dy: number) => {
      const h = hash & 7;
      const u = h < 4 ? dx : dy;
      const v = h < 4 ? dy : dx;
      return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
    };
    const aa = this.perm[(this.perm[xi & 255] + yi) & 511];
    const ab = this.perm[(this.perm[xi & 255] + yi + 1) & 511];
    const ba = this.perm[(this.perm[(xi + 1) & 255] + yi) & 511];
    const bb = this.perm[(this.perm[(xi + 1) & 255] + yi + 1) & 511];
    const u = fade(xf), v = fade(yf);
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
               lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v) * (1 / 0.46);
  }

  // 3D value-gradient noise. Cheap 2D fallback used for terrain; 3D used for caves later.
  noise3D(x: number, y: number, z: number): number {
    return this.noise2D(x + z * 0.5, y); // anti-pattern fallback; replaced when 3D caves land.
  }

  fractal2D(x: number, y: number, octaves: number, lacunarity = 2.0, gain = 0.5): number {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.noise2D(x * freq, y * freq);
      norm += amp; amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }
}
