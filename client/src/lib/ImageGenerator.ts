/**
 * A simple seeded Pseudo-Random Number Generator (PRNG) using mulberry32.
 * This ensures that the same seed will always produce the same sequence of numbers.
 * @param seed - The initial numeric seed.
 * @returns A function that, when called, returns the next pseudo-random number between 0 and 1.
 */
const mulberry32 = (seed: number): (() => number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Converts a string into a 32-bit integer hash.
 * @param str - The input string to hash.
 * @returns A 32-bit integer hash.
 */
const stringToHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

const createCanvas = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

export function generateThumbnail(
  seed: string,
): string {
  const size = 512;

  const random = mulberry32(stringToHash(seed));
  const getRandom = (min: number, max: number) => random() * (max - min) + min;
  const pickRandom = <T>(arr: Array<T>): T => arr[Math.floor(random() * arr.length)];

  const canvas:HTMLCanvasElement = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D rendering context from canvas.");
  }
  const center = size / 2;

  const hue = getRandom(0, 360);
  const sat = getRandom(30, 60);
  const light = getRandom(85, 95);
  const color1 = `hsl(${hue}, ${sat}%, ${light}%)`;
  const color2 = `hsl(${(hue + 40) % 360}, ${sat}%, ${light - 10}%)`;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

    ctx.translate(center, center);

    const numPoints = Math.floor(getRandom(200, 700)); // Density of the pattern
    const scale = getRandom(size * 0.03, size * 0.06); // Controls how spread out the pattern is
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    const mainColorLightness = getRandom(20, 50);
    const mainColorSaturation = getRandom(15, 40);
    const complementaryHue = (hue + 180) % 360;

    const shapeType = pickRandom(['circle', 'dot', 'line']);
    for (let i = 0; i < numPoints; i++) {
        const radius = scale * Math.sqrt(i);
        const angle = i * goldenAngle;

        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        // Stop if we go beyond the canvas boundaries to avoid edge clutter
        if (radius > size / 2 * 0.9) break;

        const alpha = getRandom(0.2, 0.8);
        const color = `hsla(${complementaryHue}, ${mainColorSaturation}%, ${mainColorLightness}%, ${alpha})`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        ctx.beginPath();

        switch(shapeType) {
            case 'circle': {
                const circleRadius = getRandom(size * 0.02, size * 0.04) * (1 - radius / (size / 2));
                ctx.lineWidth = getRandom(4, 10);
                ctx.arc(x, y, Math.max(1, circleRadius), 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case 'dot': {
                const dotRadius = getRandom(size * 0.02, size * 0.04) * (1 - radius / (size / 2));
                ctx.arc(x, y, Math.max(1, dotRadius), 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'line': {
                const lineLength = getRandom(size * 0.1, size * 0.09);
                ctx.lineWidth = getRandom(2, 4);
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle); // Point lines outwards from the center
                ctx.moveTo(0, -lineLength / 2);
                ctx.lineTo(0, lineLength / 2);
                ctx.stroke();
                ctx.restore();
                break;
            }
        }
    }

  return canvas.toDataURL("image/png");
}
