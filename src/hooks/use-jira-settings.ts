"use client";

import { useState, useEffect, useCallback } from "react";
import type { JiraSettings } from "@/types";

const SETTINGS_KEY = "jiraLoggerProSettings";

export function useJiraSettings() {
  const [settings, setSettings] = useState<JiraSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(SETTINGS_KEY);
      if (item) {
        setSettings(JSON.parse(item));
      }
    } catch (error) {
      console.error("Failed to load Jira settings from localStorage", error);
      setSettings(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveSettings = useCallback((newSettings: JiraSettings) => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save Jira settings to localStorage", error);
    }
  }, []);

  return { settings, saveSettings, isLoaded };
}
