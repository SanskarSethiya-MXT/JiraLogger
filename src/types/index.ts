/**
 * @file index.ts
 * @description This file defines the core data structures used throughout the JiraLogger application.
 * It ensures data consistency between different parts of the app, such as parsing, state management, and API calls.
 */

export type WorklogEntry = {
  id: string;
  ticket: string;
  description: string;
  timeSpentInMinutes: number;
  startTime?: Date;
  endTime?: Date;
};
