# PaperPunch – Version history

Newest version on top. Every release of the website or the Android app gets an entry.
The same history is kept as a shared doc: https://claude.ai/artifact/DRfk8rsKfQGa1KSYcjWtTH
How everything is set up (tools, accounts, domains, email): https://claude.ai/artifact/Dmnea4bUSyD7E4CuVhW2Wu

- **v0.x** = beta phase before the Play Store launch. New features bump the second digit (v0.3), pure bug fixes the third (v0.2.1).
- **v1.0** = first public release in the Play Store.

## v0.13.0 – 5 November 2026 (Android: version code 11, includes v0.12.0)

Levels last longer, the app asks who is using it, and teachers get a results view for their study groups.

| Area | Change |
| --- | --- |
| App + Website | 15 levels instead of 10, steps grow with each level: Rookie 0 · Starter 300 · Grinder 800 · Streak Master 1,600 · Brainiac 3,000 · Pro 5,000 · Elite 8,000 · Mastermind 12,000 · Champion 18,000 · Legend 26,000 · Titan 36,000 · Mythic 50,000 · Grandmaster 70,000 · Icon 95,000 · Unstoppable 125,000 – level 2 after the first game, the top level after roughly a school year at 5 games a week |
| App + Website | Short note “New: 15 levels instead of 10 … you keep all your Punches” in the Punches section (app level page, website Punches popover) for everyone who already has Punches, shown until end of 2026 |
| App + Website | Punches earned stay the same; only the thresholds changed, so existing testers may show a lower level |
| Website | Landing page feature list: “Punches and 15 levels” |
| App | Onboarding asks “Who's using PaperPunch?” – Student / Parent / Teacher (new step after the language, 7 steps); school and grade questions adapt (“What kind of school does your child go to?”, “Which grade do you teach most?”); the role can be changed in Settings; existing profiles count as students |
| App | Teachers see “Study group for your class” as the third button on the home screen instead of “Create study plan” |
| Website + App | Teacher results view for study groups: whoever creates a group gets a private results link (paper-punch.com/g/CODE/auswertung#k=…, key only after the #, never shared with players) – players, average correct, average time, weakest level, correct rate per level, the hardest questions with % wrong, the correct answer and the most common wrong answers, results per nickname (score, points, time) and CSV download; deliberately no per-child weaknesses |
| Website | Group created: “Your results view” box with the link; groups you created open the results view from “Continue”; the link is also saved in the browser when opened |
| App | Group sheet: “View results” opens the results view in the browser (groups created from v0.13 on) |
| Website · Tech | Players' answers per question are now sent with the group result (level, question, correct, given answer ≤ 60 chars) and stored in the entry; the public leaderboard never returns them; new GET /api/groups/CODE/report (header x-teacher-key, only a SHA-256 hash of the key is stored in the group); older groups and app results without single answers only count in the results |
| App + Website · Tech | Ratings also send the role (student/parent/teacher) so the feedback sheet shows who uses PaperPunch |
| Website | Privacy policy section 11 (study groups): answers per question and the private results link |

## v0.12.0 – 4 November 2026 (Android: shipped with v0.13.0, version code 11)

Testers find out about new app versions inside the app.

| Area | Change |
| --- | --- |
| App | Update notice via Google Play in-app updates: on start (and when returning to the app), if Play has a newer version, a banner “New version available · Later / Update” appears on the home, materials and study plan screens (never during a game or test) |
| App | “Update” downloads in the background while you keep learning (progress in %), then “Update ready · Restart” installs it in seconds; if a background update isn't possible, the Play Store page opens |
| App | “Later” hides the notice for 3 days per version; a newer version is shown right away |
| App · Tech | New dependency @capawesome/capacitor-app-update (run npm install + npx cap sync android); only works for installs from Google Play – sideloaded/USB builds simply show nothing |

## v0.11.0 – 4 November 2026 (Android: version code 10)

Teachers can adjust a learning game before sharing it with their class (feedback from a teacher).

| Area | Change |
| --- | --- |
| Website | “Review & adjust questions” when starting a study group (optional): all questions by level with the correct answer; per question “↻ Replace” and delete (with undo, at least 3 questions per level) |
| Website | Replace a question: tap what should be different (easier, harder, different example, everyday context, as a gap, as multiple choice) and/or write your own request – also corrections like “answer B is wrong, the right one is 3/4”; before/after view with Apply, Again or Discard |
| Website | Replace a whole level: new sub-topic (e.g. “comparing fractions” instead of “recognising fractions”), difficulty (easier/same/harder) and number of questions (6/8/10); all new questions at a glance, then Apply level, Whole level again or Discard |
| Website | Changes go into a copy “… (edited)” saved in the browser, the original stays; “Continue to name & share” goes back to the study group with the edited game preselected |
| App | Home screen: Invite, Challenge and Study group always stay in one line at the bottom (font and spacing shrink slightly on narrow phones) |
| App + Website | “Report a problem” under every answered question (learning game, worksheet/test online, challenge, study group, study plan quiz): question unclear / solution wrong / my answer was right / something else, plus an optional note; reports go to the feedback sheet (kind “report”) with question, expected and given answer and game title |
| App + Website | Answer check: lists count as the same regardless of separators – “Zehntel Hundertstel Tausendstel” = “Zehntel, Hundertstel und Tausendstel” (order still matters) |
| Website · Tech | Game generation: questions whose answer is a list must say exactly what and how many to name, and accept the list with commas and with “und” (tester saw an unclear decimal-places question) |
| App | Matching tasks (“zuordnen”) in worksheets/tests can now be solved: pick the matching value for each line from a list, then Check – one retry, then the solution with wrong lines marked (before, there was only “Show solution”) |
| App + Website | Deleting materials and games: new “⋯” menu with “Delete” on every material (app result screen, website material page); deleting from the list works as before – no confirmation any more, instead “… deleted · Undo” for 5 seconds; running study groups and challenges keep their own copy |
| Website · Tech | Consent rate: anonymous daily counts of how often the cookie banner was shown, accepted or declined (no ID, no cookie, nothing stored in the browser; Upstash keys stat:consent:<day>:shown/granted/denied) – explains why Google Analytics shows fewer visitors than Vercel Web Analytics |
| Website · Tech | New /api/report (IP limit 10 per minute) |
| Website · Tech | New /api/edit-game (one question or one level, Claude via the existing structured-output helper, options shuffled); doesn't count towards the weekly limit, IP limit 15 per minute; GA4 events edit_open, edit_link, edit_question_replaced, edit_level_replaced, edit_question_deleted |

## v0.10.0 – 4 November 2026 (Android: version code 9)

Beta limit of 10 new materials per week, name filter for study groups and challenges, final imprint and privacy policy.

| Area | Change |
| --- | --- |
| App + Website | Name filter: group names and nicknames that everyone with the link can see are checked against a list of swear words, slurs and Nazi terms (German and English, also with tricks like “f.i.c.k”, “fuuuck” or “H1tl3r”); the field shows “Please pick a different name – everyone can see it.” and the button stays off; harmless words like “Marschall”, “Mathe-Ass” or “Nudel” are not blocked |
| Website · Tech | The server applies the same filter as a safety net (also for older app versions): a blocked name is replaced by the neutral default (“Player”, “Someone”, or the game title for the group name) |
| Website | Imprint: operator name and address (Nicole Bucher, Pohrsdorf), contact form, consumer dispute resolution note; draft notice removed |
| Website | Privacy policy: controller name and address, responsible supervisory authority (Saxony), consistent section numbering; draft notice removed |
| App + Website | Beta limit: 10 new materials per week per device (worksheet, test, learning game; resets Monday 00:00 Berlin time); practising, playing, study groups and challenges stay unlimited; a failed creation doesn't count |
| App + Website | One-time “Welcome to the beta 🚀” sheet the first time you open the create screen (pink BETA badge, 10 bars, “Got it”) – never shown again |
| App + Website | Create screen shows “Beta · 7 of 10 left this week” with bars; when the week is used up, the create button is replaced by a note (“new ones arrive on Monday”) and a link to write to us |
| Website | Privacy policy: weekly counter (hashed device key, Upstash in Frankfurt, deleted after 8 days) |
| Website · Tech | New /api/quota; /api/generate checks and counts per device (random ID, stored only as a hash; IP as fallback for older app versions); counter in Upstash Redis via the Vercel Marketplace, limit configurable with QUOTA_PER_WEEK; without Redis nothing is limited |
| App + Website | Several study plans: the third big button on the home screen is now always “Create study plan” (green); every running plan is listed under “Continue” with days left and today's session; every plan also has “Study plan for another subject” at the bottom (tester feedback: English was set up, Latin couldn't be added) |
| Website · Tech | Upstash Redis database “paperpunch-quota” (free plan, Frankfurt) connected to snap-it-new – the weekly limit is active |

