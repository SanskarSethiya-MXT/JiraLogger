"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { useJiraSettings } from "@/hooks/use-jira-settings";
import { useState, useEffect } from "react";

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid Jira URL." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  apiToken: z.string().min(1, { message: "API token cannot be empty." }),
});

export function SettingsDialog() {
  const { settings, saveSettings, isLoaded } = useJiraSettings();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      email: "",
      apiToken: "",
    },
    disabled: !isLoaded,
  });
  
  useEffect(() => {
    if (settings) {
      form.reset({
        url: settings.url || "",
        email: settings.email || "",
        apiToken: settings.apiToken || "",
      });
    }
  }, [settings, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    saveSettings(values);
    toast({
      title: "Settings Saved",
      description: "Your Jira credentials have been updated.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Jira Settings</DialogTitle>
          <DialogDescription>
            Enter your Jira credentials to log your work. Your credentials are
            saved only in your browser.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save Settings
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
