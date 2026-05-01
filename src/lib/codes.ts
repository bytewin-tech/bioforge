type QrVersion = 1 | 2 | 3 | 4 | 5;

const QR_LEVEL_L = {
  1: { size: 21, dataCodewords: 19, eccCodewords: 7, alignment: [] },
  2: { size: 25, dataCodewords: 34, eccCodewords: 10, alignment: [6, 18] },
  3: { size: 29, dataCodewords: 55, eccCodewords: 15, alignment: [6, 22] },
  4: { size: 33, dataCodewords: 80, eccCodewords: 20, alignment: [6, 26] },
  5: { size: 37, dataCodewords: 108, eccCodewords: 26, alignment: [6, 30] },
} satisfies Record<QrVersion, {
  size: number;
  dataCodewords: number;
  eccCodewords: number;
  alignment: number[];
}>;

const BYTE_MODE = [0, 1, 0, 0];
const PAD_CODEWORDS = [0xec, 0x11];

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

function utf8Bytes(value: string) {
  return Array.from(new TextEncoder().encode(value));
}

function chooseVersion(byteLength: number): QrVersion {
  for (const version of [1, 2, 3, 4, 5] as QrVersion[]) {
    const { dataCodewords } = QR_LEVEL_L[version];
    const characterCountBits = 8;
    const availableBits = dataCodewords * 8;
    const requiredBits = 4 + characterCountBits + byteLength * 8;

    if (requiredBits <= availableBits) {
      return version;
    }
  }

  throw new Error("QR content is too long. Keep it under 106 bytes for this offline generator.");
}

function toCodewords(bytes: number[], dataCodewords: number, version: QrVersion) {
  const bits: number[] = [...BYTE_MODE];
  const lengthBits = version < 10 ? 8 : 16;

  for (let i = lengthBits - 1; i >= 0; i -= 1) {
    bits.push((bytes.length >>> i) & 1);
  }

  for (const byte of bytes) {
    for (let i = 7; i >= 0; i -= 1) {
      bits.push((byte >>> i) & 1);
    }
  }

  const capacityBits = dataCodewords * 8;
  const terminatorLength = Math.min(4, capacityBits - bits.length);
  bits.push(...Array.from({ length: terminatorLength }, () => 0));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(Number.parseInt(bits.slice(i, i + 8).join(""), 2));
  }

  let padIndex = 0;
  while (codewords.length < dataCodewords) {
    codewords.push(PAD_CODEWORDS[padIndex % PAD_CODEWORDS.length]);
    padIndex += 1;
  }

  return codewords;
}

function makeGaloisTables() {
  const exp = new Array<number>(512).fill(0);
  const log = new Array<number>(256).fill(0);
  let value = 1;

  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }

  for (let i = 255; i < 512; i += 1) {
    exp[i] = exp[i - 255];
  }

  return { exp, log };
}

const GF = makeGaloisTables();

function gfMultiply(left: number, right: number) {
  if (left === 0 || right === 0) return 0;
  return GF.exp[GF.log[left] + GF.log[right]];
}

function generatorPolynomial(degree: number) {
  let polynomial = [1];

  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(polynomial.length + 1).fill(0);
    for (let j = 0; j < polynomial.length; j += 1) {
      next[j] ^= polynomial[j];
      next[j + 1] ^= gfMultiply(polynomial[j], GF.exp[i]);
    }
    polynomial = next;
  }

  return polynomial;
}

function reedSolomon(data: number[], eccCodewords: number) {
  const generator = generatorPolynomial(eccCodewords);
  const remainder = new Array<number>(eccCodewords).fill(0);

  for (const byte of data) {
    const factor = byte ^ remainder.shift()!;
    remainder.push(0);
    for (let i = 0; i < eccCodewords; i += 1) {
      remainder[i] ^= gfMultiply(generator[i + 1], factor);
    }
  }

  return remainder;
}

function makeMatrix(size: number) {
  return {
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
  };
}

function setModule(
  modules: boolean[][],
  reserved: boolean[][],
  row: number,
  col: number,
  value: boolean,
  lock = true,
) {
  if (row < 0 || col < 0 || row >= modules.length || col >= modules.length) return;
  modules[row][col] = value;
  if (lock) reserved[row][col] = true;
}

function drawFinder(modules: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const outer = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      const dark = outer && (r === 0 || r === 6 || c === 0 || c === 6 || inner);
      setModule(modules, reserved, row + r, col + c, dark);
    }
  }
}

function drawAlignment(modules: boolean[][], reserved: boolean[][], centerRow: number, centerCol: number) {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      setModule(modules, reserved, centerRow + r, centerCol + c, dark);
    }
  }
}

