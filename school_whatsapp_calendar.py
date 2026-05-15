#!/usr/bin/env python3
"""Turn exported school WhatsApp chats into an iPhone-importable calendar file.

This is intentionally local and conservative. WhatsApp does not give normal
personal accounts a supported API for silently reading group chats, so this
tool works from exported/copied chat text files instead.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import re
import time
from dataclasses import dataclass
from pathlib import Path


SCHOOL_KEYWORDS = {
    "assessment",
    "assembly",
    "bring",
    "civvies",
    "concert",
    "consent",
    "deadline",
    "due",
    "exam",
    "excursion",
    "form",
    "forms",
    "homework",
    "meeting",
    "outing",
    "parent",
    "parents",
    "pay",
    "payment",
    "practice",
    "project",
    "reminder",
    "sport",
    "test",
    "tour",
    "trip",
}

MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}

CHAT_LINE_PATTERNS = [
    re.compile(
        r"^\[(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),?\s+"
        r"(?P<time>\d{1,2}:\d{2})(?:\s?(?P<ampm>[APMapm]{2}))?\]\s+"
        r"(?P<sender>.*?):\s(?P<message>.*)$"
    ),
    re.compile(
        r"^(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),?\s+"
        r"(?P<time>\d{1,2}:\d{2})(?:\s?(?P<ampm>[APMapm]{2}))?\s+-\s+"
        r"(?:(?P<sender>.*?):\s)?(?P<message>.*)$"
    ),
]


@dataclass(frozen=True)
class ChatMessage:
    sent_at: dt.datetime
    sender: str
    text: str
    source: str


@dataclass(frozen=True)
class CalendarItem:
    title: str
    start: dt.datetime
    end: dt.datetime
    all_day: bool
    description: str
    source: str


def parse_chat_date(date_text: str, time_text: str, ampm: str | None) -> dt.datetime:
    day, month, year = [int(part) for part in re.split(r"[/-]", date_text)]
    if year < 100:
        year += 2000
    hour, minute = [int(part) for part in time_text.split(":")]
    if ampm:
        marker = ampm.lower()
        if marker == "pm" and hour != 12:
            hour += 12
        if marker == "am" and hour == 12:
            hour = 0
    return dt.datetime(year, month, day, hour, minute)


def read_whatsapp_export(path: Path) -> list[ChatMessage]:
    messages: list[ChatMessage] = []
    current: ChatMessage | None = None

    for raw_line in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = next((pattern.match(line) for pattern in CHAT_LINE_PATTERNS if pattern.match(line)), None)
        if match:
            if current:
                messages.append(current)
            groups = match.groupdict()
            sent_at = parse_chat_date(groups["date"], groups["time"], groups.get("ampm"))
            current = ChatMessage(
                sent_at=sent_at,
                sender=(groups.get("sender") or "WhatsApp").strip(),
                text=groups["message"].strip(),
                source=str(path),
            )
        elif current:
            current = ChatMessage(
                sent_at=current.sent_at,
                sender=current.sender,
                text=f"{current.text}\n{line}",
                source=current.source,
            )

    if current:
        messages.append(current)
    return messages


def has_school_signal(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in SCHOOL_KEYWORDS)


def next_weekday(reference: dt.date, weekday: int, force_next: bool = False) -> dt.date:
    delta = (weekday - reference.weekday()) % 7
    if delta == 0 and force_next:
        delta = 7
    return reference + dt.timedelta(days=delta)


def extract_date(text: str, reference: dt.datetime) -> dt.date | None:
    lowered = text.lower()
    if re.search(r"\btoday\b", lowered):
        return reference.date()
    if re.search(r"\btomorrow\b", lowered):
        return reference.date() + dt.timedelta(days=1)

    numeric = re.search(r"\b(?P<day>\d{1,2})[/-](?P<month>\d{1,2})(?:[/-](?P<year>\d{2,4}))?\b", lowered)
    if numeric:
        day = int(numeric.group("day"))
        month = int(numeric.group("month"))
        year_text = numeric.group("year")
        year = int(year_text) if year_text else reference.year
        if year < 100:
            year += 2000
        candidate = dt.date(year, month, day)
        if not year_text and candidate < reference.date() - dt.timedelta(days=7):
            candidate = dt.date(reference.year + 1, month, day)
        return candidate

    named = re.search(
        r"\b(?P<day>\d{1,2})(?:st|nd|rd|th)?\s+"
        r"(?P<month>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
        r"jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
        r"(?:\s+(?P<year>\d{2,4}))?\b",
        lowered,
    )
    if named:
        day = int(named.group("day"))
        month = MONTHS[named.group("month")]
        year_text = named.group("year")
        year = int(year_text) if year_text else reference.year
        if year < 100:
            year += 2000
        candidate = dt.date(year, month, day)
        if not year_text and candidate < reference.date() - dt.timedelta(days=7):
            candidate = dt.date(reference.year + 1, month, day)
        return candidate

    for word, weekday in WEEKDAYS.items():
        if re.search(rf"\bnext\s+{word}\b", lowered):
            return next_weekday(reference.date(), weekday, force_next=True)
        if re.search(rf"\b{word}\b", lowered):
            return next_weekday(reference.date(), weekday)

    return None


def extract_time(text: str) -> tuple[dt.time | None, bool]:
    lowered = text.lower()
    match = re.search(r"\b(?P<hour>\d{1,2})(?::|\.)(?P<minute>\d{2})\s?(?P<ampm>am|pm)?\b", lowered)
    if not match:
        match = re.search(r"\bat\s+(?P<hour>\d{1,2})\s?(?P<ampm>am|pm)\b", lowered)

    if match:
        hour = int(match.group("hour"))
        minute = int(match.groupdict().get("minute") or 0)
        ampm = match.groupdict().get("ampm")
        if ampm == "pm" and hour != 12:
            hour += 12
        if ampm == "am" and hour == 12:
            hour = 0
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return dt.time(hour, minute), False

    if "after school" in lowered:
        return dt.time(14, 30), False
    if "morning" in lowered:
        return dt.time(8, 0), False
    if "afternoon" in lowered:
        return dt.time(14, 0), False
    return None, True


def make_title(text: str) -> str:
    clean = " ".join(text.split())
    clean = re.sub(r"https?://\S+", "", clean).strip()
    clean = re.sub(r"\bplease\b|\bkindly\b", "", clean, flags=re.IGNORECASE).strip(" :-")
    clean = " ".join(clean.split())
    if len(clean) > 72:
        clean = clean[:69].rstrip() + "..."
    return clean or "School reminder"


def messages_to_calendar_items(messages: list[ChatMessage]) -> list[CalendarItem]:
    items: list[CalendarItem] = []
    seen: set[str] = set()

    for message in messages:
        if not has_school_signal(message.text):
            continue
        date = extract_date(message.text, message.sent_at)
        if not date:
            continue
        event_time, all_day = extract_time(message.text)
        if all_day:
            start = dt.datetime.combine(date, dt.time())
            end = start + dt.timedelta(days=1)
        else:
            start = dt.datetime.combine(date, event_time or dt.time(8, 0))
            end = start + dt.timedelta(hours=1)

        fingerprint = hashlib.sha1(f"{start.isoformat()}|{message.text}".encode("utf-8")).hexdigest()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)

        items.append(
            CalendarItem(
                title=make_title(message.text),
                start=start,
                end=end,
                all_day=all_day,
                description=f"From {message.sender} at {message.sent_at:%Y-%m-%d %H:%M}\n\n{message.text}",
                source=message.source,
            )
        )

    return sorted(items, key=lambda item: item.start)


def ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def format_ics_datetime(value: dt.datetime, all_day: bool) -> str:
    if all_day:
        return value.strftime("%Y%m%d")
    return value.strftime("%Y%m%dT%H%M%S")


def write_ics(items: list[CalendarItem], output: Path) -> None:
    now = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Local School WhatsApp Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    for item in items:
        uid_source = f"{item.start.isoformat()}|{item.title}|{item.description}"
        uid = hashlib.sha1(uid_source.encode("utf-8")).hexdigest() + "@school-whatsapp-local"
        date_type = ";VALUE=DATE" if item.all_day else ""
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now}",
                f"SUMMARY:{ics_escape(item.title)}",
                f"DTSTART{date_type}:{format_ics_datetime(item.start, item.all_day)}",
                f"DTEND{date_type}:{format_ics_datetime(item.end, item.all_day)}",
                f"DESCRIPTION:{ics_escape(item.description)}",
                f"LOCATION:{ics_escape('School')}",
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                f"DESCRIPTION:{ics_escape(item.title)}",
                "TRIGGER:-P1D",
                "END:VALARM",
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                f"DESCRIPTION:{ics_escape(item.title)}",
                "TRIGGER:-PT2H",
                "END:VALARM",
                "END:VEVENT",
            ]
        )

    lines.append("END:VCALENDAR")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\r\n".join(lines) + "\r\n", encoding="utf-8", newline="")


def collect_items(input_paths: list[Path]) -> list[CalendarItem]:
    messages: list[ChatMessage] = []
    for path in input_paths:
        if path.is_dir():
            for child in sorted(path.glob("*.txt")):
                messages.extend(read_whatsapp_export(child))
        else:
            messages.extend(read_whatsapp_export(path))
    return messages_to_calendar_items(messages)


def run_once(input_paths: list[Path], output: Path) -> int:
    items = collect_items(input_paths)
    write_ics(items, output)
    return len(items)


def run_watch(input_paths: list[Path], output: Path, interval_seconds: int) -> None:
    last_signature = ""
    while True:
        txt_files: list[Path] = []
        for path in input_paths:
            txt_files.extend(sorted(path.glob("*.txt")) if path.is_dir() else [path])
        signature = "|".join(
            f"{path}:{path.stat().st_mtime_ns}:{path.stat().st_size}"
            for path in txt_files
            if path.exists()
        )
        if signature != last_signature:
            count = run_once(input_paths, output)
            print(f"{dt.datetime.now():%H:%M:%S} wrote {count} item(s) to {output}")
            last_signature = signature
        time.sleep(interval_seconds)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create calendar reminders from exported WhatsApp school chats.")
    parser.add_argument("inputs", nargs="+", type=Path, help="WhatsApp exported .txt files or folders of .txt files")
    parser.add_argument("-o", "--output", type=Path, default=Path("school-reminders.ics"))
    parser.add_argument("--watch", action="store_true", help="Keep watching input files/folders for changes")
    parser.add_argument("--interval", type=int, default=30, help="Watch interval in seconds")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.watch:
        run_watch(args.inputs, args.output, args.interval)
        return
    count = run_once(args.inputs, args.output)
    print(f"Wrote {count} item(s) to {args.output}")


if __name__ == "__main__":
    main()
