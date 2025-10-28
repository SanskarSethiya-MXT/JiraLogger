# JiraLogger Pro - Deployment Guide

This guide covers different deployment options for JiraLogger Pro.

## Option 1: Deploy as Jira Forge Plugin (Recommended for Jira Integration)

### Prerequisites
- Atlassian account with Jira access
- Forge CLI installed globally
- Node.js 18+ installed

### Step 1: Install Forge CLI
```bash
npm install -g @forge/cli
```

### Step 2: Login to Forge
```bash
forge login
```

### Step 3: Update manifest.yml
1. Open `manifest.yml`
2. Replace `YOUR_APP_ID_HERE` with your actual app ID (you'll get this after registration)

### Step 4: Register Your App (First Time Only)
```bash
forge register
```

This will generate a unique app ID. Update `manifest.yml` with this ID.

### Step 5: Build the Application
```bash
npm install
npm run build
```

### Step 6: Deploy to Forge
```bash
forge deploy
```

### Step 7: Install on Jira Instance
```bash
forge install
```

Follow the prompts to select your Jira site.

### Step 8: Access the App
- Go to your Jira instance
- Navigate to any project
- Look for "JiraLogger Pro" in the project sidebar or apps menu

### Updating the App
After making changes:
```bash
npm run build
forge deploy
```

### View Logs
```bash
forge logs
```

## Option 2: Deploy as Standalone Web App

### Vercel Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Configure:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add environment variables if needed
6. Deploy!

### Netlify Deployment

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Import your repository
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Deploy!

### Self-Hosted Deployment

#### Using PM2
```bash
npm install
npm run build

# Install PM2
npm install -g pm2

# Start the app
pm2 start npm --name "jiralogger-pro" -- start

# View logs
pm2 logs jiralogger-pro

# Restart
pm2 restart jiralogger-pro
```

#### Using Docker
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t jiralogger-pro .
docker run -p 3000:3000 jiralogger-pro
```

## Option 3: Local Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Access at `http://localhost:9002`

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
# For AI features (optional)
GOOGLE_GENAI_API_KEY=your_api_key_here

# For standalone deployment (if not using Forge)
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_api_token

NODE_ENV=production
```

### Jira API Token (for standalone deployment)
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token and add to `.env.local`

## Permissions Required

For Jira integration, the app requires:
- **write:jira-work** - To create worklog entries
- **read:jira-work** - To read existing worklogs
- **read:jira-user** - To access user information

## Troubleshooting

### Forge Deployment Issues

**Error: "App not registered"**
```bash
forge register
```

**Error: "Permission denied"**
- Check your Jira admin permissions
- Verify the scopes in `manifest.yml`

### Build Issues

**TypeScript errors**
```bash
npm run typecheck
```

**Dependency issues**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Runtime Issues

**Cannot connect to Jira**
- Verify your Jira URL is correct
- Check API token is valid
- Ensure network/firewall allows connections

**Forge bridge errors**
- Make sure you're running in Forge environment
- Check Forge CLI is up to date: `forge upgrade`

## Performance Optimization

### Production Build
```bash
NODE_ENV=production npm run build
```

### Analyzing Bundle Size
```bash
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

## Security Considerations

1. **Never commit** `.env.local` or `.env` files
2. **Rotate** API tokens regularly
3. **Use** environment-specific configurations
4. **Enable** HTTPS in production
5. **Review** Forge permissions regularly

## Monitoring

### Forge App
```bash
forge logs --follow
```

### Standalone App
Use services like:
- Vercel Analytics
- Google Analytics
- Sentry for error tracking

## Support

For issues and questions:
- GitHub Issues: https://github.com/SanskarSethiya-MXT/JiraLogger/issues
- Forge Documentation: https://developer.atlassian.com/platform/forge/

## Next Steps

After deployment:
1. Test all features thoroughly
2. Configure user permissions
3. Document any custom configurations
4. Set up monitoring and logging
5. Train users on how to use the app

---

**Note**: For Jira plugin deployment, you need to be a Jira administrator or have appropriate permissions to install Forge apps.
