# The Lab: a walk through Tony Stark's workshop

Date: 2026-11-03
Status: approved by Evan, 2026-11-03

## Why

Evan wants the whole site to feel like stumbling into Tony Stark's lab, instead of scrolling a set of sections. The reference he gave is Shopify Editions Winter '26: a full-screen WebGL canvas behind the page, with objects floating in it, and a frame and section markers on top.

The site is still read by recruiters and engineers hiring for software and AI internships. The October design (`2026-10-14-portfolio-revamp-design.md`) was set by feedback that there was no clear story, that interactions competed for attention, and that the site must work fully on phones. The lab must not undo those. It adds atmosphere and objects to click; it does not hide the content or make anyone work out how to get around.

## Goals

1. A visitor opens a door and sees Evan first, as a hologram portrait among the things that make him who he is.
2. The projects are the suits, lined up as in a hall of armour. The experience, the tools and the contact details each have a place in the lab.
3. Objects in the lab are clickable and each opens a short card.
4. Everything a recruiter needs (who, what he built, how to reach him) is reachable in a few seconds, with or without the 3D.
5. It runs on phones. It is smooth, not "buggy and doesn't load well", which was Evan's complaint about the Hall earlier.

## Non-goals

- Free walking or looking around the room (the hub-room layout was considered and rejected; Evan chose the walk-through).
- Sound or music.
- Changing the content of any project, role or award.
- Giving the project pages (`work/*.html`) and the trading case study the lab look. They keep their current design for now.

## Anti-goals (a failure even if it technically works)

- A visitor stuck at the door, or lost on a page that no longer scrolls normally.
- The scene using so much memory or battery that a phone slows or reloads the tab.
- Content only reachable through the 3D (invisible to keyboard, screen readers, search engines).
- The hologram portrait no longer looking like Evan.
- A costume: decoration that says nothing true about him. Every object ties to something real (see the content map).

## The walk, in Evan's order

Scrolling moves a camera along a fixed path with five stops. The page text stays real HTML, laid over the scene.

### 1. The door, then About

- **Door.** The first screen is the arc reactor, which is the door, with Evan's name and one-line intro. Clicking it, pressing a key or scrolling opens it like a vault door. *Guess:* it also opens by itself after a few seconds once the scene has loaded, as the current gate does, so a visitor who just waits is never stuck.
- **Portrait.** The camera passes through and the first thing in view is Evan, large, as a hologram: his photo (`img/evan.jpg`) cut out from its background and projected, blue-tinted, with scanlines, a faint flicker and a bright edge. The face stays recognisable; the effect is on the rim and the lighting, not on his features.
- **About text.** The statement, the paragraphs and the four proof figures from the current About section sit on a wall screen next to him.
- **Furniture, all clickable** (the "bar at the mansion"):
  - **Gym corner**, a barbell and plates, with a floorball stick against the rack. Cards: Evan is a powerlifter; he captains SUTD's men's floorball team.
  - **Commando beret and hockey stick** on a shelf by the bar, for the Army and school sport.
  - **Coffee machine** with a kopi cup. Card, in his words: he is a coffee addict and enjoys a simple kopi.
  - **Guitar** on a stand. Card, from his words: he plays guitar in his free time and serves in his church's worship team as a guitarist.

### 2. The suits (projects)

- Mark I to VII stand in a row of lit bays. The camera slides along the row; stopping at a suit shows its project name, one-line description, key figure and a link to the project page or case study.
- Kept from the Hall today: the four passes (Blueprint, Wireframe, Shaded, Lit), drag or arrow keys to turn a suit a full 360°, and the suit tabs.
- Projects with no suit stay as the "Other projects" list under the bays.
- *Guess:* the passes apply to the suit being looked at, and the other six stand in a cheap Lit state to save the phone's graphics memory.

### 3. Experience (the trophy shelf)

One shelving unit with labelled tiers kept clearly separate, each item clickable for the full text:

