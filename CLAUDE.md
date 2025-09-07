# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Podcaster Blaster** - A web application that extracts transcripts from YouTube videos and generates AI-powered analysis including key takeaways, tools/companies mentioned, and interesting quotes with timestamps.

**Tech Stack**: React + Vite frontend, Node.js + Express backend, MongoDB database, Claude API for analysis
**Full Specification**: See `spec/technical-specification.md` for complete requirements and architecture details

## Development Best Practices

### Code Quality Standards
- **Follow Existing Patterns**: Always examine existing code structure, naming conventions, and architectural patterns before implementing new features
- **TypeScript Usage**: Use TypeScript for type safety across both frontend and backend code
- **ESLint & Prettier**: Maintain consistent code formatting and catch potential issues early
- **Component Structure**: Keep React components small, focused, and reusable with clear prop interfaces

### Testing Requirements
- **Test-Driven Development**: Write tests before implementing features when possible
- **Component Testing**: Use React Testing Library for all React components
- **API Testing**: Write Jest tests for all Express.js endpoints and middleware
- **Integration Testing**: Use Playwright for end-to-end testing of critical user flows
- **Test Coverage**: Aim for >80% code coverage, focus on business logic and error paths

### Git Workflow
- **Descriptive Commits**: Use clear, descriptive commit messages that explain the "why" not just the "what"
  - Good: "Add transcript caching to reduce API calls and improve performance"
  - Bad: "Update transcript service"
- **Atomic Commits**: Each commit should represent one logical change
- **Branch Naming**: Use descriptive branch names like `feature/video-analysis` or `fix/transcript-parsing-error`
- **Pull Requests**: Include detailed descriptions with context, testing instructions, and any breaking changes

### Error Handling
- **Graceful Degradation**: Always provide fallback UI states for API failures
- **User-Friendly Messages**: Convert technical errors into actionable user guidance
- **Logging**: Implement structured logging for debugging without exposing sensitive data
- **Validation**: Validate inputs on both client and server sides

### Performance Considerations
- **Loading States**: Always provide visual feedback during async operations
- **Caching Strategy**: Cache analysis results for identical YouTube videos
- **Lazy Loading**: Load heavy components and data only when needed
- **API Rate Limiting**: Respect external API limits and implement retry logic

### Security Guidelines
- **Environment Variables**: Never commit API keys or sensitive data to the repository
- **Input Sanitization**: Sanitize all user inputs, especially YouTube URLs
- **API Security**: Implement rate limiting and CORS policies appropriately
- **Data Privacy**: Don't store unnecessary user data or sensitive video content

## Common Development Commands

### Initial Setup (when implemented)
```bash
# Frontend
npm install
npm run dev        # Start development server
npm run build      # Build for production
npm run test       # Run component tests
npm run lint       # Run ESLint

# Backend
npm install
npm run dev        # Start development server
npm run test       # Run API tests
npm run lint       # Run ESLint
```

### Testing Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

## Project Structure (when implemented)

```
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API communication
│   │   └── utils/         # Helper functions
├── backend/
│   ├── src/
│   │   ├── routes/        # Express route handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database schemas
│   │   └── middleware/    # Express middleware
├── spec/                  # Technical specifications
└── tests/                 # Integration and E2E tests
```

## Key Implementation Notes

- **YouTube API**: Use Innertube API implementation for transcript extraction with youtube-transcript package as fallback
- **AI Integration**: Claude API for analyzing transcripts and generating insights
- **State Management**: React Context API is sufficient for MVP, avoid Redux unless complexity demands it
- **Database**: MongoDB with flexible schema for varying analysis outputs
- **Deployment**: Separate frontend (Vercel) and backend (Railway/Render) deployments