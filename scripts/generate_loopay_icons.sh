#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "GEMINI_API_KEY is required"
  exit 1
fi

MODEL="${GEMINI_MODEL:-gemini-3-pro-image-preview}"
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
mkdir -p icons /tmp/loopay

read -r -d '' PROMPT_MAIN <<'PROMPT' || true
Create a cute app icon for a subscription payment manager named "Loopay".
Concept: "droplet loop" (two soft water droplets forming a circular loop).
Style: lovable, minimal, modern, flat illustration, clean vector-like edges.
Composition: centered symbol only, no text, no letters.
Mood: friendly, calm, trustworthy.
Color palette: mint green, aqua blue, soft white highlights.
Background: subtle rounded-square gradient background.
Lighting: soft, gentle highlights, no heavy shadows.
Requirements: high contrast, legible at small sizes (48px), avoid tiny details.
Output: 1:1 square, 1024x1024 PNG.
PROMPT

read -r -d '' PROMPT_MASK <<'PROMPT' || true
Create a maskable PWA app icon variant of the same "droplet loop" concept.
Keep all important visual elements strictly inside the central safe area (80% circle).
No text, no border-dependent details, no corner-dependent details.
Style and colors should match the main icon.
Background should fully fill the square canvas.
Output: 1:1 square, 1024x1024 PNG, optimized for maskable icons.
PROMPT

make_request() {
  local prompt="$1"
  local out_json="$2"

  PROMPT="$prompt" node -e '
const fs = require("fs");
const prompt = process.env.PROMPT || "";
const body = {
  contents: [{ parts: [{ text: prompt }] }]
};
fs.writeFileSync("/tmp/loopay/request.json", JSON.stringify(body));
'

  curl -sS -X POST "$API_URL?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    --data @/tmp/loopay/request.json \
    > "$out_json"
}

extract_image() {
  local in_json="$1"
  local out_png="$2"
  local tmp_file="/tmp/loopay/extracted-image.bin"

  node -e '
const fs = require("fs");
const obj = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const cands = obj.candidates || [];
let b64 = null;
let mime = null;
for (const c of cands) {
  const parts = c?.content?.parts || [];
  for (const p of parts) {
    if (p?.inlineData?.mimeType?.startsWith("image/") && p?.inlineData?.data) {
      b64 = p.inlineData.data;
      mime = p.inlineData.mimeType;
      break;
    }
  }
  if (b64) break;
}
if (!b64) {
  console.error("No image found in response.");
  process.exit(1);
}
fs.writeFileSync(process.argv[2], Buffer.from(b64, "base64"));
process.stdout.write(String(mime || ""));
' "$in_json" "$tmp_file" > /tmp/loopay/mime.txt

  local mime
  mime="$(cat /tmp/loopay/mime.txt)"
  if [[ "$mime" == "image/png" ]]; then
    cp "$tmp_file" "$out_png"
    return
  fi

  if command -v sips >/dev/null 2>&1; then
    sips -s format png "$tmp_file" --out "$out_png" >/dev/null
    return
  fi

  cp "$tmp_file" "$out_png"
}

make_request "$PROMPT_MAIN" /tmp/loopay/main.json
extract_image /tmp/loopay/main.json icons/icon-1024.png

echo "created: icons/icon-1024.png"

make_request "$PROMPT_MASK" /tmp/loopay/mask.json
extract_image /tmp/loopay/mask.json icons/maskable-1024.png

echo "created: icons/maskable-1024.png"
