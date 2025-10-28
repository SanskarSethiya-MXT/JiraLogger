# Local Development Guide for JiraLogger Pro

## Running with Forge Tunnel (Recommended)

Since JiraLogger Pro uses Atlassian Forge with Custom UI, you need to run it through Forge tunneling to test locally.

### Prerequisites

1. Install Forge CLI globally:
```powershell
npm install -g @forge/cli
```

2. Login to Forge:
```powershell
forge login
```

3. Make sure you have a Jira site for testing

### Steps to Run Locally

#### 1. Register the App (First Time Only)

```powershell
forge register
```

This will generate an app ID. Copy it and update `manifest.yml`:
- Replace `YOUR_APP_ID_HERE` with your actual app ID

#### 2. Install Dependencies

```powershell
npm install
```

#### 3. Start the Next.js Development Server

In one terminal window:
```powershell
npm run dev
```

This starts the Next.js server on `http://localhost:9002`

#### 4. Start Forge Tunnel

In a **separate** terminal window:
```powershell
forge tunnel
```

This command:
- Creates a tunnel from Atlassian's servers to your local Next.js dev server
- Allows you to test your Custom UI app in a real Jira environment
- Hot-reloads when you make changes

#### 5. Access Your App

After running `forge tunnel`, it will ask you to install the app to a Jira site. Follow the prompts, then:

1. Go to your Jira site
2. Navigate to any project
3. Look for "JiraLogger Pro" in the apps menu or project sidebar
4. The app will load from your local dev server!

### Important Notes

- **Both servers must run simultaneously**: `npm run dev` AND `forge tunnel`
- Any changes to your code will hot-reload automatically
- The Forge tunnel forwards requests to `http://localhost:9002`
- Press `Ctrl+C` in the tunnel terminal to stop tunneling

### Alternative: Deploy and Test

If you don't want to use tunneling, you can deploy:

```powershell
# Build the app
npm run build

# Deploy to Forge
forge deploy

# Install to Jira site
forge install
```

Then access it directly in Jira (no local dev server needed).

### Troubleshooting

**Error: "Unable to establish a connection with the Custom UI bridge"**
- This means you're trying to access `http://localhost:9002` directly in your browser
- Solution: Use `forge tunnel` and access via Jira

**Error: "App not registered"**
- Run `forge register` first
- Update the app ID in `manifest.yml`

**Port already in use**
- Change the port in `package.json`: `"dev": "next dev --turbopack -p 9003"`
- Make sure to update any port references

**Tunnel disconnects**
- Check your internet connection
- Restart the tunnel: `forge tunnel`

### Development Workflow

1. Make code changes in your editor
2. Changes auto-reload in both Next.js dev server and Forge tunnel
3. Refresh Jira page to see updates
4. Check browser console and terminal for errors

### Viewing Logs

```powershell
# In another terminal
forge logs
```

This shows runtime logs from your Forge app.

## Quick Start Commands

```powershell
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Forge tunnel
forge tunnel

# Terminal 3 (optional): View logs
forge logs
```

Happy coding! 🚀
