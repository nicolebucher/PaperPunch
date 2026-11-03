# PaperPunch – Version history

Newest version on top. Every release of the website or the Android app gets an entry.
The same history is kept as a shared doc: https://claude.ai/artifact/DRfk8rsKfQGa1KSYcjWtTH

- **v0.x** = beta phase before the Play Store launch. New features bump the second digit (v0.3), pure bug fixes the third (v0.2.1).
- **v1.0** = first public release in the Play Store.

## v0.2.1 – 3 November 2026

Fix after the internal model comparison (Sonnet 5 vs Haiku 5.5).

| Area | Change |
| --- | --- |
| Website · AI | Worksheets and tests no longer get cut off: the length limit was raised from 4,096 to 12,000 tokens. Before, long sheets were regenerated up to 3 times, which tripled cost and waiting time |
| Website · Tech | Internal model comparison: the AI model can be chosen per request, and real tokens and costs are counted |

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
- [ ] Take paper-punch.com live and switch the invite link to it
- [ ] Website recognises invite codes (?ref=) – basis for the growth engine
- [ ] Explainer cards: concept explanation per question and after weak checkpoints
- [ ] Timed mock exam before test day
- [ ] Waitlist for tutoring (fake door)
- [ ] Try again and resume on the website too
- [ ] Google Analytics with cookie banner
- [ ] Internal test in the Play Store
