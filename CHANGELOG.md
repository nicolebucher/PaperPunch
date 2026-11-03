# PaperPunch – Version history

Newest version on top. Every release of the website or the Android app gets an entry.
The same history is kept as a shared doc: https://claude.ai/artifact/DRfk8rsKfQGa1KSYcjWtTH
How everything is set up (tools, accounts, domains, email): https://claude.ai/artifact/Dmnea4bUSyD7E4CuVhW2Wu

- **v0.x** = beta phase before the Play Store launch. New features bump the second digit (v0.3), pure bug fixes the third (v0.2.1).
- **v1.0** = first public release in the Play Store.

## v0.3.1 – 3 November 2026

Fix: logo visible in light mode.

| Area | Change |
| --- | --- |
| App | Light mode: the logo (start screen, welcome, header, building screen, level page) now uses the black book with colourful pixels instead of the white one; “Punch” in the wordmark in a darker turquoise so it stays readable |

## v0.3.0 – 3 November 2026

New look for the home screen, the first-time setup and the result screen.

| Area | Change |
| --- | --- |
| App | Home screen redesigned (“Bento”): greeting by time of day, large “Snap your study material” tile, study-plan tile (days left, today's session), level tile with progress ring, “Continue” card with progress bars; light and dark mode |
| App | Home screen on first start: “Create study plan” and “Level 1” invitations plus topic suggestions to tap (opens the topic entry already filled in) |
| App | First-time setup as single steps: language, country (detected from the phone), school type, grade and light/dark with previews, then “How it works” (photo → format → practise & collect punches); tapping an answer moves on automatically |
| App | Result screen redesigned: success moment with check mark and title, estimated time and punches, “How do you want to practise?” with solve in the app, print and share; footer only “AI can make mistakes.” |
| App | “Reshuffle” removed from the result screen (saves AI calls) |
| App | Result screen: “Preview” button for worksheets and tests opens a full-screen preview to swipe through the pages, with Print and Solve |
| App | First-time setup: “How it works” is the last step, after the questions |

## v0.2.4 – 3 November 2026

Small improvements to the building screen and the recent-activity list.

| Area | Change |
| --- | --- |
| App | Building screen (“Building your learning game …”): content sits in the vertical centre, title and status text no longer bold |
| App | “Continue & recent activity” and “My study materials” show when each material was created (“Today”, “Yesterday”, “25 Oct”) |
| Website & App | Legal: new terms of use (German/English, beta draft); privacy policy extended with legal bases, AI provider and hosting abroad (data processing agreements, EU standard contractual clauses), children and teenagers, retention of feedback; app settings link to terms, privacy policy and imprint |
| App | First-time setup on one screen instead of two: heading “A bit about you” matches the fields (language, country, school type, year, appearance) |
| Website & App | Short note on every result: “Created by AI – it can make mistakes” |
| Website & App · AI | Clear titles: worksheets, tests and games are named after the concrete topic (e.g. “Photosynthesis”, “Simplifying fractions”), no invented names like “Photosynthesis Pro”; the game's subject field is now the school subject |

## v0.2.3 – 3 November 2026

Fix: material creation no longer breaks when the phone locks.

| Area | Change |
| --- | --- |
| Website & App | Material is created as a background job on the server: the app gets a job number right away and checks every few seconds; locking the phone or closing the app no longer cancels it. When the app is reopened, it picks up the finished material (results are held up to 24 h in a Vercel Blob store in Frankfurt, then deleted) |
| Website | Privacy policy: new “Android app” section (no account, data stays on the phone, camera, reminders, background jobs, ratings, no ads/analytics in the app) |

## v0.2.2 – 3 November 2026

Fix: uploading many photos at once.

| Area | Change |
| --- | --- |
| App | Uploading 5–6+ photos from the gallery looked like nothing happened: photos are now prepared with a visible progress indicator (“Preparing photos … 2 of 6”) |
| Website & App | Up to 8 files per material (was 5); photos are shrunk to 1,400 px so 8 pages fit into the 4 MB limit; a clear message when files are left out |

## v0.2.1 – 3 November 2026

Fix after the internal model comparison (Sonnet 5 vs Haiku 5.5).

| Area | Change |
| --- | --- |
| Website · AI | Worksheets and tests no longer get cut off: the length limit was raised from 4,096 to 12,000 tokens. Before, long sheets were regenerated up to 3 times, which tripled cost and waiting time |
| Website · Tech | Internal model comparison: the AI model can be chosen per request, and real tokens and costs are counted |
| Website | paper-punch.com is live (DNS at Strato points to Vercel); the app's invite link now uses paper-punch.com |
| Website & App | Contact address hello@paper-punch.com (forwards to Gmail): in the website footer, About page, feedback page, imprint, privacy policy and in the app settings; “Become a beta tester” now opens an email to it |
| Website | App promo reworded: headline “PaperPunch is now available as an Android app”, text leads with personalised learning materials and learning plans |
| App · Design | New result screen (design A): the finished worksheet/test is shown as a swipeable paper preview (tap opens the PDF) instead of a text card; big “Solve online · N tasks” button, tiles for Print, Share and Reshuffle (new version from the same photos); games show their levels |
| Website & App · AI | Output language always follows the input language: material in English gives English worksheets, tests, games and study plans even when the app is set to German (and vice versa); typed topics follow the language they were typed in; the app language is only the fallback |
| App · Design | PDF badge on the worksheet/test preview in the result screen; tapping it opens the PDF |
| App · Design | Home screen: greeting removed; grey “Create study plan” button with Beta label under the main button; section renamed “Continue & recent activity” (up to 3 items); progress ring for every unfinished material (0/N when not started), check mark when done, days-left tile for study plans |
| Website | Google Analytics 4 (G-MQJJH71D5X) with a consent banner: nothing is loaded before “Accept”; “Cookie settings” in the footer to change it; privacy policy updated; Google signals and ad personalisation off |
| App | New optional text field when creating material: “Anything we should focus on?” (e.g. only chapter 3, more word problems, harder); sent to the AI as the student's note |
| App · Design | Launch screen on every app start: the same logo animation as the first-time onboarding (book draws itself, pixels fly in, wordmark); continues automatically after ~4 s, tap to skip |

## v0.2 – 3 November 2026

Focus: tester feedback, a cleaner home screen and the first growth features.

| Area | Change |
| --- | --- |
| App · Design | New “Focus” home screen: one main button “Snap your study material”, below it at most two items to continue; logo illustration and colourful format chips removed |
| App · Design | Light and dark mode, chosen at first launch and in settings |
| App · Learning | Try again: after the first wrong answer, a hint instead of the solution right away; “Show solution” to give up; half punches on the second try, no life lost in the game |
| App · Learning | Tolerant answer checking: upper/lower case, small typos, articles, numbers (0.75 = 3/4) and synonyms are accepted; in doubt, an AI checks the meaning |
| App · Learning | Resume: started worksheets, tests and games are saved and continue exactly where you left off |
| App · Materials | “My study materials”: the last 20 materials with progress, deletable |
| App · Materials | Uploaded photos/PDFs are saved too: create new practice from them, share or save the photos |
| App · Feedback | Rating per study material: 5 stars plus optional text, once per material |
| App · Growth | “Invite friends” with a personal invite link; 50 punches for the first invite |
| App · Study plan | Reminders on study days and the day before the test; on/off and time in the study plan |
| Website | New About page: what PaperPunch does, how it works, the Android app, data privacy |
| Website | Prominent Android app promo on the home page and an “Android app” link in the header; “Coming soon to Google Play” plus “Become a beta tester” until the Play Store listing is live |
| Website | Learning game accepts typed answers tolerantly (same as the app) |
| Website · Tech | New endpoints for answer checking and ratings; the AI now returns alternative correct answers for every question |

## v0.1 – 2 November 2026

Focus: snap.it becomes PaperPunch; first Android app with study plan and game mechanics.

| Area | Change |
| --- | --- |
| Brand | Renamed from snap.it to PaperPunch; new logo (icon and wordmark), new app icons, accent colour turquoise #1FD6EA |
| Website | Installable as an app on the home screen (PWA) |
| Website | New “How it works” graphics on the home page, one in German and one in English |
| App | First Android app: snap study material (multiple images, PNG/JPG/PDF) and turn it into a worksheet, test or learning game |
| App | German and English; country, school type (incl. “Other”) and grade at first launch |
| App | Animated welcome screen: logo flies in, then “Let’s go!” |
| App · Study plan | Study plan (beta): enter goal and test date, get a plan with sessions per day; multiple plans possible; no grade questions |
| App · Learning | Solve worksheets and tests online, print and share them; sharing for all formats |
| App · Game | Punches with 10 levels; new learning game with level map, lives, combos, boss level, 50:50 joker and vibration |
| App | Podcast labelled “Coming soon” and not selectable |
| App · Tech | Separate Vercel project for the app preview; test APK to send to testers |

## Planned

Items move into the next version when they ship.

- [ ] Ratings into the Google Sheet (add the web app URL)
- [ ] Website recognises invite codes (?ref=) – basis for the growth engine
- [ ] Explainer cards: concept explanation per question and after weak checkpoints
- [ ] Timed mock exam before test day
- [ ] Waitlist for tutoring (fake door)
- [ ] Try again and resume on the website too
- [ ] Google Analytics with cookie banner
- [ ] Internal test in the Play Store
