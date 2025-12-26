#!/usr/bin/env python3
"""
olgarozet.ru Auto-Build Daemon

Watches content.md → auto-builds → auto-commits → auto-deploys

Демон: com.dela.olgarozet.build
"""
import subprocess
import sys
import time
import hashlib
from pathlib import Path
from datetime import datetime

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

ROOT = Path(__file__).parent
CONTENT = ROOT / 'content.md'
INDEX = ROOT / 'index.html'
STYLES = ROOT / 'styles.css'
BUILD = ROOT / 'build.py'

PYTHON = '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3'


def get_hash(file: Path) -> str:
    """Get MD5 hash of file content."""
    if not file.exists():
        return ''
    return hashlib.md5(file.read_bytes()).hexdigest()


def build():
    """Run build.py."""
    result = subprocess.run([PYTHON, str(BUILD)], capture_output=True, text=True, cwd=ROOT)
    if result.returncode != 0:
        print(f"Build error: {result.stderr}")
        return False
    print(result.stdout.strip())
    return True


def deploy():
    """Git add, commit, push."""
    try:
        # Check if there are changes
        result = subprocess.run(
            ['git', 'status', '--porcelain', 'index.html', 'content.md', 'styles.css'],
            capture_output=True, text=True, cwd=ROOT
        )
        if not result.stdout.strip():
            print("No changes to deploy")
            return False
        
        # Add
        subprocess.run(['git', 'add', 'index.html', 'content.md', 'styles.css'], cwd=ROOT, check=True)
        
        # Commit
        now = datetime.now().strftime('%H:%M')
        subprocess.run(
            ['git', 'commit', '-m', f'content: auto-update {now}'],
            cwd=ROOT, check=True, capture_output=True
        )
        
        # Push
        subprocess.run(['git', 'push'], cwd=ROOT, check=True, capture_output=True)
        
        print(f"✅ Deployed at {now}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"Deploy error: {e}")
        return False


def watch():
    """Main watch loop."""
    print(f"👁️  Watching {CONTENT} and {STYLES}")
    print(f"   Edit content.md or styles.css → auto-build → auto-deploy\n")
    
    last_content_hash = get_hash(CONTENT)
    last_styles_hash = get_hash(STYLES)
    
    while True:
        time.sleep(2)  # Check every 2 seconds
        
        current_content_hash = get_hash(CONTENT)
        current_styles_hash = get_hash(STYLES)
        
        content_changed = current_content_hash != last_content_hash
        styles_changed = current_styles_hash != last_styles_hash
        
        if content_changed or styles_changed:
            changed = []
            if content_changed:
                changed.append('content.md')
                last_content_hash = current_content_hash
            if styles_changed:
                changed.append('styles.css')
                last_styles_hash = current_styles_hash
            
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] {', '.join(changed)} changed")
            
            if content_changed:
                build()
            deploy()


if __name__ == '__main__':
    if '--once' in sys.argv:
        # Single build+deploy
        if build():
            deploy()
    else:
        watch()
