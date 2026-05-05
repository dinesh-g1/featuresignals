#!/bin/bash
# Fix Next.js static export double-dot filename bug
# Server/CDN blocks URLs with ".." (directory traversal protection)
set -e
OUT_DIR="${1:-out}"
[ ! -d "$OUT_DIR" ] && echo "❌ $OUT_DIR not found" && exit 1
echo "🔍 Scanning for double-dot filenames..."

# Detect sed flavor (macOS needs -i '', Linux needs -i)
SED_FLAG=(-i)
if [[ "$(uname)" == "Darwin" ]]; then
  SED_FLAG=(-i '')
fi

FIXED=0
while IFS= read -r -d '' file; do
  dir=$(dirname "$file")
  name=$(basename "$file")
  [[ "$name" != *".."* ]] && continue
  newname="${name//../.}"
  echo "  📄 $name → $newname"
  mv "$file" "$dir/$newname"
  FIXED=$((FIXED + 1))
  find "$OUT_DIR" -type f \( -name "*.html" -o -name "*.js" \) -print0 | while IFS= read -r -d '' f; do
    sed "${SED_FLAG[@]}" "s|${name}|${newname}|g" "$f" 2>/dev/null || true
  done
done < <(find "$OUT_DIR" -type f -name "*..*" -print0)
echo "✅ Fixed $FIXED file(s)"
