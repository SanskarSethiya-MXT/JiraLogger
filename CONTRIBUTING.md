# Contributing to JiraLogger Pro

Thank you for your interest in contributing to JiraLogger Pro! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/JiraLogger.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Add your descriptive commit message"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Start the development server:
```bash
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code style (ESLint and Prettier configurations)
- Write meaningful commit messages
- Add comments for complex logic
- Use semantic variable and function names

## Testing

Before submitting a PR:

1. Ensure the app builds without errors:
```bash
npm run build
```

2. Run type checking:
```bash
npm run typecheck
```

3. Run linting:
```bash
npm run lint
```

4. Test the application manually to ensure your changes work as expected

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure all checks pass
- Keep PRs focused on a single feature or fix

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, Node version)

## Feature Requests

We welcome feature requests! Please:

- Check if the feature has already been requested
- Provide a clear use case
- Explain how it would benefit users
- Be open to discussion and feedback

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help create a positive community

Thank you for contributing! 🎉
