import { WorklogEntry } from "@/types";
import { addMinutes, setHours, setMinutes, setSeconds, startOfToday } from "date-fns";

const timeStringToMinutes = (timeString: string): number => {
  if (!timeString) return 0;
  let totalMinutes = 0;
  const hoursMatch = timeString.match(/(\d+\.?\d*)\s*h/);
  const minutesMatch = timeString.match(/(\d+)\s*m/);

  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  // Handle cases like "1h30m" without spaces
  if (!hoursMatch && !minutesMatch) {
    const combinedMatch = timeString.match(/(\d+)h(\d+)m/);
    if (combinedMatch) {
      totalMinutes += parseInt(combinedMatch[1], 10) * 60;
      totalMinutes += parseInt(combinedMatch[2], 10);
    }
  }

  return Math.round(totalMinutes);
};

export const parseWorklog = (text: string, dayStartTime: string): WorklogEntry[] => {
  const entries: WorklogEntry[] = [];
  const lines = text.replace(/\r\n/g, '\n').split("\n");

  const [startHour, startMinute] = dayStartTime.split(':').map(Number);
  let currentLogTime = setSeconds(setMinutes(setHours(startOfToday(), startHour || 9), startMinute || 0), 0);

  // Regex inspired by the python script to be more robust.
  // It captures: 1. Issue Key, 2. Optional text in parens, 3. Description, 4. Time
  const entryRegex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*(?:\(([^)]+)\))?:\s*(.*?)\s*:\s*(.+)$/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const isDateLine = /^\d{2}-\d{2}-\d{4}/.test(trimmedLine);
    const isTotalLine = /^Total:/.test(trimmedLine);
    if(isDateLine || isTotalLine) return;

    // A simpler regex for entries without the extra colon in description
    const simpleEntryRegex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*(?:\(([^)]+)\))?:\s*(.*?)\s+([\d.\shm]+)$/;

    let match = trimmedLine.match(entryRegex);
    let timeStringFromMatch: string | undefined;

    if (match) {
        timeStringFromMatch = match[4];
    } else {
        match = trimmedLine.match(simpleEntryRegex);
        if(match){
             // Check if last part looks like time
            const potentialTime = match[4];
            const lastPartIsTime = /(\d+h|\d+m)/.test(potentialTime);
            if (lastPartIsTime) {
                timeStringFromMatch = potentialTime;
            } else {
                // It's not a valid time, so this regex didn't work.
                match = null;
            }
        }
    }

    if (match && timeStringFromMatch) {
        const [, ticket, context, descriptionPart1, timePart] = match;
        const timeString = timeStringFromMatch.trim();
        const description = (context ? `${context}: ` : '') + descriptionPart1.trim();

        const timeSpentInMinutes = timeStringToMinutes(timeString);

        if (timeSpentInMinutes > 0) {
            const entryStartTime = new Date(currentLogTime);
            const entryEndTime = addMinutes(entryStartTime, timeSpentInMinutes);
            entries.push({
                id: `${Date.now()}-${index}`,
                ticket,
                description: description.trim(),
                timeSpentInMinutes,
                startTime: entryStartTime,
                endTime: entryEndTime,
            });
            currentLogTime = entryEndTime;
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
