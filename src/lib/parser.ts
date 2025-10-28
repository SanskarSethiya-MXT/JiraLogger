import { WorklogEntry } from "@/types";
import { addMinutes, setHours, setMinutes, setSeconds, parse as parseDate } from "date-fns";

export const timeStringToMinutes = (timeString: string): number => {
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

export const parseTime = (dateKey: string, startHour: number, startMinute: number): Date => {
  const date = parseDate(dateKey, 'dd-MM-yyyy', new Date());
  return setSeconds(setMinutes(setHours(date, startHour), startMinute), 0);
};

export const parseWorklog = (text: string, dayStartTime: string): WorklogEntry[] => {
  const entries: WorklogEntry[] = [];
  const lines = text.replace(/\r\n/g, '\n').split("\n");

  const [startHour, startMinute] = dayStartTime.split(':').map(Number);
  
  let currentDate: Date | null = null;
  let currentLogTime: Date | null = null;

  const dateLineRegex = /^(\d{2}-\d{2}-\d{4})/;
  const entryRegex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*(?:\(([^)]+)\))?:\s*(.*?)\s*:\s*(.+)$/;
  const simpleEntryRegex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*(?:\(([^)]+)\))?:\s*(.*?)\s+([\d.\shm]+)$/;


  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const dateMatch = trimmedLine.match(dateLineRegex);
    if (dateMatch) {
        currentDate = parseDate(dateMatch[1], 'dd-MM-yyyy', new Date());
        currentLogTime = setSeconds(setMinutes(setHours(currentDate, startHour || 9), startMinute || 0), 0);
        return;
    }
    
    if (!currentLogTime || !currentDate) return;

    const isTotalLine = /^Total:/.test(trimmedLine);
    if(isTotalLine) return;

    let match = trimmedLine.match(entryRegex);
    let timeStringFromMatch: string | undefined;

    if (match) {
        timeStringFromMatch = match[4];
    } else {
        match = trimmedLine.match(simpleEntryRegex);
        if(match){
            const potentialTime = match[4];
            const lastPartIsTime = /(\d+h|\d+m)/.test(potentialTime);
            if (lastPartIsTime) {
                timeStringFromMatch = potentialTime;
            } else {
                match = null;
            }
        }
    }

    if (match && timeStringFromMatch) {
        const [, ticket, context, descriptionPart1] = match;
        const timeString = timeStringFromMatch.trim();
        let description = descriptionPart1.trim();
        if (context) {
            // If the simple regex was used, time might be in description.
            const timeIndex = description.lastIndexOf(timeString);
            if(timeIndex > -1){
                description = description.substring(0, timeIndex).trim();
            }
            description = `${context}: ${description}`;
        }


        const timeSpentInMinutes = timeStringToMinutes(timeString);

        if (timeSpentInMinutes > 0) {
            const entryStartTime = new Date(currentLogTime!);
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
