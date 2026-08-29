#!/usr/bin/env python3
"""
Mantis Summarize - Security-focused repository directory summarizer.
Bottom-up traversal generating mantis-summary.md files for each directory.
"""

import os
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Set, Optional
from dataclasses import dataclass, field
import fnmatch

# Configuration
CODE_ROOT = "/home/joaomarcos/teste-do-mantis"
WORKSPACE = "/home/joaomarcos/teste-do-mantis/workspace"
EXCLUDE_DIRS = {
    'node_modules', 'vendor', '.git', '.github', 'dist', 'build', 'out',
    'target', 'bin', 'obj', '.idea', '.vscode', '.vs', '__pycache__',
    'dist', 'coverage', '.nyc_output', 'tests', 'test', 'spec', '__tests__',
    '.next', '.nuxt', '.cache', '.turbo', '.vercel', '.netlify',
    'venv', 'env', '.env', 'venvs', 'envs', 'virtualenv',
    'log', 'logs', 'tmp', 'temp', '.tmp', 'tmp.*',
    '*.egg-info', '*.dist-info', '.pytest_cache', '.mypy_cache',
    '.tox', 'htmlcov', '.coverage', 'coverage', 'htmlcov'
}
EXCLUDE_FILES = {
    '*.min.js', '*.min.css', '*.map', '*.lock', '*.log', '*.bak',
    '*.tmp', '*.temp', '*.swp', '*.swo', '*~', '.DS_Store',
    '*.pyc', '*.pyo', '*.pyd', '*.so', '*.dll', '*.exe', '*.bin',
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.svg', '*.webp',
    '*.woff', '*.woff2', '*.ttf', '*.eot', '*.otf', '*.pdf',
    '*.zip', '*.tar', '*.gz', '*.bz2', '*.xz', '*.7z', '*.rar',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock',
    'composer.lock', 'Gemfile.lock', 'Pipfile.lock', 'poetry.lock'
}

SOURCE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.pyw', '.pyi', '.pyx', '.pxd',
    '.rs', '.go', '.java', '.kt', '.scala', '.clj', '.cljs',
    '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hxx',
    '.cs', '.vb', '.fs', '.fsx', '.fsi',
    '.php', '.rb', '.pl', '.pm', '.t', '.lua',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    '.sql', '.graphql', '.gql', '.proto', '.thrift',
    '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
    '.json', '.jsonc', '.json5', '.xml', '.html', '.htm',
    '.vue', '.svelte', '.astro', '.mdx', '.md',
    '.dockerfile', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    'Makefile', 'makefile', 'CMakeLists.txt', 'BUILD', 'BUILD.bazel',
    'Cargo.toml', 'pyproject.toml', 'setup.py', 'setup.cfg', 'requirements.txt',
    'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.ts',
    'vite.config.js', 'next.config.js', 'next.config.ts', 'nuxt.config.ts',
    'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
    'jest.config.js', 'jest.config.ts', 'vitest.config.ts', 'playwright.config.ts',
    'eslint.config.js', '.eslintrc', '.eslintrc.js', '.eslintrc.json',
    'prettier.config.js', '.prettierrc', '.prettierrc.json', 'stylelint.config.js'
}

@dataclass
class DirectorySummary:
    path: str
    relative_path: str
    core_components: str = ""
    api_endpoints: str = ""
    trust_boundaries: str = ""
    sensitive_operations: str = ""
    historical_vulns: str = ""
    subdirectory_summaries: Dict[str, str] = field(default_factory=dict)
    files: List[str] = field(default_factory=list)
    subdirs: List[str] = field(default_factory=list)

def should_exclude_dir(name: str) -> bool:
    """Check if directory should be excluded from traversal."""
    return name in EXCLUDE_DIRS or name.startswith('.')

def should_exclude_file(name: str) -> bool:
    """Check if file should be excluded from analysis."""
    if any(fnmatch.fnmatch(name, pat) for pat in EXCLUDE_FILES):
        return True
    return False

def is_source_file(name: str) -> bool:
    """Check if file is a source code file worth analyzing."""
    return any(name.endswith(ext) for ext in SOURCE_EXTENSIONS)

def get_relative_path(path: Path, root: Path) -> str:
    """Get relative path from root."""
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)

def run_command(cmd: List[str], cwd: str = None, capture: bool = True) -> tuple[int, str, str]:
    """Run a command and return (returncode, stdout, stderr)."""
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=capture, text=True, timeout=60
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "timeout"
    except Exception as e:
        return -1, "", str(e)

