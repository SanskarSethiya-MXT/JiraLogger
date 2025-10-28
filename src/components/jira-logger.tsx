"use client";

import { useState, useRef, useMemo, Fragment, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatMinutesToTime, parseWorklog, parseTime, timeStringToMinutes, regenerateWorklogText } from "@/lib/parser";
import type { WorklogEntry, JiraSettings } from "@/types";
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
  TableFooter as UiTableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { format, addMinutes } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


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
  const [worklogText, setWorklogText] = useState("");
  const [entries, setEntries] = useState<EntryWithStatus[]>([]);
  const [editingEntry, setEditingEntry] = useState<EntryWithStatus | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null); // To track which button is loading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [activeTab, setActiveTab] = useState<string>("");
  
  const settingsForm = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      url: "",
      email: "",
      apiToken: "",
    },
  });

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
  });

  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const dateKey = entry.startTime ? format(entry.startTime, "dd-MM-yyyy") : 'Invalid Date';
      if (!acc[dateKey]) {
        acc[dateKey] = { entries: [], totalMinutes: 0 };
      }
      acc[dateKey].entries.push(entry);
      acc[dateKey].totalMinutes += entry.timeSpentInMinutes;
      return acc;
    }, {} as Record<string, { entries: EntryWithStatus[], totalMinutes: number }>);
  }, [entries]);

  useEffect(() => {
    const dates = Object.keys(groupedEntries);
    if (dates.length > 0 && !dates.includes(activeTab)) {
      setActiveTab(dates[0]);
    } else if (dates.length === 0) {
      setActiveTab("");
    }
  }, [groupedEntries, activeTab]);


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

    setEntries(prevEntries => {
        const timeSpentInMinutes = timeStringToMinutes(values.timeSpent);
        let newEntries = [...prevEntries];
        const entryIndex = newEntries.findIndex(e => e.id === editingEntry.id);
        
        if (entryIndex !== -1) {
            newEntries[entryIndex] = {
                ...newEntries[entryIndex],
                ticket: values.ticket,
                description: values.description,
                timeSpentInMinutes: timeSpentInMinutes,
            };
        }

        // Recalculate times for all entries
        const recalculatedEntries = recalculateEntryTimes(newEntries, dayStartTime);
        setWorklogText(regenerateWorklogText(recalculatedEntries));
        return recalculatedEntries;
    });

    handleEditClose();
    toast({ title: "Entry Updated" });
  };


  const handleDelete = (id: string, dateKey: string) => {
    setEntries(prevEntries => {
        const newEntries = prevEntries.filter(e => e.id !== id);
        
        // Recalculate times for all entries
        const recalculatedEntries = recalculateEntryTimes(newEntries, dayStartTime);
        setWorklogText(regenerateWorklogText(recalculatedEntries));
        return recalculatedEntries;
    });
    toast({ title: "Entry Removed" });
  };
  
  const recalculateEntryTimes = (allEntries: EntryWithStatus[], startTimeStr: string): EntryWithStatus[] => {
    const entriesByDate: Record<string, EntryWithStatus[]> = allEntries.reduce((acc, entry) => {
        const dateKey = entry.startTime ? format(entry.startTime, "dd-MM-yyyy") : 'Invalid Date';
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(entry);
        return acc;
    }, {} as Record<string, EntryWithStatus[]>);

    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    let finalEntries: EntryWithStatus[] = [];

    Object.keys(entriesByDate).sort().forEach(dateKey => {
        let currentLogTime = parseTime(dateKey, startHour, startMinute);
        const dayEntries = entriesByDate[dateKey];

        const updatedDayEntries = dayEntries.map(entry => {
            const startTime = new Date(currentLogTime);
            const endTime = addMinutes(startTime, entry.timeSpentInMinutes);
            currentLogTime = endTime;
            return { ...entry, startTime, endTime };
        });
        finalEntries.push(...updatedDayEntries);
    });

    return finalEntries;
  }


  const handleLogWork = async (entriesToLog: EntryWithStatus[], buttonId: string) => {
    const settings = settingsForm.getValues();
    const isValid = await settingsForm.trigger();

    if (!isValid) {
        toast({
          variant: "destructive",
          title: "Jira Settings Invalid",
          description: "Please check your Jira credentials in the settings section.",
        });
        return;
    }
  
      setIsLogging(true);
      setLoggingId(buttonId);
  
      const promises = entriesToLog.map(async (entry) => {
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
            description: `${failures.length} out of ${entriesToLog.length} entries failed to log.`,
        });
      } else {
        toast({
            title: "Worklog Submitted!",
            description: "All entries have been successfully logged to Jira.",
            className: "bg-accent text-accent-foreground border-accent",
        });
      }
  
      setIsLogging(false);
      setLoggingId(null);
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

  const isSettingsEmpty = !settingsForm.watch('url') && !settingsForm.watch('email') && !settingsForm.watch('apiToken');

  return (
    <>
      <Card>
        <Accordion type="single" collapsible className="w-full" defaultValue={isSettingsEmpty ? "item-1" : undefined}>
            <AccordionItem value="item-1">
                <AccordionTrigger className="px-6">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        <span className="font-semibold">Jira Settings</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Enter your Jira credentials to log your work. These are not saved.
                    </p>
                    <Form {...settingsForm}>
                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
                        </form>
                    </Form>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="start-time">Day Start Time</Label>
                      <Input 
                        id="start-time"
                        type="time" 
                        value={dayStartTime} 
                        onChange={e => setDayStartTime(e.target.value)}
                        className="w-min"
                      />
                      <p className="text-sm text-muted-foreground">
                          Set this before parsing to calculate correct start times for each entry. It defaults to 09:00.
                      </p>
                  </div>
                </div>
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
          <div className="grid">
            <Textarea
              value={worklogText}
              onChange={(e) => setWorklogText(e.target.value)}
              placeholder={`16-10-2025 Thursday
    PROJ-123: Feature development and testing: 2h 30m
    TEAM-456 (Team Meeting): Daily stand-up and planning: 15m
    BUG-789: Investigated and fixed a critical bug: 1h
Total: 3h 45m

17-10-2025 Friday
    PROJ-124: Code review for new feature: 1h
    SUPPORT-88: Assisted customer with a login issue: 30m
Total: 1h 30m`}
              rows={10}
              className="text-base"
            />
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
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  {Object.keys(groupedEntries).map(date => (
                    <TabsTrigger key={date} value={date}>
                      {date}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(groupedEntries).map(([date, group]) => (
                  <TabsContent key={date} value={date}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead className="w-[120px]">Date</TableHead>
                          <TableHead className="w-[120px]">Start Time</TableHead>
                          <TableHead className="w-[120px]">End Time</TableHead>
                          <TableHead className="w-[150px]">Ticket</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px] text-right">Time</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.entries.map((entry) => (
                          <TableRow key={entry.id} className={entry.logStatus === 'error' ? 'bg-destructive/10' : ''}>
                            <TableCell><StatusIcon status={entry.logStatus} /></TableCell>
                             <TableCell>
                              {entry.startTime ? format(entry.startTime, "dd-MM-yyyy") : "N/A"}
                            </TableCell>
                            <TableCell>
                              {entry.startTime ? format(entry.startTime, "HH:mm") : "N/A"}
                            </TableCell>
                            <TableCell>
                              {entry.endTime ? format(entry.endTime, "HH:mm") : "N/A"}
                            </TableCell>
                            <TableCell className="font-medium">{entry.ticket}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right">
                              {formatMinutesToTime(entry.timeSpentInMinutes)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditOpen(entry)}
                                  disabled={isLogging}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(entry.id, date)}
                                  disabled={isLogging}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <UiTableFooter>
                        <TableRow>
                          <TableCell colSpan={6} className="font-bold">Total:</TableCell>
                          <TableCell className="text-right font-bold">{formatMinutesToTime(group.totalMinutes)}</TableCell>
                          <TableCell className="text-right">
                            <Button onClick={() => handleLogWork(group.entries, date)} disabled={isLogging} size="sm">
                              {isLogging && loggingId === date ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Log Day
                            </Button>
                          </TableCell>
                        </TableRow>
                      </UiTableFooter>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
              <Button onClick={() => handleLogWork(entries, 'all')} disabled={isLogging} size="lg">
                {isLogging && loggingId === 'all' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLogging && loggingId === 'all' ? "Logging..." : `Log All ${entries.length} Entries`}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      {isSettingsEmpty && !isLogging && entries.length === 0 && (
        <Alert variant="default" className="mt-4 border-primary">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            Please configure your Jira credentials in the settings above to log your work.
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
