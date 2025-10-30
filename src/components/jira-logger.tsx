"use client";

/**
 * @file jira-logger.tsx
 * @description This file contains the main component for the JiraLogger application.
 * It allows users to parse worklog text, edit entries, and log them to Jira.
 * It includes features like tabbing by date, undo/redo functionality, and direct API interaction with Jira.
 */

import { useState, useRef, useMemo, Fragment, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatMinutesToTime, parseWorklog, parseTime, timeStringToMinutes, regenerateWorklogText } from "@/lib/parser";
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
import { Loader2, Trash2, Edit, AlertTriangle, CheckCircle, Clock, FileUp, Settings, Undo, Redo } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

type EntryWithFlag = WorklogEntry & { logStatus: LogStatus; alreadyLogged?: boolean; _token?: string };

// Single canonical entry type used for components - includes optional flags added by the UI
type EntryWithStatus = EntryWithFlag;

export function JiraLogger() {
  const { toast } = useToast();
  const [worklogText, setWorklogText] = useState("");
  const [entries, setEntries] = useState<EntryWithFlag[]>([]);
  const [editingEntry, setEditingEntry] = useState<EntryWithStatus | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null); // To track which button is loading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [activeTab, setActiveTab] = useState<string>("");

  const [history, setHistory] = useState<EntryWithFlag[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  
  const settingsForm = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      url: "",
      email: "",
      apiToken: "",
    },
  });

  // Prefill settings from server-side env if available. We intentionally do not
  // auto-fill the API token for security; we only indicate if one exists.
    // Load Jira settings from browser localStorage on mount and save them
    // automatically whenever the settings form changes. This keeps credentials
    // client-only and allows users to store them locally instead of using .env.
    useEffect(() => {
      try {
        const saved = localStorage.getItem('jiraSettings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.url) settingsForm.setValue('url', parsed.url);
          if (parsed.email) settingsForm.setValue('email', parsed.email);
          if (parsed.apiToken) settingsForm.setValue('apiToken', parsed.apiToken);
        }
      } catch (e) {
        // ignore malformed localStorage
      }
    }, []);

    // Auto-save settings to localStorage whenever they change.
    useEffect(() => {
    const subscription: any = settingsForm.watch((values) => {
        try {
          localStorage.setItem('jiraSettings', JSON.stringify(values));
        } catch (e) {
          // ignore storage errors (e.g., quota)
        }
      });

      return () => {
        // unsubscribe returned by react-hook-form watch
        // Some versions return a function directly, others an object with unsubscribe
        if (typeof subscription === 'function') {
          try { subscription(); } catch {}
        } else if (subscription && typeof subscription.unsubscribe === 'function') {
          try { subscription.unsubscribe(); } catch {}
        }
      };
    }, [settingsForm]);

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
  });

  const updateStateAndHistory = useCallback((newEntries: EntryWithFlag[]) => {
    setEntries(newEntries);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntries);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // helper: lightweight normalizer for token creation
  const hashString = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  
  // compute WL token: SHA-1 of date|ticket|minutes then first 8 hex chars (async)
  const computeWLToken = async (dateISO: string, ticket: string, minutes: number): Promise<string> => {
    const raw = `${dateISO}|${ticket}|${minutes}`;
    try {
      const enc = new TextEncoder();
      const data = enc.encode(raw);
      const hashBuffer = await (globalThis.crypto && globalThis.crypto.subtle ? globalThis.crypto.subtle.digest('SHA-1', data) : Promise.reject('no-subtle'));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hex.slice(0, 8);
    } catch (e) {
      // fallback djb2 hex
      let h = 5381;
      for (let i = 0; i < raw.length; i++) h = ((h << 5) + h) + raw.charCodeAt(i);
      const hex = (h >>> 0).toString(16).padStart(8, '0');
      return hex.slice(0, 8);
    }
  };

  // Extract hash/token from description text if present (format: [WL:hash] or [hash])
  const extractTokenFromDescription = (description: string): { cleanDescription: string; token: string | null } => {
    if (!description) return { cleanDescription: '', token: null };
    
    // Look for [WL:hash] or [hash] pattern (8 hex chars)
    const wlMatch = description.match(/\[WL:([0-9a-fA-F]{8})\]/);
    if (wlMatch) {
      const token = wlMatch[1].toLowerCase();
      const cleanDescription = description.replace(/\[WL:[0-9a-fA-F]{8}\]/g, '').trim();
      return { cleanDescription, token };
    }
    
    const hashMatch = description.match(/\[([0-9a-fA-F]{8})\]/);
    if (hashMatch) {
      const token = hashMatch[1].toLowerCase();
      const cleanDescription = description.replace(/\[([0-9a-fA-F]{8})\]/g, '').trim();
      return { cleanDescription, token };
    }
    
    return { cleanDescription: description, token: null };
  };

  // helper to extract plain text from Atlassian Document Format (ADF) comment objects
  const adfToText = (obj: any): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return obj.map(adfToText).join(' ');
    if (typeof obj === 'object') {
      if (obj.type === 'text' && typeof obj.text === 'string') return obj.text;
      if (obj.content && Array.isArray(obj.content)) return obj.content.map(adfToText).join(' ');
      // handle paragraph nodes which may have content
      if (obj.type === 'paragraph' && obj.content) return obj.content.map(adfToText).join(' ');
      // fallback: stringify small objects
      try { return JSON.stringify(obj); } catch { return '' }
    }
    return '';
  };

  useEffect(() => {
    if (entries.length > 0) {
      setWorklogText(regenerateWorklogText(entries));
    } else {
        setWorklogText("");
    }
  }, [entries]);

  const handleUndo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEntries(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEntries(history[newIndex]);
    }
  };

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


  const handleParse = async (textToParse: string) => {
    setIsParsing(true);
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
        updateStateAndHistory([]);
        setIsParsing(false);
        return;
      }

      // Attempt to detect already-logged work by querying Jira for worklogs in the date range.
      let credentials: any = null;
      try {
        const saved = localStorage.getItem('jiraSettings');
        if (saved) credentials = JSON.parse(saved);
      } catch {}

      const authHeader = credentials && credentials.email && credentials.apiToken ? `Basic ${btoa(`${credentials.email}:${credentials.apiToken}`)}` : null;

      // Determine date range from parsed entries
      const dates = parsedEntries.map(p => p.startTime).filter(Boolean) as Date[];
      let dateFrom: string | null = null;
      let dateTo: string | null = null;
      if (dates.length > 0) {
        const min = new Date(Math.min(...dates.map(d => d.getTime())));
        const max = new Date(Math.max(...dates.map(d => d.getTime())));
        const toYMD = (dt: Date) => dt.toISOString().split('T')[0];
        dateFrom = toYMD(min);
        dateTo = toYMD(max);
      }

      let jiraFetchedEntries: EntryWithFlag[] = [];
      if (authHeader && credentials.url && dateFrom && dateTo) {
        try {
          const res = await fetch('/api/jira/user-worklogs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jiraUrlBase: credentials.url, auth: authHeader, dateFrom, dateTo }),
          });
          if (res.ok) {
            const fetched = await res.json();
            // build a list of fetched entries with computed tokens
            const fetchedList: any[] = [];
            for (const [ticket, wlogs] of Object.entries(fetched)) {
              for (const w of (wlogs as any[])) {
                const start = w.started ? new Date(w.started) : null;
                const minutes = Math.round((w.timeSpentSeconds || 0) / 60);
                if (!start) continue;
                const end = new Date(start.getTime() + minutes * 60 * 1000);
                
                // Extract comment text (handle ADF objects) and detect WL marker like [WL:1a2b3c4d] or [1a2b3c4d]
                let commentText = '';
                if (w.comment && typeof w.comment === 'string') commentText = w.comment;
                else if (w.comment && typeof w.comment === 'object') commentText = adfToText(w.comment);
                
                let foundToken: string | undefined = undefined;
                if (commentText) {
                  let m = commentText.match(/\[WL:([0-9a-fA-F]{8})\]/);
                  if (!m) m = commentText.match(/\[([0-9a-fA-F]{8})\]/);
                  if (m) foundToken = m[1].toLowerCase();
                }
                
                const dateISO = start.toISOString().split('T')[0];
                const token = foundToken || await computeWLToken(dateISO, ticket, minutes);
                
                const entry = {
                  id: `jira-${w.id}`,
                  ticket,
                  description: commentText || '',
                  timeSpentInMinutes: minutes,
                  startTime: start,
                  endTime: end,
                  logStatus: 'success' as LogStatus,
                  alreadyLogged: true,
                  _token: token,
                } as EntryWithFlag;
                jiraFetchedEntries.push(entry);
                fetchedList.push({ ticket, id: w.id, started: w.started, minutes, token });
              }
            }
            if (process.env.NODE_ENV !== 'production') {
              console.log('[FETCHED] Jira worklogs with tokens:', fetchedList);
            }
          }
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('[FETCH ERROR]', e);
          }
        }
      }

      // Process parsed entries: extract tokens from description if present, otherwise compute
      const merged: EntryWithFlag[] = [];
      const markUsed = new Set<string>();

      for (const p of parsedEntries) {
        const entry: EntryWithFlag = { ...p, logStatus: 'pending' as LogStatus, alreadyLogged: false };
        
        // Check if description has a token embedded (from previously logged work that was copied)
        const { cleanDescription, token: embeddedToken } = extractTokenFromDescription(p.description);
        
        // Compute or use embedded token
        const pDateISO = p.startTime ? p.startTime.toISOString().split('T')[0] : '';
        let pToken: string;
        
        if (embeddedToken) {
          pToken = embeddedToken;
          entry.description = cleanDescription; // Use clean description without token
        } else {
          pToken = await computeWLToken(pDateISO, p.ticket, p.timeSpentInMinutes);
        }
        
        entry._token = pToken;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[PARSED]', { 
            id: entry.id, 
            ticket: entry.ticket, 
            date: pDateISO, 
            minutes: entry.timeSpentInMinutes, 
            token: entry._token,
            embeddedToken: !!embeddedToken 
          });
        }

        // Try to match with fetched entries
        let matched = false;
        for (const f of jiraFetchedEntries) {
          if (markUsed.has(f.id)) continue;
          if (f.ticket !== p.ticket) continue;
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('[COMPARE]', { 
              parsedId: entry.id, 
              fetchedId: f.id, 
              parsedToken: entry._token, 
              fetchedToken: f._token,
              ticket: p.ticket
            });
          }
          
          // Primary: exact token match
          if (f._token && entry._token && f._token === entry._token) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[MATCH] Exact token match', { 
                parsedToken: entry._token, 
                fetchedToken: f._token, 
                ticket: p.ticket 
              });
            }
            entry.alreadyLogged = true;
            entry.logStatus = 'success' as LogStatus;
            markUsed.add(f.id);
            matched = true;
            break;
          }
          
          // Secondary: heuristic matching (same date, same duration, similar time or description)
          const pStart = p.startTime ? p.startTime.getTime() : null;
          const fStart = f.startTime ? f.startTime.getTime() : null;
          
          if (pStart && fStart && pDateISO === f.startTime?.toISOString().split('T')[0]) {
            const deltaMs = Math.abs(pStart - fStart);
            const deltaMinutes = deltaMs / (60 * 1000);
            const timeDeltaMinutes = Math.abs(p.timeSpentInMinutes - f.timeSpentInMinutes);
            
            // Normalize descriptions for comparison
            const pDesc = hashString(p.description || '');
            const fDesc = hashString(f.description || '');
            const descriptionMatch = pDesc && fDesc && (pDesc.includes(fDesc) || fDesc.includes(pDesc) || pDesc === fDesc);
            
            // Match if: same duration AND (start within 30min OR similar description)
            if (timeDeltaMinutes <= 2 && (deltaMinutes <= 30 || descriptionMatch)) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('[MATCH] Heuristic match', { 
                  ticket: p.ticket,
                  deltaMinutes: Math.round(deltaMinutes),
                  timeDeltaMinutes,
                  descriptionMatch
                });
              }
              entry.alreadyLogged = true;
              entry.logStatus = 'success' as LogStatus;
              markUsed.add(f.id);
              matched = true;
              break;
            }
          }
        }
        
        merged.push(entry);
      }

      // Add any fetched entries that were not matched to parsed entries (show as alreadyLogged)
      for (const f of jiraFetchedEntries) {
        if (!markUsed.has(f.id)) {
          merged.push(f);
        }
      }

      // Sort merged by startTime
      merged.sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0));

      updateStateAndHistory(merged);

      const alreadyLoggedCount = merged.filter(e => e.alreadyLogged).length;
      const newEntriesCount = merged.filter(e => !e.alreadyLogged).length;

      toast({
        title: "Parsing Successful",
        description: `Found ${parsedEntries.length} entries in text. ${alreadyLoggedCount} already logged, ${newEntriesCount} new.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Parsing Error",
        description: "An unexpected error occurred during parsing.",
      });
      console.error(error);
    } finally {
      setIsParsing(false);
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

    const timeSpentInMinutes = timeStringToMinutes(values.timeSpent);
    let newEntries = [...entries];
    const entryIndex = newEntries.findIndex(e => e.id === editingEntry.id);
    
    if (entryIndex !== -1) {
        newEntries[entryIndex] = {
            ...newEntries[entryIndex],
            ticket: values.ticket,
            description: values.description,
            timeSpentInMinutes: timeSpentInMinutes,
        };
    }

    const recalculatedEntries = recalculateEntryTimes(newEntries, dayStartTime);
    updateStateAndHistory(recalculatedEntries);

    handleEditClose();
    toast({ title: "Entry Updated" });
  };


  const handleDelete = (id: string) => {
    const newEntries = entries.filter(e => e.id !== id);
    const recalculatedEntries = recalculateEntryTimes(newEntries, dayStartTime);
    updateStateAndHistory(recalculatedEntries);
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


  const handleLogWork = async (entriesToLog: EntryWithFlag[], buttonId: string) => {
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
        if (entry.alreadyLogged) {
          // Skip entries already logged
          return { success: true, skipped: true };
        }
        if (!entry.startTime) {
          console.error(`Skipping entry ${entry.ticket} due to missing start time.`);
          return { success: false, ticket: entry.ticket, error: "Missing start time" };
        }
        try {
          setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, logStatus: 'logging' } : e));

          const timeSpentInSeconds = entry.timeSpentInMinutes * 60;
          const started = format(entry.startTime, "yyyy-MM-dd'T'HH:mm:ss.SSSxx");
          
          // append token in square brackets so the created worklog can be detected later
          const tokenSuffix = entry._token ? ` [${entry._token}]` : '';
          const commentWithHash = `${entry.description || ''}${tokenSuffix}`;
          const body = JSON.stringify({
            comment: commentWithHash,
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
                  <p className="text-sm text-muted-foreground mb-4">
                      Enter your Jira credentials to log your work. These are not saved.
                  </p>
                  <Form {...settingsForm}>
                      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-4">
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
                        </div>
                        <div className="space-y-4">
                          <FormItem>
                            <Label htmlFor="start-time">Day Start Time</Label>
                            <Input 
                              id="start-time"
                              type="time" 
                              value={dayStartTime} 
                              onChange={e => setDayStartTime(e.target.value)}
                              className="w-full"
                            />
                             <p className="text-sm text-muted-foreground">
                              Set the start time for your workday to ensure accurate log timestamps.
                            </p>
                          </FormItem>
                        </div>
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
              TICKET-123: Description: 1h 30m
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
            <Button onClick={() => handleParse(worklogText)} disabled={isParsing}>
              {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isParsing ? "Parsing..." : "Parse Worklog"}
            </Button>
            <Button variant="outline" onClick={handleUploadClick} disabled={isParsing}>
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
              <CardDescription>
                Review your entries before logging them to Jira.
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <strong>{entries.filter(e => e.alreadyLogged).length}</strong> already logged
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <strong>{entries.filter(e => !e.alreadyLogged).length}</strong> to be logged
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo}>
                      <Undo className="mr-2 h-4 w-4" /> Undo
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRedo} disabled={!canRedo}>
                      <Redo className="mr-2 h-4 w-4" /> Redo
                  </Button>
              </div>
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
                          <TableHead className="text-right w-[120px]">Time</TableHead>
                          <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.entries.map((entry) => (
                          <TableRow 
                            key={entry.id} 
                            className={
                              entry.logStatus === 'error' ? 'bg-destructive/10' : 
                              entry.alreadyLogged ? 'bg-green-50 dark:bg-green-950/20' : ''
                            }
                          >
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
                            <TableCell>
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  {entry.description}
                                  <div className="mt-1 flex items-center gap-2 text-xs">
                                    {entry.alreadyLogged && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-green-700 dark:text-green-400 font-medium">
                                        <CheckCircle className="h-3 w-3" />
                                        Already logged
                                      </span>
                                    )}
                                    {!entry.alreadyLogged && entry.logStatus === 'pending' && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-yellow-700 dark:text-yellow-400 font-medium">
                                        <Clock className="h-3 w-3" />
                                        Not logged
                                      </span>
                                    )}
                                    {entry._token && process.env.NODE_ENV !== 'production' && (
                                      <span className="text-muted-foreground font-mono">
                                        [{entry._token}]
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatMinutesToTime(entry.timeSpentInMinutes)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditOpen(entry)}
                                  disabled={isLogging || entry.alreadyLogged}
                                  className="h-8 w-8"
                                  title={entry.alreadyLogged ? "Cannot edit logged entries" : "Edit entry"}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(entry.id)}
                                  disabled={isLogging || entry.alreadyLogged}
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  title={entry.alreadyLogged ? "Cannot delete logged entries" : "Delete entry"}
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
                          <TableCell className="text-right font-bold whitespace-nowrap">{formatMinutesToTime(group.totalMinutes)}</TableCell>
                            <TableCell className="text-right">
                              <Button onClick={() => handleLogWork(group.entries.filter(e => !e.alreadyLogged), date)} disabled={isLogging} size="sm">
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
              <Button onClick={() => handleLogWork(entries.filter(e => !e.alreadyLogged), 'all')} disabled={isLogging} size="lg">
                {isLogging && loggingId === 'all' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLogging && loggingId === 'all' ? "Logging..." : `Log All ${entries.filter(e => !e.alreadyLogged).length} Entries`}
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
