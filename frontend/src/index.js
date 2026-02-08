import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import * as Sentry from '@sentry/react';
import { datadogRum } from '@datadog/browser-rum';
import LogRocket from 'logrocket';
import App from './App';
import './index.css';

const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.REACT_APP_SENTRY_ENV || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || 0.1)
  });
}

const ddApplicationId = process.env.REACT_APP_DD_APPLICATION_ID;
const ddClientToken = process.env.REACT_APP_DD_CLIENT_TOKEN;
if (ddApplicationId && ddClientToken) {
  datadogRum.init({
    applicationId: ddApplicationId,
    clientToken: ddClientToken,
    site: process.env.REACT_APP_DD_SITE || 'datadoghq.com',
    service: process.env.REACT_APP_DD_SERVICE || 'skillforge-ai-frontend',
    env: process.env.REACT_APP_DD_ENV || process.env.NODE_ENV,
    version: process.env.REACT_APP_DD_VERSION,
    sampleRate: Number(process.env.REACT_APP_DD_SAMPLE_RATE || 100),
    sessionReplaySampleRate: Number(process.env.REACT_APP_DD_SESSION_REPLAY_SAMPLE_RATE || 20),
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    defaultPrivacyLevel: 'mask-user-input'
  });

  datadogRum.startSessionReplayRecording();
}

const logrocketId = process.env.REACT_APP_LOGROCKET_ID;
if (logrocketId) {
  LogRocket.init(logrocketId, {
    release: process.env.REACT_APP_LOGROCKET_RELEASE
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          },
          success: {
            iconTheme: {
              primary: 'hsl(var(--primary))',
              secondary: 'hsl(var(--primary-foreground))',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#ffffff',
              border: '1px solid #b91c1c',
            },
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'hsl(var(--destructive-foreground))',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
