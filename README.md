# School WhatsApp Calendar Helper

This project turns exported or copied school WhatsApp group text into an `.ics`
calendar file that you can import into Apple Calendar, iCloud Calendar, Google
Calendar, or Outlook. It adds two reminder alarms to each item: 1 day before and
2 hours before.

## Important limitation

WhatsApp does not provide a normal supported API for silently monitoring your
personal school groups. iPhone apps also cannot read WhatsApp chats in the
background. The reliable, account-safe approach is:

1. Export a WhatsApp group chat as a `.txt` file, or copy relevant messages into
   a `.txt` file.
2. Run this helper against that file or folder.
3. Import the generated `school-reminders.ics` file into the calendar that syncs
   to your iPhone.

Desktop WhatsApp automation can be added later, but it is brittle and may break
when WhatsApp Web changes.

## Run it

```powershell
python .\school_whatsapp_calendar.py ".\exports" -o ".\school-reminders.ics"
```

You can also point it at a single exported chat:

```powershell
python .\school_whatsapp_calendar.py ".\WhatsApp Chat with Grade 4.txt" -o ".\school-reminders.ics"
```

To keep watching a folder for updated exports:

```powershell
python .\school_whatsapp_calendar.py ".\exports" -o ".\school-reminders.ics" --watch
```

## iPhone calendar options

The simplest option is to import `school-reminders.ics` into the calendar account
that already syncs to your iPhone:

- iCloud Calendar: import the `.ics` file on iCloud.com Calendar or Apple
  Calendar on a Mac.
- Google Calendar: Settings > Import & export > Import, then choose the calendar
  that is visible on your iPhone.
- Outlook Calendar: Add calendar > Upload from file.

For fully automatic calendar creation, the next step is to connect this helper
to Google Calendar, Outlook, or iCloud CalDAV. Google/Outlook are usually easier
and safer than iCloud CalDAV because they support modern app authorization flows.

## What it detects

The parser looks for school-like messages containing words such as `homework`,
`test`, `exam`, `meeting`, `bring`, `form`, `pay`, `practice`, `trip`, and
`reminder`, then tries to extract dates such as:

- `tomorrow`
- `Friday` or `next Friday`
- `23/05`, `23/05/2026`
- `23 May`, `23 May 2026`

Times such as `08:30`, `2pm`, `2.30pm`, `morning`, `afternoon`, and
`after school` are handled. If no time is found, the item becomes an all-day
calendar item.

## Quick To-Do Notes app

A simple browser-based notes and to-do app is in `todo_app`. It saves tasks in
your browser, lets you edit task names and due dates inline, and reminds you
when an unfinished task becomes due.

### Open it locally

Run it with:

```powershell
node .\todo_app\server.js
```

Then open:

```text
http://127.0.0.1:8080
```

Click the `!` button in the top-right corner to allow browser notifications.
Keep the page open for live reminders. If the page was closed, overdue tasks are
still highlighted the next time you open it.

### Publish it with GitHub Pages

1. Create a new GitHub repository.
2. Upload or push this project folder to that repository.
3. On GitHub, open the repository and go to `Settings` > `Pages`.
4. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
5. Choose the branch you pushed, usually `main`, and select `/ (root)`.
6. Click `Save`.

GitHub will give you a website link after a minute or two. The root `index.html`
opens the to-do app automatically, so your Pages link should go straight to
Quick To-Do.

Notes and tasks are saved in each browser's local storage. That means your phone
and computer will each have their own task list until cloud sync is added later.
