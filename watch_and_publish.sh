#!/bin/bash
cd "/Users/azaryarozet/Library/Mobile Documents/com~apple~CloudDocs/Дела/Ольга/olgaroset.ru"
fswatch -o content.md | while read; do
  echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 content.md изменён, публикую..."
  python3 build.py
  git add -A
  git commit -m "Auto: content.md updated [$(date '+%H:%M:%S')]"
  git push origin master:main
  echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ Опубликовано на olgaroset.ru"
done