function drawFunctionPatterns(version: QrVersion) {
  const { size, alignment } = QR_LEVEL_L[version];
  const { modules, reserved } = makeMatrix(size);

  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, 0, size - 7);
  drawFinder(modules, reserved, size - 7, 0);

  for (let i = 8; i < size - 8; i += 1) {
    setModule(modules, reserved, 6, i, i % 2 === 0);
    setModule(modules, reserved, i, 6, i % 2 === 0);
  }

  for (const row of alignment) {
    for (const col of alignment) {
      const nearFinder =
        (row === 6 && col === 6) ||
        (row === 6 && col === size - 7) ||
        (row === size - 7 && col === 6);
      if (!nearFinder) drawAlignment(modules, reserved, row, col);
    }
  }

  setModule(modules, reserved, size - 8, 8, true);

  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      setModule(modules, reserved, 8, i, false);
      setModule(modules, reserved, i, 8, false);
    }
  }

  for (let i = 0; i < 8; i += 1) {
    setModule(modules, reserved, 8, size - 1 - i, false);
    setModule(modules, reserved, size - 1 - i, 8, false);
  }

  return { modules, reserved };
}

function shouldMask(row: number, col: number) {
  return (row + col) % 2 === 0;
}

function formatBitsLevelLMask0() {
  const errorCorrectionLevelLow = 1;
  const mask = 0;
  const data = (errorCorrectionLevelLow << 3) | mask;
  let remainder = data;

  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }

  const bits = ((data << 10) | remainder) ^ 0x5412;
  return Array.from({ length: 15 }, (_, index) => ((bits >>> index) & 1) === 1);
}

function placeData(modules: boolean[][], reserved: boolean[][], codewords: number[]) {
  const bits = codewords.flatMap((byte) =>
    Array.from({ length: 8 }, (_, index) => ((byte >>> (7 - index)) & 1) === 1),
  );
  const size = modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;

    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;

      for (let offset = 0; offset < 2; offset += 1) {
        const currentCol = col - offset;
        if (reserved[row][currentCol]) continue;

        const value = bitIndex < bits.length ? bits[bitIndex] : false;
        modules[row][currentCol] = value !== shouldMask(row, currentCol);
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function drawFormatBits(modules: boolean[][]) {
  const size = modules.length;
  const bits = formatBitsLevelLMask0();
  const first = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  const second = [
    [size - 1, 8],
    [size - 2, 8],
    [size - 3, 8],
    [size - 4, 8],
    [size - 5, 8],
    [size - 6, 8],
    [size - 7, 8],
    [8, size - 8],
    [8, size - 7],
    [8, size - 6],
    [8, size - 5],
    [8, size - 4],
    [8, size - 3],
    [8, size - 2],
    [8, size - 1],
  ];

  first.forEach(([row, col], index) => {
    modules[row][col] = bits[index];
  });
  second.forEach(([row, col], index) => {
    modules[row][col] = bits[index];
  });
}

export function createQrMatrix(value: string) {
  const bytes = utf8Bytes(value);
  const version = chooseVersion(bytes.length);
  const { size, dataCodewords, eccCodewords } = QR_LEVEL_L[version];
  const data = toCodewords(bytes, dataCodewords, version);
  const ecc = reedSolomon(data, eccCodewords);
  const { modules, reserved } = drawFunctionPatterns(version);

  placeData(modules, reserved, [...data, ...ecc]);
  drawFormatBits(modules);

  return { modules, size };
}

export function qrSvg(value: string, foreground = "#101828", background = "#ffffff") {
  const { modules, size } = createQrMatrix(value);
  const quietZone = 4;
  const totalSize = size + quietZone * 2;
  const cells = modules
    .flatMap((row, rowIndex) =>
      row.map((dark, colIndex) =>
        dark
          ? `<rect x="${colIndex + quietZone}" y="${rowIndex + quietZone}" width="1" height="1"/>`
          : "",
      ),
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" role="img" aria-label="Generated QR code"><rect width="${totalSize}" height="${totalSize}" fill="${background}"/><g fill="${foreground}">${cells}</g></svg>`;
}

export function normalizeBarcodeValue(value: string) {
  return value.toUpperCase().replace(/[^0-9A-Z ./$+%-]/g, "").slice(0, 48);
}

export function barcodeSvg(value: string, foreground = "#101828", background = "#ffffff") {
  const normalized = normalizeBarcodeValue(value);
  if (!normalized) {
    throw new Error("Barcode supports A-Z, 0-9, space, and - . / $ + %.");
  }

  const encoded = `*${normalized}*`;
  const narrow = 2;
  const wide = 5;
  const height = 96;
  const margin = 18;
  let cursor = margin;
  const bars: string[] = [];

  for (const char of encoded) {
    const pattern = CODE39[char];
    [...pattern].forEach((widthCode, index) => {
      const width = widthCode === "w" ? wide : narrow;
      if (index % 2 === 0) {
        bars.push(`<rect x="${cursor}" y="${margin}" width="${width}" height="${height}"/>`);
      }
      cursor += width;
    });
    cursor += narrow;
  }

  const width = cursor + margin - narrow;
  const label = normalized.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + margin * 3}" role="img" aria-label="Generated barcode"><rect width="${width}" height="${height + margin * 3}" rx="10" fill="${background}"/><g fill="${foreground}">${bars.join("")}</g><text x="${width / 2}" y="${height + margin * 2.35}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" letter-spacing="2" fill="${foreground}">${label}</text></svg>`;
}
