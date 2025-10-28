export type WorklogEntry = {
  id: string;
  ticket: string;
  description: string;
  timeSpentInMinutes: number;
  startTime?: Date;
  endTime?: Date;
};

export type JiraSettings = {
  url: string;
  email: string;
  apiToken: string;
};
