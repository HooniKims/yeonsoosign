import QRCode from "qrcode";

const QR_CANVAS_WIDTH = 1080;
const QR_CANVAS_HEIGHT = 1320;
const QR_SIZE = 620;

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function splitLongWord(context, word, maxWidth) {
  if (context.measureText(word).width <= maxWidth) {
    return [word];
  }

  const chunks = [];
  let buffer = "";

  for (const character of word) {
    const candidate = `${buffer}${character}`;

    if (!buffer || context.measureText(candidate).width <= maxWidth) {
      buffer = candidate;
      continue;
    }

    chunks.push(buffer);
    buffer = character;
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks;
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => splitLongWord(context, word, maxWidth));
  const lines = [];

  if (!words.length) {
    lines.push("\uC81C\uBAA9 \uC5C6\uC74C");
  } else {
    for (const word of words) {
      const currentLine = lines[lines.length - 1] || "";
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (!currentLine || context.measureText(candidate).width <= maxWidth) {
        if (currentLine) {
          lines[lines.length - 1] = candidate;
        } else {
          lines.push(candidate);
        }
        continue;
      }

      if (lines.length === maxLines) {
        lines[lines.length - 1] = `${currentLine.slice(0, Math.max(currentLine.length - 3, 1))}...`;
        break;
      }

      lines.push(word);
    }
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    context.fillText(line, x, y + (lineHeight * index));
  });
}

function sanitizeFileNamePart(value, fallback) {
  const sanitized = String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_");

  return sanitized || fallback;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR \uC774\uBBF8\uC9C0\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
    image.src = source;
  });
}

export function buildShareQrFileName(session) {
  const safeDate = sanitizeFileNamePart(session?.date, "\uB0A0\uC9DC\uBBF8\uC815");
  const safeTitle = sanitizeFileNamePart(session?.title, "\uC5F0\uC218");
  return `${safeDate}_${safeTitle}QR.png`;
}

export async function createShareQrDownloadUrl(session, shareUrl) {
  if (!shareUrl) {
    throw new Error("\uACF5\uC720 \uB9C1\uD06C\uAC00 \uC5C6\uC5B4 QR\uC744 \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }

  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: QR_SIZE,
    color: {
      dark: "#172033",
      light: "#ffffff",
    },
  });
  const qrImage = await loadImage(qrDataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("QR \uCEA4\uBC84\uC2A4\uB97C \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }

  canvas.width = QR_CANVAS_WIDTH;
  canvas.height = QR_CANVAS_HEIGHT;

  const gradient = context.createLinearGradient(0, 0, QR_CANVAS_WIDTH, QR_CANVAS_HEIGHT);
  gradient.addColorStop(0, "#eef3ff");
  gradient.addColorStop(1, "#f8fbff");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawRoundedRect(context, 72, 72, 936, 1176, 42);
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = "rgba(69, 97, 180, 0.12)";
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#6a7591";
  context.font = "700 28px 'Noto Sans KR', sans-serif";
  context.fillText("\uBAA8\uBC14\uC77C \uC11C\uBA85 QR", 120, 148);

  context.fillStyle = "#8a94aa";
  context.font = "700 24px 'Noto Sans KR', sans-serif";
  context.fillText("\uC5F0\uC218\uBA85", 120, 216);

  context.fillStyle = "#172033";
  context.font = "800 58px 'Noto Sans KR', sans-serif";
  drawWrappedText(context, session?.title || "\uC81C\uBAA9 \uC5C6\uC74C", 120, 286, 840, 74, 2);

  context.fillStyle = "#8a94aa";
  context.font = "700 24px 'Noto Sans KR', sans-serif";
  context.fillText("\uB0A0\uC9DC", 120, 406);

  context.fillStyle = "#2b3857";
  context.font = "700 38px 'Noto Sans KR', sans-serif";
  context.fillText(session?.date || "\uB0A0\uC9DC \uBBF8\uC815", 120, 456);

  drawRoundedRect(context, 150, 510, 780, 680, 34);
  context.fillStyle = "#f5f7ff";
  context.fill();
  context.strokeStyle = "rgba(69, 97, 180, 0.08)";
  context.lineWidth = 2;
  context.stroke();

  context.drawImage(qrImage, 230, 540, QR_SIZE, QR_SIZE);

  context.fillStyle = "#5d6882";
  context.font = "600 28px 'Noto Sans KR', sans-serif";
  context.textAlign = "center";
  context.fillText(
    "QR\uC744 \uC2A4\uCE94\uD558\uBA74 \uC11C\uBA85 \uD654\uBA74\uC774 \uBC14\uB85C \uC5F4\uB9BD\uB2C8\uB2E4.",
    QR_CANVAS_WIDTH / 2,
    1230,
  );
  context.textAlign = "left";

  return canvas.toDataURL("image/png");
}
