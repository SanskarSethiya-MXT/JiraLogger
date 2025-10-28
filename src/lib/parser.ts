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
  const regex = /^([A-Z][A-Z0-9]+-\d+)\s*:\s*(.+?)\s+\((.+)\)$/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const match = trimmedLine.match(regex);
    if (match) {
      const [, ticket, description, timeString] = match;
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
