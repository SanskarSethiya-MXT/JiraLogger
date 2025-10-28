"use client";

import { useState, useRef, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Edit, AlertTriangle, CheckCircle, Clock, FileUp, Settings } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TicketSuggester } from "@/components/ticket-suggester";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const editFormSchema = z.object({
  ticket: z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/, "Invalid Jira ticket format"),
  description: z.string().min(1, "Description cannot be empty"),
  timeSpent: z.string().min(1, "Time spent cannot be empty"),
});

const settingsFormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid Jira URL." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  apiToken: z.string().min(1, { message: "API token cannot be empty." }),
});

type LogStatus = "pending" | "logging" | "success" | "error";

type EntryWithStatus = WorklogEntry & { logStatus: LogStatus };

export function JiraLogger() {
  const { toast } = useToast();
  const { settings, saveSettings, isLoaded } = useJiraSettings();
  const [worklogText, setWorklogText] = useState("");
  const [entries, setEntries] = useState<EntryWithStatus[]>([]);
  const [editingEntry, setEditingEntry] = useState<EntryWithStatus | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dayStartTime, setDayStartTime] = useState("09:00");
  
  const settingsForm = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      url: "",
      email: "",
      apiToken: "",
    },
    disabled: !isLoaded,
  });

  useEffect(() => {
    if (isLoaded && settings) {
      settingsForm.reset(settings);
    }
  }, [isLoaded, settings, settingsForm]);

  function onSettingsSubmit(values: z.infer<typeof settingsFormSchema>) {
    saveSettings(values);
    toast({
      title: "Settings Saved",
      description: "Your Jira credentials have been updated.",
    });
  }

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
  });

  const handleParse = (textToParse: string) => {
    try {
      const parsedEntries = parseWorklog(textToParse, dayStartTime);
      if (parsedEntries.length === 0) {
        if (textToParse.trim()) { // only show error if there was text to parse
            toast({
                variant: "destructive",
                title: "Parsing Failed",
                description: "No valid worklog entries found. Check your format.",
            });
        }
        setEntries([]);
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
    
    const textForReparsing = entries.map((e) => {
        if (e.id === editingEntry.id) {
            return `${values.ticket}: ${values.description} ${values.timeSpent}`;
        }
        return `${e.ticket}: ${e.description} ${formatMinutesToTime(e.timeSpentInMinutes)}`;
    }).join('\n');

    handleParse(textForReparsing);

    handleEditClose();
    toast({ title: "Entry Updated" });
  };

  const handleDelete = (id: string) => {
    const newEntries = entries.filter((e) => e.id !== id);
    const updatedText = newEntries.map(e => `${e.ticket}: ${e.description} ${formatMinutesToTime(e.timeSpentInMinutes)}`).join('\n');
    handleParse(updatedText);
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
        if (!entry.startTime) {
          console.error(`Skipping entry ${entry.ticket} due to missing start time.`);
          return { success: false, ticket: entry.ticket, error: "Missing start time" };
        }
        try {
          setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, logStatus: 'logging' } : e));

          const timeSpentInSeconds = entry.timeSpentInMinutes * 60;
          const started = format(entry.startTime, "yyyy-MM-dd'T'HH:mm:ss.SSSZZ");
          
          const body = JSON.stringify({
            comment: entry.description,
            timeSpentSeconds: timeSpentInSeconds,
            started: started,
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setWorklogText(text);
        handleParse(text);
      };
      reader.readAsText(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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
        <Accordion type="single" collapsible className="w-full" defaultValue={!settings ? "item-1" : undefined}>
            <AccordionItem value="item-1">
                <AccordionTrigger className="px-6">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        <span className="font-semibold">Jira Settings</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pt-2">
                <p className="text-sm text-muted-foreground mb-4">
                    Enter your Jira credentials to log your work. Your credentials are saved only in your browser.
                </p>
                <Form {...settingsForm}>
                    <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                        <FormField
                        control={settingsForm.control}
                        name="url"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Jira URL</FormLabel>
                            <FormControl>
                                <Input placeholder="https://your-company.atlassian.net" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={settingsForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={settingsForm.control}
                        name="apiToken"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>API Token</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Your Jira API Token" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" disabled={settingsForm.formState.isSubmitting}>
                            Save Settings
                        </Button>
                    </form>
                </Form>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        
        <CardHeader>
          <CardTitle>Create Worklog</CardTitle>
          <CardDescription>
            Paste your worklog text below or upload a .txt file. The format is:
            <code className="ml-2 bg-muted p-1 rounded-sm text-sm">
              TICKET-123: Description 1h 30m
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Textarea
              value={worklogText}
              onChange={(e) => setWorklogText(e.target.value)}
              placeholder="16-10-2025 Thursday&#10;    MOL-1099: discussion with Mounir and looked into logs: 1h&#10;    MXT-5573 (Internal meeting): Madhusheree assisted with using VSCode: 1h 30m"
              rows={8}
              className="text-base md:col-span-3"
            />
             <div className="space-y-2">
                <Label htmlFor="start-time">Day Start Time</Label>
                <Input 
                  id="start-time"
                  type="time" 
                  value={dayStartTime} 
                  onChange={e => setDayStartTime(e.target.value)}
                />
                 <p className="text-sm text-muted-foreground">
                    Set this before parsing to calculate correct start times for each entry.
                </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleParse(worklogText)}>Parse Worklog</Button>
            <Button variant="outline" onClick={handleUploadClick}>
              <FileUp className="mr-2 h-4 w-4" />
              Upload .txt file
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt"
              className="hidden"
            />
          </div>
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
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[150px]">Ticket</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px]">Start Time</TableHead>
                    <TableHead className="w-[120px]">End Time</TableHead>
                    <TableHead className="w-[100px] text-right">Time</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className={entry.logStatus === 'error' ? 'bg-destructive/10' : ''}>
                      <TableCell><StatusIcon status={entry.logStatus} /></TableCell>
                      <TableCell>
                        {entry.startTime ? format(entry.startTime, "dd-MM-yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">{entry.ticket}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                       <TableCell>
                        {entry.startTime ? format(entry.startTime, "HH:mm") : "N/A"}
                      </TableCell>
                      <TableCell>
                        {entry.endTime ? format(entry.endTime, "HH:mm") : "N/A"}
                      </TableCell>
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
            Please configure your Jira credentials in the settings to log your work.
          </AlertDescription>
        </Alert>
      )}


      <Dialog open={!!editingEntry} onOpenChange={(isOpen) => !isOpen && handleEditClose()}>
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
