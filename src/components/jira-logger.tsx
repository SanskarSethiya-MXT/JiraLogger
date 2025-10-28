"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useJiraSettings } from "@/hooks/use-jira-settings";
import { formatMinutesToTime, parseWorklog } from "@/lib/parser";
import type { WorklogEntry } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Edit, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TicketSuggester } from "@/components/ticket-suggester";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "./ui/badge";

const editFormSchema = z.object({
  ticket: z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/, "Invalid Jira ticket format"),
  description: z.string().min(1, "Description cannot be empty"),
  timeSpent: z.string().min(1, "Time spent cannot be empty"),
});

type LogStatus = "pending" | "logging" | "success" | "error";

type EntryWithStatus = WorklogEntry & { logStatus: LogStatus };

export function JiraLogger() {
  const { toast } = useToast();
  const { settings, isLoaded } = useJiraSettings();
  const [worklogText, setWorklogText] = useState("");
  const [entries, setEntries] = useState<EntryWithStatus[]>([]);
  const [editingEntry, setEditingEntry] = useState<EntryWithStatus | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
  });

  const handleParse = () => {
    try {
      const parsedEntries = parseWorklog(worklogText);
      if (parsedEntries.length === 0) {
        toast({
          variant: "destructive",
          title: "Parsing Failed",
          description: "No valid worklog entries found. Check your format.",
        });
        return;
      }
      setEntries(parsedEntries.map(e => ({...e, logStatus: 'pending'})));
      toast({
        title: "Parsing Successful",
        description: `Found ${parsedEntries.length} worklog entries.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Parsing Error",
        description: "An unexpected error occurred during parsing.",
      });
      console.error(error);
    }
  };

  const totalMinutes = entries.reduce(
    (sum, entry) => sum + entry.timeSpentInMinutes,
    0
  );

  const handleEditOpen = (entry: EntryWithStatus) => {
    setEditingEntry(entry);
    editForm.reset({
      ticket: entry.ticket,
      description: entry.description,
      timeSpent: formatMinutesToTime(entry.timeSpentInMinutes),
    });
  };

  const handleEditClose = () => {
    setEditingEntry(null);
    editForm.reset();
  };

  const onEditSubmit = (values: z.infer<typeof editFormSchema>) => {
    if (!editingEntry) return;

    const newTime = parseWorklog(
      `${values.ticket}: ${values.description} (${values.timeSpent})`
    )[0]?.timeSpentInMinutes;

    if (!newTime) {
      editForm.setError("timeSpent", { message: "Invalid time format" });
      return;
    }

    setEntries(
      entries.map((e) =>
        e.id === editingEntry.id
          ? {
              ...e,
              ticket: values.ticket,
              description: values.description,
              timeSpentInMinutes: newTime,
            }
          : e
      )
    );
    handleEditClose();
    toast({ title: "Entry Updated" });
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
    toast({ title: "Entry Removed" });
  };

  const handleLogWork = async () => {
    if (!settings?.url || !settings?.email || !settings.apiToken) {
        toast({
          variant: "destructive",
          title: "Jira Settings Missing",
          description: "Please configure your Jira credentials in the settings.",
        });
        return;
      }
  
      setIsLogging(true);
  
      const promises = entries.map(async (entry) => {
        try {
          setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, logStatus: 'logging' } : e));

          const timeSpentInSeconds = entry.timeSpentInMinutes * 60;
          const body = JSON.stringify({
            comment: entry.description,
            timeSpentSeconds: timeSpentInSeconds,
          });
  
          const response = await fetch(`/api/jira`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jiraUrl: `${settings.url}/rest/api/2/issue/${entry.ticket}/worklog`,
              auth: `Basic ${btoa(`${settings.email}:${settings.apiToken}`)}`,
              payload: body
            })
          });
  
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Jira API responded with status ${response.status}`);
          }
          
          setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, logStatus: 'success' } : e));
          return { success: true };
        } catch (error) {
          console.error(`Failed to log work for ${entry.ticket}:`, error);
          setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, logStatus: 'error' } : e));
          return { success: false, ticket: entry.ticket, error: (error as Error).message };
        }
      });
  
      const results = await Promise.all(promises);
      const failures = results.filter(r => !r.success);

      if (failures.length > 0) {
        toast({
            variant: "destructive",
            title: "Some Worklogs Failed",
            description: `${failures.length} out of ${entries.length} entries failed to log.`,
        });
      } else {
        toast({
            title: "Worklog Submitted!",
            description: "All entries have been successfully logged to Jira.",
            className: "bg-accent text-accent-foreground border-accent",
        });
      }
  
      setIsLogging(false);
  };
  
  const StatusIcon = ({ status }: { status: LogStatus }) => {
    switch (status) {
      case 'logging':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Create Worklog</CardTitle>
          <CardDescription>
            Paste your worklog text below. Use the format:
            <code className="ml-2 bg-muted p-1 rounded-sm text-sm">
              TICKET-123: Did a thing (1h 30m)
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={worklogText}
            onChange={(e) => setWorklogText(e.target.value)}
            placeholder="JIRA-101: Implemented feature X (2h)&#10;JIRA-102: Fixed bug Y (45m)"
            rows={6}
            className="text-base"
          />
          <Button onClick={handleParse}>Parse Worklog</Button>
        </CardContent>

        {entries.length > 0 && (
          <>
            <CardHeader>
              <CardTitle>Parsed Worklog</CardTitle>
              <CardDescription>Review your entries before logging them to Jira.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[150px]">Ticket</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px] text-right">Time</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className={entry.logStatus === 'error' ? 'bg-destructive/10' : ''}>
                      <TableCell><StatusIcon status={entry.logStatus} /></TableCell>
                      <TableCell className="font-medium">{entry.ticket}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right">
                        {formatMinutesToTime(entry.timeSpentInMinutes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOpen(entry)}
                          disabled={isLogging}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          disabled={isLogging}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Badge variant="secondary" className="text-base">
                Total: {formatMinutesToTime(totalMinutes)}
              </Badge>
              <Button onClick={handleLogWork} disabled={isLogging || !isLoaded}>
                {isLogging ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLogging ? "Logging..." : "Log to Jira"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      {!isLoaded && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Loading Settings</AlertTitle>
          <AlertDescription>
            Loading your Jira configuration...
          </AlertDescription>
        </Alert>
      )}

      {isLoaded && !settings && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            Please configure your Jira credentials in the settings (top right corner) to log your work.
          </AlertDescription>
        </Alert>
      )}


      <Dialog open={!!editingEntry} onOpenChange={handleEditClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Worklog Entry</DialogTitle>
            <DialogDescription>
              Make changes to your worklog entry here.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="ticket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <TicketSuggester 
                description={editForm.watch('description')} 
                onTicketSelect={(ticket) => editForm.setValue('ticket', ticket)} 
              />
              <FormField
                control={editForm.control}
                name="timeSpent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Spent</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 1h 30m" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleEditClose}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
