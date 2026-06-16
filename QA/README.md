# EduVerse AI — API Test Suite (Postman + Newman)

Automated functional API tests for the EduVerse AI backend, covering authentication,
teacher course management, and student enrollment. **18 requests, 55 assertions**,
including positive (200/201) and negative (400/401/403/404) cases.

## Files
- `EduVerseAI.postman_collection.json` — the test collection
- `EduVerseAI.postman_environment.json` — base URL + test password
- `entrypoint.bat` / `entrypoint.sh` — run the suite with Newman and export an HTML report
- `Jenkinsfile` — Jenkins CI pipeline (mirrors the reference project)
- `github-actions-api-tests.yml` — GitHub Actions alternative (recommended)

## Run it locally

1. Start MongoDB and your backend so the API is live at `http://localhost:5000`.
2. Open Postman → Import → select both JSON files → pick the "EduVerse AI - Local" environment.
3. Click the collection → **Run** (Collection Runner). Folders execute top to bottom; the
   token captured at register/login is reused automatically on protected routes.

## Run it from the command line (for the HTML report / CI)

```bash
npm install -g newman newman-reporter-htmlextra
# Windows:
entrypoint.bat
# macOS / Linux:
bash entrypoint.sh
```
The report is written to `newman-report/report.html` — this is the dashboard to screenshot
for the report chapter.

## How the chaining works
- A collection pre-request script generates a unique teacher + student email each run, so the
  suite is repeatable without "email already exists" failures.
- `Register Teacher` / `Login Teacher` save `teacherToken`; `Register Student` saves
  `studentToken`; `Create Course` saves `courseId`. Later requests reference these variables.

## One thing to verify
The `Protected route without token` test asserts **401**. If your `protect` middleware returns
a different status for a missing token, adjust that single assertion. Everything else is matched
to your actual controllers.

## Coverage
| Folder | Requests | Highlights |
|---|---|---|
| 1 - Auth | 5 | register, login, wrong-password → 400, no-token → 401 |
| 2 - Courses (Teacher) | 4 | create → 201, missing title → 400, list, publish |
| 3 - Enrollments (Student) | 7 | catalog, enroll, duplicate → 400, details, my, unenroll, bad id → 404 |
| 4 - Cleanup | 2 | delete, delete-unowned → 403 |