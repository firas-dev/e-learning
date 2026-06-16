@echo off
REM ===== EduVerse AI - API test runner (Newman) =====
SET COLLECTION=EduVerseAI.postman_collection.json
SET ENVIRONMENT=EduVerseAI.postman_environment.json
SET REPORT_DIR=newman-report

IF NOT EXIST %REPORT_DIR% (
    mkdir %REPORT_DIR%
)

echo ===== Running EduVerse AI API tests with Newman =====

newman run "%COLLECTION%" -e "%ENVIRONMENT%" -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\report.html"

echo ===== Done. Report available at %REPORT_DIR%\report.html =====