| Tier | Contents (from the current site) |
| --- | --- |
| Roles | Univers (AI Business Consultant intern, Aug 2026 to now), EvanYapFitness (founder, Sept 2024 to Jan 2026), then Earlier: The Social Nugget, Singapore Army |
| Awards | Top 5, Corporate Website Revamp Challenge; 2nd place, Vietnam's Grand Challenge Hackathon (V-Bẫy); Nominated, Best Storytelling and Execution (Dragon Tiles); Best Combat Unit 2023/24 |
| Scholarship | SUTD Technology Entrepreneurship Programme Scholarship, 1 of 6 |
| Certifications | Prompt Design in Vertex AI (Google Cloud, 2024); Certified Personal Trainer (NCSF, 2025) |
| Education | SUTD; VinUniversity course; Victoria Junior College |

*My calls:* roles are plaques, awards are trophies, the scholarship is a medal, certifications are framed certificates, and education is on the diploma shelf. The Army award appears under Awards as well as under the role, because it is both.

### 4. Tools (the workbench)

A long bench. The six groups in the current Toolkit become six physical things on it, each clickable:

| Group | Contents |
| --- | --- |
| Languages | Python, TypeScript, JavaScript, C++, C, SQL, HTML, CSS |
| Frameworks | Next.js, React, Node.js, Tailwind CSS, Three.js, Vercel AI SDK, Zod, REST APIs, OAuth 2.0, Telegram Bot API |
| AI and data | Claude API, Google Gemini, Perplexity Sonar, LLM agents, prompt engineering, data analysis, Excel and Sheets |
| Cloud and tools | Vercel, Git, GitHub, Google Cloud, Gmail, Calendar and Sheets APIs |
| Testing | Hegel, Bombadil, property-based testing |
| Design and modelling | Grasshopper, Rhino 3D, Blender, CAD |

*My call:* one object per group (about 40 tools is too many to model), and clicking opens a hologram panel listing the tools with their logos.

### 5. The office (contact)

The camera goes through a second door into a smaller room with a desk. A screen shows the email address (with the existing copy button), and the Resume, GitHub and LinkedIn links.

## How it behaves

