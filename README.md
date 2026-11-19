# Daybreak

A quiet daily discipline log for your phone. Plain HTML, CSS and JavaScript, no build step, no account.

- **Right now**: the one thing you should be doing, with a big Done button.
- **Timed routine** (`routine.json`): morning, day, evening and night, each with a streak and the last 7 days. Gym Sunday to Thursday at 9 PM, a bedtime stretch on Friday and Saturday.
- **Sleep shift**: wake-up moves 15 minutes earlier every 3 days, from 9:30 to 8:00, and lights-out moves with it.
- **Never miss twice**: a missed day gets a gentle nudge instead of a zeroed streak.
- **A recipe for every meal** (`recipes.json`) and **a workout for every day** (`workouts.json`).
- **Today's one thing**: one line each morning.
- **No-phone time**: a 30, 60 or 90 minute timer with a slow breathing circle.
- **Evening check-in**: what went well, and one thing to do better tomorrow.
- **Last 4 weeks**: each day shaded by how much you got done.

The sky at the top follows the time of day, and the app follows your phone's light or dark mode.

## Install on your phone

Open the GitHub Pages link, then:

- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** ⋮ → Add to Home screen / Install app

It works offline after the first visit.

## Reminders

`.github/workflows/reminders.yml` runs at 3 AM every day and schedules that day's reminders on [ntfy](https://ntfy.sh). Install the ntfy app and subscribe to the topic shown under "Reminders on your phone" in the app. To change times or wording, edit `routine.json`.

## Your data

Everything is saved in your phone's browser storage only. Clearing site data or switching phones erases it, so use **Back up my data** at the bottom now and then.

## Run locally

Any static server works, for example `python3 -m http.server` in this folder, then open http://localhost:8000.
