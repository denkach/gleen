# Gleen product specification

## Product promise

Gleen turns one YouTube video into a spectrum of reusable knowledge artifacts.

Core message:

> Watch less. Understand more.

## Primary user journey

1. A user pastes a YouTube URL.
2. Gleen validates and normalizes the URL.
3. Gleen detects whether the same analysis already exists.
4. If it exists, the user can reopen it without consuming credits.
5. Otherwise, Gleen processes the video and creates artifacts.
6. The user studies, edits, searches, copies, exports, or shares the result.

## Core artifacts

### Structured summary

- key takeaway;
- structured sections;
- expandable chapters;
- important terms;
- arguments and conclusions;
- source timestamp links;
- section editing and regeneration.

### Flashcards

- question and answer sides;
- 3D flip interaction;
- study progress;
- Again / Hard / Got it actions;
- editing, deleting, and custom card creation;
- links to source timestamps.

### Timestamps

- vertical timeline;
- chapter title and short description;
- clickable timecodes;
- player synchronization;
- preview frames where available.

### Transcript

- searchable timestamped paragraphs;
- active sentence synchronization;
- copy, highlight, and jump-to-time actions.

### Export

- Markdown copy and download;
- Obsidian-compatible export;
- Notion connection and page export;
- NotebookLM-compatible source handoff;
- honest connection, progress, success, and failure states.

## Required routes

### Public

- `/`
- `/pricing`
- `/sign-in`
- `/sign-up`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/privacy`
- `/terms`
- `/cookies`
- `/acceptable-use`
- `/status`
- `/contact`
- `/share/[token]`

### Authenticated

- `/app`
- `/app/video/[id]`
- `/app/history`
- `/app/subscription`
- `/app/settings/profile`
- `/app/settings/preferences`
- `/app/settings/language`
- `/app/settings/integrations`
- `/app/settings/notifications`
- `/app/settings/security`
- `/app/settings/data`

## Authentication

Primary methods:

- Google;
- email magic link;
- optional email and password.

Stripe is not a primary sign-in method. Stripe is used for checkout, subscriptions, payment methods, invoices, and billing portal access.

## Onboarding

Three lightweight steps:

1. Interface language.
2. Output preferences.
3. First video.

Non-essential integration setup must be skippable.

## Duplicate protection

Before consuming credits, normalize the YouTube URL and compare:

- canonical video ID;
- output language;
- analysis preset;
- selected artifacts;
- relevant analysis version.

Exact duplicate result:

- show “You already analyzed this video.”;
- primary action: “Open saved result”;
- supporting message: “No credits will be used.”;
- optional secondary action: “Analyze again”.

## Processing stages

- validating link;
- reading video information;
- finding transcript;
- structuring key ideas;
- creating flashcards;
- mapping timestamps;
- preparing exports;
- complete.

## Required failure states

- invalid URL;
- video unavailable;
- private, restricted, or unsupported video;
- transcript unavailable;
- unsupported language;
- video too long for the current plan;
- usage limit reached;
- processing timeout;
- temporary server failure;
- offline;
- partial result.

## History

History must support:

- search by title, channel, URL, keyword, or result title;
- filters by date, language, status, artifacts, export, favorites;
- sorting;
- open, continue studying, export, rename, favorite, copy link, reanalyze, delete;
- desktop list/table hybrid;
- compact mobile cards.

## Subscription and billing

Suggested plan names:

- Free;
- Prism;
- Spectrum.

Prices, limits, currencies, and features are data-driven.

Required states:

- free;
- trial;
- active;
- scheduled downgrade;
- scheduled cancellation;
- past due;
- payment failed;
- checkout canceled;
- checkout success;
- no invoices;
- refund.

## Languages

Supported interface languages:

- Українська;
- Русский;
- English;
- Español;
- Deutsch.

Do not use flags. Interface language and generated-content language are separate settings.

## Trust and privacy

- Explain how video and account data are processed.
- Let users delete one analysis, all history, or the account.
- Do not claim security certifications that are not held.
- Explain that generated content can contain mistakes.

## Definition of done for a product feature

- all acceptance criteria are satisfied;
- default, loading, empty, success, error, disabled, mobile, and reduced-motion states are handled where relevant;
- accessibility is verified;
- automated tests pass;
- production build passes;
- browser verification is completed;
- documentation is updated.
