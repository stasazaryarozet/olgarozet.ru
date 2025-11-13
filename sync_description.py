#!/usr/bin/env python3
"""
Синхронизирует описание консультации из content.md в Cal.com
"""
import re
import sys
sys.path.insert(0, '../../.gates/calcom')
from calcom_gate import CalcomGateFull
import os

# Читаем content.md
with open('content.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Извлекаем описание консультации (строка после "## Консультации")
match = re.search(r'## Консультации\s+(.+?)\s+\[', content, re.DOTALL)
if not match:
    print("❌ Не найдено описание консультации в content.md")
    sys.exit(1)

description = match.group(1).strip()
print(f"📋 Найдено описание: {description}")

# Обновляем Cal.com
gate = CalcomGateFull(os.environ.get('CAL_API_KEY'))
result = gate.update_event_type(3859146, description=description)

if result.get('status') == 'success':
    print("✅ Описание синхронизировано с Cal.com")
else:
    print("❌ Ошибка синхронизации")
    sys.exit(1)
