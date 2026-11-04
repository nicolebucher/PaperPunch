# PaperPunch – Version history

Newest version on top. Every release of the website or the Android app gets an entry.
The same history is kept as a shared doc: https://claude.ai/artifact/DRfk8rsKfQGa1KSYcjWtTH
How everything is set up (tools, accounts, domains, email): https://claude.ai/artifact/Dmnea4bUSyD7E4CuVhW2Wu

- **v0.x** = beta phase before the Play Store launch. New features bump the second digit (v0.3), pure bug fixes the third (v0.2.1).
- **v1.0** = first public release in the Play Store.

## v0.8.0 – 4 November 2026

Fixes from tester feedback (English-speaking tester): tap targets, language of the reward card, boss round, fill-in answers.

| Area | Change |
| --- | --- |
| App | “I don't know – show answer” is no longer a full-width button right under the answers (it looked like another answer and was tapped by mistake): smaller, centred, with more space above; after giving up the box says “The answer is: …” instead of “Almost!” |
| App + Website · AI | Duplicate answer options (e.g. “3/4” twice) are removed – in new materials on the server and in already saved games in the app; before, two identical buttons lit up |
| App | The “Punches earned” card and its lines (correct answers, boss level, daily bonus, “Continue”) now use the app language; before they were always German |
| App + Website · AI | New boss round: the AI now writes 6 new, harder questions (multi-step, transfer, combining sub-topics) instead of repeating questions from the levels; older games keep the old boss round |
| App + Website | Fill-in-the-gap answers: words that are already in the sentence don't have to be typed (“… is called a ___ fraction”: “proper” counts as well as “proper fraction”); the AI check knows this too and no longer gives away the answer in its hint |

## v0.7.0 – 3 November 2026

Website /app: Punches & levels like in the app, app logo; the joker's price is clearly marked.

| Area | Change |
| --- | --- |
| Website | Punches on the web: correct answers in learning games (10/15/20 by difficulty) and when solving worksheets online (10 per correct task, counted once when checking) earn Punches, saved in this browser |
| Website | Level ring with Punches top right (phone header and desktop), same ten ranks as the app (Rookie … Unstoppable); tap shows the rank and how many Punches until the next one |
| Website | App logo in /app: the open book with colourful pixels instead of the pixel grid; the book takes the text colour (white on dark, black on light) |
| Website | Learning game: dashed path between the levels |
| Website | 50:50 joker in learning games (not in challenges, to keep them fair): costs 30 Punches, two wrong answers disappear |
| App + Website | Joker shows its price clearly: “Joker 50:50” with a pink “−30 Punches” chip and the line “Two wrong answers disappear”; with too few Punches it is greyed out and says “You need 30 Punches”; after using it: “Joker used · −30 Punches” |

## v0.6.2 – 3 November 2026

Website /app: creating, results and the learning game look and work like the app.

| Area | Change |
| --- | --- |
| Website | Creating in /app step by step like the app: upload (drag & drop, “Take a photo” opens the camera on phones, “Choose files”, file chips, limits) or type a topic (ideas to tap, optional focus note) → pick a format (worksheet, test, learning game) plus grade and school type (remembered) → “Creating …” screen with progress steps |
| Website | Result screen like in the app: success moment, title, tasks and estimated time, “How do you want to practise?” with solve online, view PDF, download & print, share, and for learning games play and challenge friends |
| Website | Learning game and questions in the app style: levels as large coloured rows with stars, white question card with large answer buttons, progress bar, clearer feedback |
| Website | “Recommend” in the sidebar, the phone menu and on the overview: share menu with a link to PaperPunch, on a computer the link is copied |

## v0.6.1 – 3 November 2026

Home-screen icon opens the app interface.

| Area | Change |
| --- | --- |
| Website | Added to the home screen (iPhone “Add to Home Screen”, Android “Install app”), PaperPunch now opens straight at paper-punch.com/app instead of the home page; already-added icons need to be removed and added again |

## v0.6.0 – 3 November 2026

Website: app-like interface in the browser under /app.

