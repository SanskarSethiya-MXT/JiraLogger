"use server";

import {
  suggestJiraTickets,
  SuggestJiraTicketsInput,
  SuggestJiraTicketsOutput,
} from "@/ai/flows/suggest-jira-tickets-from-work-description";

export { suggestJiraTickets };
export type { SuggestJiraTicketsInput, SuggestJiraTicketsOutput };
