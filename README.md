# Spotlight Fame Simulator

Spotlight is a fictional fame/life simulator built as a social-first web app. The main experience is an Instagram/Twitter-style feed with a persistent world underneath it: time, fame, relationships, DMs/SMS, calendar, finances, travel, and AI-controlled characters.

This repository is the permanent source for the Spotlight Netlify project.

## Current build

- Social-first feed and profiles
- Text-first posts with occasional image media
- Threaded replies and character-to-character interactions
- DMs, SMS, Calendar and Finances
- Persistent time, fame, energy, relationship and world state
- Netlify serverless AI agent at `/api/agent`
- GPT-5.6 Luna for social simulation and GPT-5.6 Sol reserved for deeper activity scenes

## Local development

```bash
npm install
npm run dev
```

## Netlify

The repository is intended to deploy to the existing `spotlight-fame-sim` Netlify project. Netlify publishes the `public` directory and serves the AI agent from `netlify/functions/agent.mts`.
