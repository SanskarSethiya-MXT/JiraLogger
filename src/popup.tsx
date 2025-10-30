import React from 'react';
import ReactDOM from 'react-dom/client';
import { JiraLoggerExtension } from './components/jira-logger-extension';
import './app/globals.css';
import './popup.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <JiraLoggerExtension />
  </React.StrictMode>
);