## v0.9.0 – 4 November 2026

Study groups: everyone plays the same learning game via a link, with a shared leaderboard – no sign-up.

| Area | Change |
| --- | --- |
| App + Website | “Start a study group”: pick one of your learning games or create a new one, choose an end (no end, tomorrow 6 pm, Friday 6 pm, in 1 week), group name and nickname, then share the link (e.g. in the class chat); anyone can start a group |
| Website | Group page paper-punch.com/g/CODE: “Who gets the most right in …?”, number of players and time left, nickname, play all levels in the browser; afterwards the live leaderboard (“Place 3 of 12 🔥”, % to first place); only the first try per device counts, ties go to the faster player |
| Website | When the group has ended the leaderboard is frozen: crown and “Lena won!”, share result, “Start a new round” with a different learning game |
| App | Study groups under “Continue” on the home screen with your place (“7b – Maths · Place 3 of 12”) and “Ben overtook you”; tapping opens the leaderboard (share again, play now, new round); “Study group” link next to Invite and Challenge; your own score is added automatically once you have played the game |
| Website | Study groups in /app: “Study group” in the sidebar and phone menu, “Start a study group” on every learning-game result, groups under “Continue” on the overview |
| Website · Tech | New endpoints /api/groups (create), /api/groups/CODE (leaderboard), /api/groups/CODE/result (first try per device); stored in the public Vercel Blob store in Frankfurt, one file per entry, deleted after at most 44 days |
| Website | Privacy policy: new “Study groups” section |
| Website | GA4 events for groups (opened, joined, finished, created, shared, new round) – only with consent |
| Website · Tech | Build rule fix: if Vercel's shallow clone doesn't contain the previous commit, the project is built instead of failing |

