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
  // Normalize line endings to handle different file formats (Windows/Unix)
  const lines = text.replace(/\r\n/g, '\n').split("\n");
  
  // Regex:
  // - Starts with optional whitespace
  // - Captures a Jira ticket key (e.g., MXT-5573)
  // - Captures an optional parenthesized group (e.g., (Internal meeting))
  // - A colon separator
  // - Captures the rest of the description
  // - Ends with a time string (e.g., 1h 30m)
  const regex = /^\s*([A-Z][A-Z0-9]+-\d+)\s*(?:\(([^)]+)\))?:\s*(.*?)\s+([\d.\s]+[hm])\s*$/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Ignore date lines like '16-10-2025 Thursday' or 'Total: 2h'
    const isDateLine = /^\d{2}-\d{2}-\d{4}/.test(trimmedLine);
    const isTotalLine = /^Total:/.test(trimmedLine);
    if(isDateLine || isTotalLine) return;

    const match = line.match(regex);

    if (match) {
      const [, ticket, group, descriptionText, timeString] = match;
      
      let description = descriptionText.trim();
      if (group) {
        description = `(${group.trim()}) ${description}`;
      }

      const timeSpentInMinutes = timeStringToMinutes(timeString);
      if (timeSpentInMinutes > 0) {
        entries.push({
          id: `${Date.now()}-${index}`,
          ticket,
          description: description,
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
