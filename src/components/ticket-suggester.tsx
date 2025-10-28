"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { suggestJiraTickets } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type TicketSuggesterProps = {
  description: string;
  onTicketSelect: (ticket: string) => void;
};

export function TicketSuggester({
  description,
  onTicketSelect,
}: TicketSuggesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSuggest = async () => {
    if (!description) {
      toast({
        variant: "destructive",
        title: "No Description",
        description: "Please provide a description to get suggestions.",
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestJiraTickets({ workDescription: description });
      setSuggestions(result.suggestedTickets);
      if (result.suggestedTickets.length === 0) {
        toast({
            title: "No suggestions found",
            description: "The AI could not find any relevant ticket suggestions.",
        });
      }
    } catch (error) {
      console.error("Failed to get ticket suggestions:", error);
      toast({
        variant: "destructive",
        title: "Suggestion Failed",
        description: "Could not fetch AI-powered ticket suggestions.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSuggest}
        disabled={isLoading}
      >
        <Wand2 className="mr-2 h-4 w-4" />
        {isLoading ? "Thinking..." : "Suggest Ticket"}
      </Button>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((ticket) => (
            <Badge
              key={ticket}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20"
              onClick={() => onTicketSelect(ticket)}
            >
              {ticket}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
