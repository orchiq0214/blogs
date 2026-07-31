# Changelog

## v0.6.0

- Kept every previously missed question in the review bank after later correct answers.
- Added pending, high-risk, and mastered review states; mastery requires three consecutive correct answers.
- Prioritized high-risk and pending questions when generating a review session.

## v0.5.0

- Added per-question practice statistics derived from saved session history.
- Prevented local practice history from being overwritten during GitHub state loading.
- Retried GitHub state writes after SHA mismatch conflicts.

## v0.4.0

- Deduplicated repeated chapter, knowledge-point, and reference labels on question cards.

## v0.3.0

- Added chapter-tagged question bank support.
- Added left-click next and right-click previous navigation on the question card background.
- Added optional, session-stable answer option shuffling.

## v0.2.0

- Added study mode.
- Added in-session mode toggle between study and exam modes.
- Added answer-card wrong/correct markers.
- Added PWA manifest, icon, and service worker for Android-friendly use.
- Added default GitHub sync values for owner, repo, branch, question bank path, and state path.
