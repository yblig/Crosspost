# TwinPost — design
Interpretation: "crosspost app for YouTube and TikTok". Direct API upload needs the
owner's own Google Cloud + TikTok developer credentials (TikTok audits apps before
public posting), so v1 works with zero setup: compose once, then hand the video to
the official YouTube and TikTok apps via Android share intents with the caption
copied to the clipboard. Everything else (drafts, per-platform tailoring, hashtag
sets, schedule reminders, post history) is native to TwinPost.

## Pitch
Write it once, post it twice. Pick a clip, write one caption, tweak it per platform
with live character limits, then fire it to YouTube Shorts and TikTok in two taps.

## Core loop
New post → pick video → write caption + hashtags → (optional) tailor YouTube title /
TikTok caption → Publish screen → tap "Post to YouTube" (caption copied, YouTube opens
with the video) → come back → "Did it go up?" ✓ → same for TikTok → both done = confetti.

## Screens & flow
Onboarding (3 slides, skippable, first run only)
Tabs: **Posts** (home) · **Library** (hashtag sets + caption templates) · **Settings**
Stack screens: **Composer** (new/edit), **Publish** (two-step posting), **Post detail**.
FAB on Posts → Composer.
Back button: close sheet/dialog → pop stack → Posts tab → press-again-to-exit.

### Posts
Header with greeting + weekly stats (posted this week, streak days, both-platform rate).
Filter chips: All / Drafts / Scheduled / Posted. Search by text.
Cards: thumbnail, title, platform pills (YouTube ✓/•, TikTok ✓/•), scheduled time.
Swipe-free: long-press/⋯ menu → Duplicate, Delete (undo toast).
Empty state illustration + "Create your first post".

### Composer
Video card (pick / replace; thumbnail, duration, orientation, size; warnings:
YouTube Shorts needs vertical/square ≤ 3:00; TikTok ≤ 10:00).
Main caption textarea; hashtag chips (add, remove, insert set).
Platform tabs:
- YouTube: Title (≤100), Description (≤5000, default = caption + hashtags), add #Shorts toggle.
- TikTok: Caption (≤2200 incl. hashtags; default = caption + hashtags).
"Linked to main caption" toggle per platform — editing breaks the link.
Schedule: optional date+time → local notification reminder at that time.
Bottom bar: Save draft · Continue to publish.

### Publish
Video thumb, two step cards (YouTube, TikTok) each with: status, "Copy text",
"Post to X" (copies + opens app with video), "Mark as posted"/undo.
Detects install of each app (TikTok: global, Asia "trill", Lite). Missing → "Share
via…" chooser. On return from the app a dialog asks "Posted on YouTube?" Yes/Not yet.
Both done → confetti + success sound, post marked Posted.

### Library
Hashtag sets (name + tags) and caption templates; add/edit/delete in bottom sheets.
Seeded with a few useful sets.

### Settings
Theme (system/light/dark), sounds, haptics, default #Shorts, default reminder,
TikTok app preference (auto / global / Lite), export/import backup (JSON via share /
clipboard), reset data, about.

## Art direction
Style: flat neo-minimal, rounded 20px cards, soft shadows, a dual-tone brand gradient
(coral → violet → aqua) standing for "two platforms, one post". No platform logos —
platforms are shown as coloured pills: YouTube = coral red, TikTok = aqua + pink.
Palette (dark): bg #0e0f16, surface #181a25, surface2 #222536, text #eef0fa,
muted #8d92ad, brand1 #ff4d6d, brand2 #7c5cff, brand3 #22e3d6, warn #ffb547, ok #3ddc97.
Palette (light): bg #f5f6fb, surface #ffffff, surface2 #eceef6, text #141627, muted #6b7090.
Fonts: Space Grotesk (titles, numbers), Plus Jakarta Sans (body).
Assets: logo mark (two overlapping play-rounded squares), onboarding illustrations
(3), empty-state illustration, icon.

## Audio (UI, low volume)
tap → tap; open sheet → whoosh soft; back → back; copy → tick; save → confirm;
post handed off → swipe; mark posted → coin; both posted → win; delete → thud soft;
error → error. No background music (it's a tool; music would fight the video apps).

## Juice
Sheet slide-up spring, list item enter/exit, pressed scale 0.97, progress ring fills
on publish, confetti burst when both platforms done, counters count up on Posts header.

## Persistence (storage keys)
posts (array, versioned), library {sets, templates}, settings, onboarded.
Videos are referenced by persisted content:// URI (takePersistableUriPermission).

## Native
Custom Capacitor plugin `CrossShare` (Java, in app): pickVideo (OPEN_DOCUMENT +
persistable permission + metadata + thumbnail), installed (package query),
shareVideo (ACTION_SEND video/* to package or chooser), uriOk.
Plugins: clipboard, local-notifications, haptics, preferences, app, status-bar.
