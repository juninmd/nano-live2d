# Contributing to Open Avatar

Thank you for your interest in contributing to Open Avatar! This document provides guidelines for contributing and details about our CI/CD pipeline.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/juninmd/nano-live2d.git
   cd nano-live2d
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -e ".[dev]"
   ```

3. Install development tools:
   ```bash
   pip install flake8 black mypy pytest pytest-cov pytest-mock bandit safety
   ```

## Code Quality

### Before submitting a PR, ensure:

1. **Linting passes**: `flake8 . --count`
2. **Formatting is correct**: `black --check .`
3. **Type checking passes**: `mypy generate_texture.py --ignore-missing-imports`
4. **Tests pass with coverage**: `pytest tests/ --cov=generate_texture --cov-report=term`
5. **Security scan passes**: `bandit -r . -x .git,tests,dist`

### Code Style

- Follow PEP 8 conventions
- Use Black formatter with line length 100
- Write type hints for all function signatures
- Keep functions focused and testable

## Testing Guidelines

### Coverage Requirements
- Minimum 80% code coverage required
- All new features must include tests
- Both unit tests and integration tests encouraged

### Test Structure
- Place tests in `tests/` directory
- Name test files `test_*.py`
- Name test classes `Test*`
- Name test functions `test_*`
- Use fixtures from `conftest.py` where possible

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=generate_texture --cov-report=term

# Run specific test file
pytest tests/test_generate_texture.py -v

# Run specific test class
pytest tests/test_generate_texture.py::TestBackupAndRestore -v
```

## CI/CD Pipeline

Our CI/CD pipeline runs automatically on push and pull requests:

### Stages

1. **Lint**: Code style, type checking, and security scanning
2. **Test**: Unit tests with coverage reporting
3. **Build**: Package creation and asset manifest generation
4. **Deploy**: Automatic deployment to GitHub Pages (main branch only)

### Quality Gates

| Gate | Tool | Threshold |
|------|------|-----------|
| Linting | flake8 | Zero errors (E9, F63, F7, F82) |
| Formatting | black | Must pass check |
| Type checking | mypy | No errors |
| Test coverage | pytest-cov | ≥80% |
| Security | bandit | No high-severity issues |
| Dependencies | safety | No known vulnerabilities |

### Pipeline Status

![CI/CD Pipeline](https://github.com/juninmd/nano-live2d/actions/workflows/ci.yml/badge.svg)

## Pull Request Process

1. Create a feature branch from `develop`
2. Write tests for your changes
3. Ensure all quality gates pass
4. Update documentation if needed
5. Submit PR against `develop` branch
6. Request review from maintainers

## Deployment

### Staging
- Automatic deployment on PR merge to `develop`
- URL: https://avatar.gbase.ai

### Production
- Manual trigger via GitHub Actions workflow dispatch
- Requires approval from maintainers
- Includes health checks and rollback capability

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GITHUB_TOKEN` | CI only | GitHub Actions token (automatic) |

## Reporting Issues

- Check existing issues before creating new ones
- Include steps to reproduce
- Specify your environment (OS, Python version, browser)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
