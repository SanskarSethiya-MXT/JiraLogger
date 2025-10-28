import { WorklogEntry } from "@/types";

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

export const parseWorklog = (text: string): WorklogEntry[] => {
  const entries: WorklogEntry[] = [];
  const lines = text.split("\n");
  // Regex for jira ticket, description and time.
  // It will match lines starting with an optional tab/space, then a ticket, a colon, a description, and a time in parentheses or at the end.
  const regex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*:\s*(.+?)(?:\s+\((.+)\)|:\s*(.+))$/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Ignore date lines like '16-10-2025 Thursday' or 'Total: 2h'
    const isDateLine = /^\d{2}-\d{2}-\d{4}/.test(trimmedLine);
    const isTotalLine = /^Total:/.test(trimmedLine);
    if(isDateLine || isTotalLine) return;

    const match = line.match(regex);
    if (match) {
      // The time string could be in group 3 or 4
      const [, ticket, description, timeString1, timeString2] = match;
      const timeString = timeString1 || timeString2;
      if (timeString) {
        const timeSpentInMinutes = timeStringToMinutes(timeString);
        if (timeSpentInMinutes > 0) {
          entries.push({
            id: `${Date.now()}-${index}`,
            ticket,
            description: description.trim(),
            timeSpentInMinutes,
          });
        }
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