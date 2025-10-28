'use server';
/**
 * @fileOverview Suggest Jira tickets from a work description.
 *
 * - suggestJiraTickets - A function that suggests Jira tickets based on a work description.
 * - SuggestJiraTicketsInput - The input type for the suggestJiraTickets function.
 * - SuggestJiraTicketsOutput - The return type for the suggestJiraTickets function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestJiraTicketsInputSchema = z.object({
  workDescription: z
    .string()
    .describe('The description of the work done.'),
});
export type SuggestJiraTicketsInput = z.infer<typeof SuggestJiraTicketsInputSchema>;

const SuggestJiraTicketsOutputSchema = z.object({
  suggestedTickets: z
    .array(z.string())
    .describe('The suggested Jira ticket numbers.'),
});
export type SuggestJiraTicketsOutput = z.infer<typeof SuggestJiraTicketsOutputSchema>;

export async function suggestJiraTickets(input: SuggestJiraTicketsInput): Promise<SuggestJiraTicketsOutput> {
  return suggestJiraTicketsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestJiraTicketsPrompt',
  input: {schema: SuggestJiraTicketsInputSchema},
  output: {schema: SuggestJiraTicketsOutputSchema},
  prompt: `Based on the following work description, suggest relevant Jira ticket numbers.  Return a list of ticket numbers.\n\nWork Description: {{{workDescription}}}`,
});

const suggestJiraTicketsFlow = ai.defineFlow(
  {
    name: 'suggestJiraTicketsFlow',
    inputSchema: SuggestJiraTicketsInputSchema,
    outputSchema: SuggestJiraTicketsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
