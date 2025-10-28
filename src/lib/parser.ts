import { WorklogEntry } from "@/types";
import { addMinutes, setHours, setMinutes, setSeconds, startOfToday } from "date-fns";

const timeStringToMinutes = (timeString: string): number => {
  let totalMinutes = 0;
  const hoursMatch = timeString.match(/(\d+\.?\d*)\s*h/);
  const minutesMatch = timeString.match(/(\d+)\s*m/);

  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  return Math.round(totalMinutes);
};

export const parseWorklog = (text: string, dayStartTime: string): WorklogEntry[] => {
  const entries: WorklogEntry[] = [];
  const lines = text.replace(/\r\n/g, '\n').split("\n");

  const [startHour, startMinute] = dayStartTime.split(':').map(Number);
  let currentLogTime = setSeconds(setMinutes(setHours(startOfToday(), startHour), startMinute), 0);

  // Regex updated to correctly handle parentheses in the description.
  const regex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*:\s*(.*?)\s*\(([\d.\shm]+)\)\s*$/;
  const simpleRegex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*:\s*(.*?)\s+([\d.\s]+[hm])\s*$/;


  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const isDateLine = /^\d{2}-\d{2}-\d{4}/.test(trimmedLine);
    const isTotalLine = /^Total:/.test(trimmedLine);
    if(isDateLine || isTotalLine) return;

    let match = trimmedLine.match(regex);
    if (!match) {
        match = trimmedLine.match(simpleRegex);
    }

    if (match) {
        let ticket, description, timeString;

        if (match.length === 4) { // Matches the first regex
            [, ticket, description, timeString] = match;
        } else { // Matches the second regex, which has a different group structure
            [, ticket, description, timeString] = match;
        }

        const timeSpentInMinutes = timeStringToMinutes(timeString);

        if (timeSpentInMinutes > 0) {
            const entryStartTime = new Date(currentLogTime);
            entries.push({
            id: `${Date.now()}-${index}`,
            ticket,
            description: description.trim(),
            timeSpentInMinutes,
            startTime: entryStartTime,
            });
            // Add the duration of the current log to set the start time for the next one
            currentLogTime = addMinutes(currentLogTime, timeSpentInMinutes);
        }
    }
  });

  return entries;
};

export const formatMinutesToTime = (minutes: number): string => {
  if (minutes === 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let result = "";
  if (h > 0) {
    result += `${h}h`;
  }
  if (m > 0) {
    result += `${result ? ' ' : ''}${m}m`;
  }
  return result;
};

    