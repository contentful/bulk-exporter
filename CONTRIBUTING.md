# Contributing to Bulk Entry CSV Exporter

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/milescontentful/Bulk-Export/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (browser, Contentful space type, etc.)

### Suggesting Features

1. Check existing issues and discussions
2. Create a new issue with the `enhancement` label
3. Describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions considered
   - Any additional context

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass: `npm test`
   - Run type check: `npm run type-check`
   - Run linter: `npm run lint`

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Reference related issues (e.g., "Fixes #123")
   - Follow conventional commits format when possible:
     ```
     feat: add support for asset exports
     fix: resolve pagination bug for large datasets
     docs: update README with new features
     test: add tests for queryBuilder
     ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear title and description
   - Link to related issues
   - Describe what changed and why
   - Include screenshots for UI changes
   - Ensure CI passes

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Bulk-Export.git
cd Bulk-Export

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code structure
- Use Forma 36 components for UI
- Write meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep functions small and focused

## Testing

- Write tests for new features
- Update tests when modifying existing code
- Aim for high test coverage
- Use descriptive test names
- Test both happy paths and edge cases

Example test structure:
```typescript
describe('Feature Name', () => {
  it('should handle normal case', () => {
    // Test implementation
  });

  it('should handle edge case', () => {
    // Test implementation
  });

  it('should handle error case', () => {
    // Test implementation
  });
});
```

## Documentation

- Update README.md for user-facing changes
- Add inline comments for complex logic
- Update JSDoc comments for public APIs
- Include examples when helpful

## Questions?

Feel free to open an issue for questions or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