- **Scrolling stays normal.** The browser's own scrolling drives the camera. Nothing hijacks the scroll wheel or touch.
- **Nav links work.** #about, #work and the other anchors, and deep links like `#work-watchpartyyy`, move the camera to the right stop and land on the right content.
- **Every clickable object is a real button** with a text label, reachable by Tab, opened with Enter, closed with Escape, and with focus returned to the object.
- **Cards** hold a few lines. Closing one returns the view to where it was.
- **The existing page is the fallback.** The lab is built on top of today's HTML. With no WebGL, reduced motion, or scripts failing, the visitor gets the current site.
- **No skip control** (Evan's decision). A recruiter in a hurry jumps with the nav, which stays on top of the scene at every stop.

## Visual direction

- **Palette:** keep the site's one arc-blue hue and near-black ramp. Light comes from the arc reactor, the suits' own glow and the holograms. The dark lab is the one lit space; the office is the warm one.
- **Type:** keep Schibsted Grotesk, Azeret Mono and Bodoni Moda as they are.
- **Style of props:** stylised, low-poly and consistent, so a guitar and a barbell look like they were made together with the suits. *Guess:* built in three.js where possible, free-licence models where they are clearly better (each credited in the footer).
- **Bloom** is kept from the current Hall, on desktop only.

## Technical approach (decisions for the builder, with my reasons)

- **One persistent canvas**, fixed behind the page, shared by all stops. The Hall's own canvas is folded into it.
- **three.js 0.170.0**, already in use. No new framework.
- **Camera rail.** Scroll progress through the sections maps to a position along a fixed path (a spline), with an ease so it settles at each stop.
- **The suits.** There are four model files in `models/hall/` (about 2.6 MB together), reused across the seven suits. Loaded lazily, nearest first.
- **Portrait cutout.** The background is removed once, offline, and shipped as a transparent image, so the page doesn't do it on every visit. The hologram effect is a shader on that image.
- **Reactor door as loading screen.** The scene loads while the reactor is on screen.
- **Phones.** Lower resolution, no bloom, fewer lights, simpler materials on the suits not being looked at. Pause rendering when the tab is hidden or the canvas is off screen.

### Targets (mine, to be checked by the spike)

- 60 frames a second on a recent laptop; no lower than about 30 on a mid-range phone.
- The page readable before the 3D finishes loading.
- No layout shift when the scene appears.

I have not measured the current Hall's cost, so these are proposals, not facts.

## Constraints from the project

- `CLAUDE.md`: `npm run check` before anything is called done or committed, and `npm run check:browser` (about 5.5 minutes, 6,429 checks) for behaviour or layout changes. CI treats the browser run as report-only, so it has to be read locally.
- The browser suite checks many things the lab changes (section layout, tap targets, focus order, the gate, the Hall). It will need updating in the same change, not after.
- Commits are small, and carry no co-author or third-party credit lines.
- The suits are fan-made models and the footer credit stays. Any new model needs its credit.

## Build order

0. **Spike (throwaway, labelled).** An empty lab, the camera rail, the reactor door, and all seven suits in one scene. Measure load size, memory and frame rate on a phone-class budget. If the suits cost too much, this changes the plan before anything else is built.
1. Lab shell and the door.
2. The suits (Hall folded in, with passes and drag-to-turn).
3. About: hologram portrait, gym, coffee, guitar, cards.
4. The trophy shelf.
5. The workbench.
6. The office.
7. Fallbacks, accessibility, performance pass, test-suite update.

Each step ends with `npm run check` and the browser suite, and its own small commit.

## Risks

| Risk | Plan |
| --- | --- |
| Seven suits in one scene is too heavy on phones | The spike measures it; fallback is fewer full-detail suits, or snapshots of the distant ones |
| Atmosphere gets in a recruiter's way | Auto-opening door, nav on top at every stop, content in real HTML |
| Scroll-driven camera feels wrong on iOS Safari | Test on a real phone early, in the spike |
| Hologram makes the portrait look fake | Edge-only effect; Evan reviews a still before it ships |
| Anchor links and the test suite break | Anchors are part of each step's definition of done |
| Free models don't match each other | Prefer one consistent low-poly style; build the simple props |

## Decisions already made by Evan

| Decision | Outcome |
| --- | --- |
| Layout | The walk-through (option A) |
| Order | Door and About, suits, experience, tools, office |
| Portrait | Hologram |
| Furniture | Gym, guitar, coffee machine, all clickable |
| Experience | A trophy shelf, with awards, certificates and scholarships kept separate |
| Entry | The arc reactor becomes the door |
| Office | A second room, reached by scrolling, for contact details |
| Portrait photo | The one already on the site |
| Door | Opens by itself a few seconds after the scene is ready, as well as on click, key or scroll |
| Skip control | None. The tour is the site; the nav and anchors are the way to jump |
| Floorball | Mentioned on the gym card, with a floorball stick in the gym corner |
| Army and school sport | Shown as objects: a commando beret and a hockey stick, each clickable |
| Card wording | Drafts below are approved |
| Priorities | 1. The art of everything. 2. The overall UI and UX. 3. Impact: as impressive as it can be |

## Approved card drafts

- **Barbell (gym):** "I'm a powerlifter, and a certified personal trainer."
- **Floorball stick:** "I captain SUTD's men's floorball team."
- **Coffee machine and kopi:** "Coffee addict. Nothing fancy: a simple kopi does it."
- **Guitar:** "I play guitar in my free time, and serve as a guitarist in my church's worship team."
- **Commando beret:** "Detachment Commander, 1st Commando Battalion. Led a detachment of 12 in a unit named Best Combat Unit for 2023/24, and marched in the National Day Parade 2024 Colours Party."
- **Hockey stick:** "Vice-captain of the boys' hockey team at Victoria Junior College; first runners-up at the 2022 National School Games."

## Quality bar (Evan's priorities)

Art first, then UI and UX, then impact. In practice:

- Every stop is composed like a film still: one lit subject, depth behind it, nothing floating without a reason.
- Props share one material language with the suits (brushed metal, dark lacquer, warm wood for the bar and office, blue emissive for anything holographic).
- Motion is slow and weighted. The camera eases into each stop and settles; nothing bounces or spins for show.
- Each stop is screenshotted at desktop and phone widths and judged as a still before it is called done.
