#!/usr/bin/env bash
# ===== EduVerse AI - API test runner (Newman) =====
set -e

COLLECTION="EduVerseAI.postman_collection.json"
ENVIRONMENT="EduVerseAI.postman_environment.json"
REPORT_DIR="newman-report"

mkdir -p "$REPORT_DIR"

echo "===== Running EduVerse AI API tests with Newman ====="

newman run "$COLLECTION" \
  -e "$ENVIRONMENT" \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/report.html"

echo "===== Done. Report available at $REPORT_DIR/report.html ====="