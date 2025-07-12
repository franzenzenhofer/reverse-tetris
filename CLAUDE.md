# CLAUDE.md - Reverse Tetris Development Guide

## 🎮 Project Overview
**Reverse Tetris** (Retris) - A puzzle game where you remove pieces instead of stacking them.

### Live URLs
- Production: https://retris.franzai.com
- Cloudflare: https://retris.pages.dev
- GitHub: https://github.com/franzenzenhofer/reverse-tetris

## 🚀 Quick Commands

### Development
```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npm run test         # Run unit tests (watch mode)
npm run test:ui      # Run tests with UI
npm run test:e2e     # Run Playwright E2E tests
npm run typecheck    # TypeScript type checking
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Deployment
```bash
npm run deploy       # Build and deploy to Cloudflare Pages
```

## 📦 Deployment Process

### Automatic Deployment (GitHub Actions)
Every push to `main` branch triggers:
1. TypeScript compilation
2. Unit tests
3. Linting
4. Build process
5. Automatic deployment to Cloudflare Pages

### Manual Deployment
```bash
# 1. Ensure tests pass
npm run typecheck && npm run test -- --run

# 2. Build and deploy
npm run deploy

# 3. Verify deployment
curl -I https://retris.franzai.com
```

### Cloudflare Pages Configuration
- Project name: `retris`
- Production branch: `main`
- Build command: `npm run build`
- Build output: `dist/`
- Custom domain: `retris.franzai.com`

## 🏗️ Architecture

### Project Structure
```
src/
├── engine/          # Game logic (GameEngine, Piece, constants)
├── ui/              # Rendering (Renderer, UI)
├── input/           # Input handling (InputHandler)
├── types/           # TypeScript types
├── styles/          # CSS styles
└── test/            # Test setup

tests/
└── e2e/            # Playwright E2E tests
```

### Key Technologies
- **TypeScript** - Strict mode enabled
- **Vite** - Build tool and dev server
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **Cloudflare Pages** - Hosting

## 🧪 Testing Strategy

### Unit Tests
- Located in `__tests__` folders next to source files
- Run with `npm run test`
- Focus on game logic and piece mechanics

### E2E Tests
- Located in `tests/e2e/`
- Run with `npm run test:e2e`
- Test user interactions and responsive design

## 📱 Mobile-First Design

### Viewport Optimization
- Dynamic cell sizing based on viewport
- Safe area insets for notched devices
- Touch-optimized controls
- PWA manifest for installability

### Responsive Features
- Fluid typography with clamp()
- Compact UI for small screens
- Backdrop blur effects
- Full viewport utilization

## 🔧 Development Workflow

### Adding New Features
1. Create feature branch
2. Implement with tests
3. Run `npm run precommit`
4. Create PR with description
5. Merge after CI passes

### Code Quality Checks
```bash
npm run precommit    # Runs lint, typecheck, and tests
```

### Performance Monitoring
- Bundle size: ~10KB (gzipped)
- Load time: <3 seconds
- Lighthouse score: 95+

## 🐛 Debugging

### Common Issues
1. **Touch not working**: Check passive event listeners
2. **Resize issues**: Verify resize handler debouncing
3. **Build errors**: Run `npm run typecheck` first

### Development Tools
- Vite HMR for instant updates
- Source maps in production
- Redux DevTools (if state management added)

## 📈 Future Improvements
See `TodoWrite` tool for current task list:
- Sound effects system
- Particle animations
- Local storage for scores
- Game modes and difficulty
- Accessibility features

## 🔑 API Keys & Secrets
- Cloudflare API Token: Set in GitHub Secrets as `CLOUDFLARE_API_TOKEN`
- No other secrets required

## 📝 Commit Guidelines
- Use micro commits for clarity
- Descriptive commit messages
- Reference issue numbers when applicable
- Run tests before committing

## 🚨 Production Checklist
- [ ] All tests passing
- [ ] TypeScript no errors
- [ ] Lighthouse audit passed
- [ ] Mobile responsive verified
- [ ] Bundle size acceptable
- [ ] No console errors

---
*Last updated: 2025-07-12*