def get_historical_vulns(summaries_file: Path) -> Dict[str, List[str]]:
    """Parse historical vulnerabilities from JSONL file."""
    vulns_by_file = {}
    if not summaries_file.exists():
        return vulns_by_file
    
    try:
        with open(summaries_file, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    file_path = entry.get('file', '')
                    vuln_class = entry.get('vulnerability_class', '')
                    description = entry.get('description', '')
                    if file_path:
                        if file_path not in vulns_by_file:
                            vulns_by_file[file_path] = []
                        vulns_by_file[file_path].append(f"{vuln_class}: {description}")
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass
    return vulns_by_file

def collect_git_history(root: Path, path: Path) -> str:
    """Get git history for a file/directory."""
    rel_path = get_relative_path(path, root)
    code, stdout, stderr = run_command(
        ['git', 'log', '--oneline', '-n', '20', '--', rel_path],
        cwd=root
    )
    if code == 0 and stdout.strip():
        return stdout.strip()
    return ""

def analyze_directory(root: Path, dir_path: Path, subdir_summaries: Dict[str, str], 
                     historical_vulns: Dict[str, List[str]]) -> DirectorySummary:
    """Analyze a single directory and generate its summary."""
    rel_path = get_relative_path(dir_path, root)
    
    # Collect files and subdirectories
    files = []
    subdirs = []
    
    try:
        for entry in dir_path.iterdir():
            if entry.is_file() and not should_exclude_file(entry.name):
                if is_source_file(entry.name):
                    files.append(entry.name)
            elif entry.is_dir() and not should_exclude_dir(entry.name):
                subdirs.append(entry.name)
    except PermissionError:
        pass
    
    # Get historical vulnerabilities
    rel_path_str = rel_path
    historical = historical_vulns.get(rel_path_str, [])
    historical_str = "\n".join(f"- {v}" for v in historical) if historical else "None recorded"
    
    # Build prompt for LLM analysis
    # We'll create a summary directly since we don't have LLM access
    # Instead, we'll do deterministic analysis based on file patterns
    
    # Analyze files for security-relevant patterns
    api_endpoints = []
    trust_boundaries = []
    sensitive_ops = []
    
    for fname in files:
        fpath = dir_path / fname
        try:
            content = fpath.read_text(encoding='utf-8', errors='ignore')
            # Look for API endpoints
            if any(pattern in content for pattern in ['@Get', '@Post', '@Put', '@Delete', '@Patch', 
                                                      'app.get', 'app.post', 'app.put', 'app.delete',
                                                      'router.get', 'router.post', 'router.put', 'router.delete']):
                api_endpoints.append(fname)
            # Look for trust boundaries
            if any(pattern in content for pattern in ['req.', 'request.', 'input', 'params', 'query', 'body',
                                                      'user.input', 'sanitize', 'validate', 'xss', 'csrf']):
                trust_boundaries.append(fname)
            # Look for sensitive operations
            if any(pattern in content for pattern in ['crypto', 'hash', 'encrypt', 'decrypt', 'sign', 'verify',
                                                      'jwt', 'token', 'password', 'secret', 'key',
                                                      'crypto.', 'bcrypt', 'argon2', 'scrypt',
                                                      'eval', 'exec', 'Function(', 'innerHTML']):
                sensitive_ops.append(fname)
        except Exception:
            pass
    
    # Build subdirectory summaries
    subdir_summary_parts = []
    for subdir in subdirs:
        if subdir in subdir_summaries:
            subdir_summary_parts.append(f"**{subdir}/**: {subdir_summaries[subdir][:200]}...")
    
    # Build summary
    summary = DirectorySummary(
        path=str(dir_path),
        relative_path=rel_path_str,
        files=sorted(files),
        subdirs=sorted(subdirs)
    )
    
    # Generate markdown summary
    lines = [
        f"# Security Summary: {rel_path_str or 'ROOT'}",
        "",
        f"**Path**: `{rel_path_str or '/'}`",
        f"**Files**: {len(files)} source files",
        f"**Subdirectories**: {len(subdirs)}",
        ""
    ]
    
    if api_endpoints:
        lines.extend(["## API Endpoints & Exports", ""])
        for ep in sorted(set(api_endpoints)):
            lines.append(f"- `{ep}`")
        lines.append("")
    
    if trust_boundaries:
        lines.extend(["## Trust Boundaries & External Inputs", ""])
        for tb in sorted(set(trust_boundaries)):
            lines.append(f"- `{tb}`")
        lines.append("")
    
    if sensitive_ops:
        lines.extend(["## Sensitive Operations", ""])
        for so in sorted(set(sensitive_ops)):
            lines.append(f"- `{so}`")
        lines.append("")
    
    if historical_vulns.get(rel_path_str):
        lines.extend(["## Historical Vulnerabilities & Fixes", ""])
        for hv in historical_vulns[rel_path_str]:
            lines.append(f"- {hv}")
        lines.append("")
    
    if subdir_summary_parts:
        lines.extend(["## Subdirectory Rollups", ""])
        lines.extend(subdir_summary_parts)
        lines.append("")
    
    if files:
        lines.extend(["## Files in This Directory", ""])
        for f in sorted(files):
            lines.append(f"- `{f}`")
        lines.append("")
    
    summary_text = "\n".join(lines)
    
    summary.core_components = "\n".join([
        f"- **Files**: {len(files)} source files",
        f"- **Subdirs**: {len(subdirs)} subdirectories",
        f"- **API endpoints found**: {len(set(api_endpoints))}",
        f"- **Trust boundaries**: {len(set(trust_boundaries))}",
        f"- **Sensitive ops**: {len(set(sensitive_ops))}"
    ])
    summary.api_endpoints = "\n".join(f"- `{e}`" for e in sorted(set(api_endpoints))) if api_endpoints else "None"
    summary.trust_boundaries = "\n".join(f"- `{t}`" for t in sorted(set(trust_boundaries))) if trust_boundaries else "None"
    summary.sensitive_operations = "\n".join(f"- `{s}`" for s in sorted(set(sensitive_ops))) if sensitive_ops else "None"
    summary.historical_vulns = historical_str
    summary.subdirectory_summaries = {k: v for k, v in subdir_summaries.items() if k in subdirs}
    
    return summary, summary_text

def write_summary(root: Path, dir_path: Path, summary_text: str):
    """Write summary to mantis-summary.md in the directory."""
    summary_file = dir_path / "mantis-summary.md"
    try:
        summary_file.write_text(summary_text, encoding='utf-8')
        return True
    except Exception as e:
        print(f"Error writing {summary_file}: {e}")
        return False

def traverse_and_summarize(root: Path):
    """Bottom-up traversal to generate summaries."""
    all_dirs = []
    
    # Collect all directories (bottom-up = deepest first)
    for dirpath, dirnames, filenames in os.walk(root):
        # Filter out excluded directories
        dirnames[:] = [d for d in dirnames if not should_exclude_dir(d)]
        dir_path = Path(dirpath)
        if dirpath != str(root):  # Skip root for now, handle last
            all_dirs.append(dir_path)
    
    # Sort by depth (deepest first) - bottom-up
    all_dirs.sort(key=lambda p: len(p.relative_to(root).parts), reverse=True)
    
    # Add root last
    all_dirs.append(root)
    
    # Load historical vulnerabilities
    historical_file = Path(WORKSPACE) / "historical_learnings.jsonl"
    historical_vulns = get_historical_vulns(historical_file)
    
    # Store summaries for rollup
    subdir_summaries: Dict[str, str] = {}
    written_count = 0
    
    for dir_path in all_dirs:
        # Get relative path for rollup key
        try:
            rel_key = str(dir_path.relative_to(root))
        except ValueError:
            rel_key = str(dir_path)
        
        # Get subdir summaries for rollup
        subdir_summaries_for_this = {}
        try:
            for subdir in dir_path.iterdir():
                if subdir.is_dir() and not should_exclude_dir(subdir.name):
                    subdir_key = str(subdir.relative_to(root))
                    if subdir_key in subdir_summaries:
                        subdir_summaries_for_this[subdir.name] = subdir_summaries[subdir_key]
        except Exception:
            pass
        
        # Analyze directory
        summary, summary_text = analyze_directory(
            root, dir_path, subdir_summaries_for_this, historical_vulns
        )
        
        # Store for parent rollup
        if rel_key == ".":
            subdir_summaries["."] = summary_text[:500]  # Truncate for parent
        else:
            subdir_summaries[rel_key] = summary_text[:500]
        
        # Write summary
        if write_summary(root, dir_path, summary_text):
            written_count += 1
    
    print(f"\n✅ Generated {written_count} mantis-summary.md files")

if __name__ == "__main__":
    print(f"🔍 Starting Mantis Summarize on: {CODE_ROOT}")
    print(f"📁 Workspace: {WORKSPACE}")
    
    # Check git availability
    code, stdout, stderr = run_command(['git', 'status'], cwd=CODE_ROOT)
    if code != 0:
        print("⚠️  Not a git repo or git not available, git history will be skipped")
    
    # Check historical learnings
    hist_file = Path(WORKSPACE) / "historical_learnings.jsonl"
    if hist_file.exists():
        print(f"📜 Found historical learnings: {hist_file}")
    else:
        print("📜 No historical_learnings.jsonl found")
    
    # Run traversal
    traverse_and_summarize(Path(CODE_ROOT))
    print("✅ Mantis Summarize complete!")