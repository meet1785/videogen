# Contributing to VideoGen

Thank you for your interest in contributing to VideoGen! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/videogen.git
   cd videogen
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/meet1785/videogen.git
   ```

## Development Setup

1. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Create necessary directories:**
   ```bash
   mkdir -p outputs temp models
   ```

5. **Run the service:**
   ```bash
   python -m app.main
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-model` - For new features
- `fix/video-generation-bug` - For bug fixes
- `docs/update-readme` - For documentation
- `refactor/service-layer` - For refactoring

### Commit Messages

Write clear, concise commit messages:

```
feat: add support for custom aspect ratios

- Added aspect_ratio parameter to VideoGenerationRequest
- Updated video_generator to handle custom ratios
- Added tests for aspect ratio validation
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Submitting Changes

1. **Update your fork:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes:**
   ```bash
   git push origin your-branch-name
   ```

3. **Create a Pull Request:**
   - Go to GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Submit

### Pull Request Guidelines

- Reference any related issues
- Describe what your changes do
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed
- Keep PRs focused and small

## Coding Standards

### Python Style

Follow PEP 8 guidelines:

```python
# Good
def generate_video(prompt: str, duration: int) -> str:
    """Generate a video from prompt."""
    pass

# Bad
def GenerateVideo(prompt,duration):
    pass
```

### Documentation

Document all functions and classes:

```python
def process_video(video_path: str, format: str) -> dict:
    """
    Process a video file.
    
    Args:
        video_path: Path to the video file
        format: Target format (mp4, avi, etc.)
        
    Returns:
        Dictionary with processing results
        
    Raises:
        FileNotFoundError: If video file doesn't exist
        ValueError: If format is not supported
    """
    pass
```

### Type Hints

Use type hints for all functions:

```python
from typing import List, Optional, Dict

def get_videos(user_id: int, limit: Optional[int] = None) -> List[Dict[str, str]]:
    pass
```

## Testing

### Running Tests

```bash
pytest tests/
```

### Writing Tests

Create tests for new features:

```python
def test_video_generation():
    """Test basic video generation."""
    request = VideoGenerationRequest(
        prompt="Test video",
        platform="instagram"
    )
    
    task_id = await video_service.generate_video(request)
    
    assert task_id is not None
    assert len(task_id) > 0
```

### Test Coverage

Maintain high test coverage:

```bash
pytest --cov=app tests/
```

## Areas for Contribution

### High Priority

1. **Real Model Integration**
   - Integrate SkyReels-V2 or Stable Video Diffusion
   - Add model loading and caching
   - Optimize inference performance

2. **Database Support**
   - Add PostgreSQL/MongoDB for task storage
   - Implement proper migrations
   - Add user management

3. **Queue System**
   - Implement Celery + Redis
   - Add priority queue support
   - Implement job scheduling

### Medium Priority

4. **Enhanced API Features**
   - Add video editing capabilities
   - Support multiple output formats
   - Implement video templates

5. **Monitoring & Logging**
   - Add Prometheus metrics
   - Implement structured logging
   - Add distributed tracing

6. **Testing**
   - Increase test coverage
   - Add integration tests
   - Add performance tests

### Low Priority

7. **Documentation**
   - Add more examples
   - Create video tutorials
   - Translate to other languages

8. **Developer Experience**
   - Add CLI tool
   - Create VS Code extension
   - Improve error messages

## Project Structure

```
videogen/
├── app/
│   ├── api/              # API routes
│   ├── models/           # Data models
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   ├── config.py         # Configuration
│   └── main.py           # Application entry
├── examples/             # Example scripts
├── tests/               # Test files
├── docs/                # Additional documentation
└── requirements.txt     # Dependencies
```

## Code Review Process

1. **Automated Checks**
   - Code formatting (black)
   - Linting (flake8)
   - Type checking (mypy)
   - Tests (pytest)

2. **Manual Review**
   - Code quality
   - Architecture decisions
   - Documentation
   - Test coverage

3. **Approval**
   - At least one maintainer approval
   - All checks passing
   - Conflicts resolved

## Release Process

1. Version bump following SemVer
2. Update CHANGELOG.md
3. Create release notes
4. Tag release
5. Build and push Docker image
6. Announce release

## Getting Help

- **Documentation:** Check README and other docs
- **Issues:** Search existing issues
- **Discussions:** Use GitHub Discussions
- **Discord/Slack:** Join our community (if available)

## Recognition

Contributors are recognized in:
- README.md Contributors section
- Release notes
- GitHub contributors page

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to:
- Open an issue for questions
- Ask in discussions
- Reach out to maintainers

Thank you for contributing to VideoGen! 🎉