| Area | Change |
| --- | --- |
| Website | New app interface at paper-punch.com/app, designed like the Android app: “What do you want to practise?” with three large ways (upload study material, type a topic, study plan); on a computer with a sidebar (Overview, My materials, Study plans) and the three ways as cards; on a phone with a header and menu |
| Website | “My materials”: everything created in /app is saved in the browser (last 20, no account) and can be reopened – PDF, online practice, learning game; delete per item |
| Website | Study plans in the browser: create a plan (subject, topics, test date, minutes per day, grade), tick off sessions, start today's practice with one tap (topic, focus and format pre-filled); reminders stay in the app |
| Website | Info page stays as it is; its main button now leads to /app; header and footer of the info page are hidden inside /app |

## v0.5.1 – 3 November 2026

Fractions like in school, real logo on the PDF, consistent “show answer”, new home screen with three ways.

| Area | Change |
| --- | --- |
| Website & App | Fractions are shown like in school, numerator above denominator (3/4, 12/18, mixed numbers like 2 1/2) – in worksheet and test PDFs (tasks, options, solutions), in practice and in the learning game |
| Website · AI | Prompts ask for one fraction notation (3/4, 2 1/2; no ½, no LaTeX) and school symbols (× and : or ÷) so the display works reliably |
| Website | Worksheet and test PDFs show the real logo (book with colourful pixels) plus the PaperPunch wordmark at the top instead of text only |
| App | “Show answer” works the same everywhere: a clear button “I don't know – show answer” under every question, from the start; before, it was sometimes only a small link after the first mistake and sometimes a disabled button |
| App | New home screen: “What do you want to practise?” with three large ways – snap study material, type a topic, study plan (shows the running plan with today's session); level and punches top right; “Continue” list below; invite and challenge as small links at the bottom |

## v0.5.0 – 3 November 2026

Bonus round in the learning game.

| Area | Change |
| --- | --- |
| App | Learning game: after a level with fewer than three stars, a bonus round (“2 questions again – grab the next star!”) repeats the questions that weren't right on the first try; right there = ¾ point, so the missing star can still be earned; half punches in the bonus round |

## v0.4.1 – 3 November 2026

Fix: fair stars in the learning game, no more lives.

| Area | Change |
| --- | --- |
| App | Learning game: lives removed – every level is played to the end |
| App · Website | Stars by hit rate instead of number of mistakes: right on the first try = 1 point, on the second try = ½; from 85 % three stars, from 60 % two, otherwise one for finishing (e.g. 6 of 8 = two stars, before it was one) |
| Website | Home page text for the learning game no longer mentions lives |

## v0.4.0 – 3 November 2026

Challenges: play a learning game against friends via a link, without an account.

| Area | Change |
| --- | --- |
| App | Result screen of a learning game: “Challenge friends” – enter a nickname and share a link (WhatsApp etc.); after finishing the game, your share of correct answers is the score to beat |
| Website | New challenge page paper-punch.com/c/CODE: friends enter a nickname, play all levels in the browser, then see who won and can challenge back; link preview “Lena challenges you ⚔️” |
| Website · Tech | New endpoint /api/challenges; challenges (game, nickname, score) are stored in the Vercel Blob store in Frankfurt and deleted after 30 days |
| Website | Privacy policy: new “Challenges” section |
| App | Home screen: “Challenge” button next to “Invite” (boxing-glove icon) opens a sheet to pick one of your learning games or create a new one, enter a nickname and share the link; without games it offers to create one first |

## v0.3.1 – 3 November 2026

Logo visible in light mode, real PDF preview, clearer upload, new level names.

| Area | Change |
| --- | --- |
| App | Light mode: the logo (start screen, welcome, header, building screen, level page) now uses the black book with colourful pixels instead of the white one; “Punch” in the wordmark in a darker turquoise so it stays readable |
| App | Result screen: “Preview” now shows the actual PDF with all pages (scrollable) instead of an excerpt of the tasks |
| App | Camera screen: labels under the buttons (“Upload”, “Photo”) and a line with formats and limits (JPG, PNG or PDF · up to 8 files · max. 4 MB in total); page counter now says “of 8” instead of “of 5”; hint readable in light mode |
| App | New level names in game style: Rookie, Starter, Grinder, Streak Master, Brainiac, Pro, Elite, Mastermind, Legend, Unstoppable |

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
