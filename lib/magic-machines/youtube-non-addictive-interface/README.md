# YouTube Non-Addictive Interface

A distraction-free YouTube search and playback tool. No recommendations, no watch history, no sidebar rabbit holes — just search and watch.

## How it works

- Your API key lives in `localStorage`. It never leaves your browser.
- Calls go directly from your browser to Google's YouTube Data API v3.
- No backend. No tracking. No account required (though sign-in is optional).

## Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com/apis/credentials/wizard?api=youtube.googleapis.com)
2. Create a project → Enable **YouTube Data API v3** → Create an **API key**
3. Paste the key into the setup screen on first visit

Free quota: ~100 searches/day per key.

## Optional: Sign in with YouTube

Add an OAuth 2.0 Client ID to search your liked videos, subscriptions, and watch history. Same Google Console → Create OAuth 2.0 Client ID → Web application → add your page URL as an Authorized JavaScript origin.

## Route

Served at `/magic-machine/youtube-non-addictive-interface/`

## Author

Developed by [Adrian Botran](https://adrianfbotran.wixsite.com/portfolio), who struggles to not be distracted on the YouTube interface.