## v0.8.0 – 4 November 2026

Fixes from tester feedback (English-speaking tester): tap targets, language of the reward card, boss round, fill-in answers.

| Area | Change |
| --- | --- |
| Website | Google Analytics in /app: “Cookie settings”, privacy and imprint links in the sidebar and phone menu (the footer is hidden there); with consent, GA4 events for material created, practice/game started, PDF viewed/downloaded, shared, challenge sent, recommended and rating sent – no content, no names |
| Website | More GA4 events (only with consent, no content or names): home way clicked, files added, create submitted / material created (with generation time) / failed, material deleted, study plan created / failed, session ticked / started, level started / completed (stars, correct of total, replay), joker used, answers checked (correct of total), challenge accepted / finished (won/lost/tie) / challenged back, language switched |
| Website | Rating on the web like in the app: “How was this material?” with 5 stars and an optional comment under each result in /app (once per material); goes to the feedback Sheet and the private store, marked as source “web” |
| Website · Tech | Feedback pipeline live: Google Sheet “PaperPunch – Feedback” connected via Apps Script (RATINGS_WEBHOOK_URL), private Blob store connected via OIDC (BLOB_STORE_ID); challenges and jobs explicitly use the public store; weekly feedback review every Monday morning |
| Website | Privacy policy, section 5 “Feedback and ratings”: which rating data is received (stars, comment, format, title, subject, language, country, school type, grade, score – no photos, no names), stored in a non-public Vercel storage area in Frankfurt and in a Google Sheet (Google Ireland), reviewed weekly, deleted after 24 months at the latest |
| Website · Tech | Ratings (app/web) and the feedback form are now kept permanently: backup in a separate private Vercel Blob store in Frankfurt (paperpunch-feedback-private, not publicly readable) and forwarded to the Google Sheet once it is connected; before, they were lost after about an hour |
| App | “I don't know – show answer” is no longer a full-width button right under the answers (it looked like another answer and was tapped by mistake): smaller, centred, with more space above; after giving up the box says “The answer is: …” instead of “Almost!” |
| App + Website · AI | Duplicate answer options (e.g. “3/4” twice) are removed – in new materials on the server and in already saved games in the app; before, two identical buttons lit up |
| App | The “Punches earned” card and its lines (correct answers, boss level, daily bonus, “Continue”) now use the app language; before they were always German |
| App + Website · AI | New boss round as a mix: up to 3 “Rematch” questions the player missed or only got on the second try in the levels (marked “Rematch – you missed this one earlier”), the rest are new, harder questions written by the AI (multi-step, transfer, combining sub-topics); without mistakes only new questions; remembered across sessions; older games keep the old boss round plus rematch questions |
| App + Website | Fill-in-the-gap answers: words that are already in the sentence don't have to be typed (“… is called a ___ fraction”: “proper” counts as well as “proper fraction”); the AI check knows this too and no longer gives away the answer in its hint |
| App | Game QA: the 50:50 joker always leaves exactly 2 tappable options (also after a wrong first try) and is not offered when there is nothing left to remove; “I don't know” ends a combo; the last question of the bonus round says “See results”; correct answers are recognised even if an older game has slightly different spellings of the same option |
| App | If the answer check is not reachable (offline, limit), a typed answer is no longer counted as wrong: “Couldn't check right now – tap Check again.” |
| App | Boss round: rematch questions are never duplicated; a rematch solved on the first try is removed from the list; “missed” in the result only counts questions that were never solved |
| Website · AI | A single faulty boss question no longer makes game creation fail – invalid ones are dropped (boss round only with at least 4 valid questions) |
| Website | Punches can't be farmed: in learning games only the first run of a level earns Punches (not the Mixed level or replays); a worksheet pays once, also after reloading the page |
| App | Punches balanced: combo multiplier removed (“3 in a row” is still shown, without extra Punches), boss questions ×1.5 instead of ×2 – a full game now gives about 400 instead of 950 Punches; boss map label “New hard questions & rematches · 1.5× punches”; website text “Levels, stars and a boss level” |
| App + Website | New learning streak: days in a row with Punches, shown as a flame with the number next to the Punches on the home screen (app) and in the Punches badge (web); outlined until you have learned today; reward card says “Streak started – learn again tomorrow” or “5 days in a row – keep going!”; level page shows the streak instead of “Level x/10”. Punches are never lost – a break only resets the streak |
| App | Study tips on the loading screen: 20 instead of 5, all evidence-based study techniques (self-testing, spaced repetition, mixing task types, learning from mistakes, sleep, test conditions …); each loading screen starts at a random tip |
| App | Without internet: finished games play fully offline; if a typed answer can't be checked twice in a row, the app's own comparison decides, so nobody gets stuck |
| App | Joker text “Wrong answers disappear, 2 are left”; rematch label “Rematch – this one was tricky earlier” (it also covers questions solved on the second try) |

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
