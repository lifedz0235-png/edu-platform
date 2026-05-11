#!/usr/bin/env bash
set -euo pipefail

PROJECT="$HOME/edu-platform"
VIDEOS_DIR="$PROJECT/public/videos"
PDFS_DIR="$PROJECT/public/pdfs"

USB_DOCS="/media/abdelhak/KINGSTON/VIDEOS RESIDANAT/1. COURS ET ATELIER PDF/cours-pdf"
ATELIERS_DIR="$HOME/Téléchargements/ateliers"

TMP_DIR="$PROJECT/.tmp_exact_pdf_build"
REPORT="$PROJECT/exact-pdf-sync-report.txt"

mkdir -p "$TMP_DIR"
: > "$REPORT"

# نحصر الخدمة في:
# - anatomopathologie
# - chirurgie كامل
# - medicale كامل
TARGET_PATHS=(
  "$VIDEOS_DIR/biologie/anatomopathologie"
  "$VIDEOS_DIR/chirurgie"
  "$VIDEOS_DIR/medicale"
)

# امتدادات مسموحة
EXTENSIONS=("pdf" "ppt" "pptx" "doc" "docx")

find_source_file() {
  local base="$1"

  for ext in "${EXTENSIONS[@]}"; do
    local found=""
    found=$(find "$USB_DOCS" "$ATELIERS_DIR" -type f \( -iname "$base.$ext" \) 2>/dev/null | head -n 1 || true)
    if [[ -n "$found" ]]; then
      echo "$found"
      return 0
    fi
  done

  return 1
}

convert_office_to_pdf() {
  local source_file="$1"
  local out_dir="$2"

  mkdir -p "$out_dir"

  libreoffice --headless --convert-to pdf "$source_file" --outdir "$out_dir" >/dev/null 2>&1

  local source_name
  source_name="$(basename "${source_file%.*}")"

  local generated=""
  generated=$(find "$out_dir" -maxdepth 1 -type f -iname "$source_name.pdf" | head -n 1 || true)

  if [[ -z "$generated" ]]; then
    return 1
  fi

  echo "$generated"
  return 0
}

process_video() {
  local video_file="$1"

  local rel
  rel="${video_file#$VIDEOS_DIR/}"          # ex: chirurgie/orl/otite-moyenne-aigue.mp4

  local rel_dir
  rel_dir="$(dirname "$rel")"               # ex: chirurgie/orl

  local base
  base="$(basename "${video_file%.mp4}")"   # ex: otite-moyenne-aigue

  local target_dir="$PDFS_DIR/$rel_dir"
  local target_pdf="$target_dir/$base.pdf"

  mkdir -p "$target_dir"

  # نحذف غير الملف exact-name تاع هذا الفيديو
  rm -f "$target_pdf"

  local source_file=""
  if ! source_file="$(find_source_file "$base")"; then
    echo "MISSING  | $rel -> no exact pdf/ppt/pptx/doc/docx found" >> "$REPORT"
    return 0
  fi

  local ext="${source_file##*.}"
  ext="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"

  if [[ "$ext" == "pdf" ]]; then
    cp "$source_file" "$target_pdf"
    echo "OK PDF   | $rel <- $source_file" >> "$REPORT"
    return 0
  fi

  local build_dir="$TMP_DIR/$rel_dir"
  local generated_pdf=""
  if generated_pdf="$(convert_office_to_pdf "$source_file" "$build_dir")"; then
    cp "$generated_pdf" "$target_pdf"
    echo "OK CONV  | $rel <- $source_file" >> "$REPORT"
    return 0
  fi

  echo "FAILED   | $rel <- conversion failed for $source_file" >> "$REPORT"
}

export PROJECT VIDEOS_DIR PDFS_DIR USB_DOCS ATELIERS_DIR TMP_DIR REPORT

for path in "${TARGET_PATHS[@]}"; do
  if [[ -d "$path" ]]; then
    while IFS= read -r -d '' video; do
      process_video "$video"
    done < <(find "$path" -type f -iname "*.mp4" -print0)
  fi
done

echo "----------------------------------------" >> "$REPORT"
echo "Done. Report: $REPORT"

echo "Report generated: $REPORT"
