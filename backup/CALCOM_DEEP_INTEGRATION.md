# Глубокая интеграция с Cal.com

## Проблемы, которые нужно решить:

1. ❌ Ссылка "В Дело" ведет на `delo-40min` (английский), а нужен `delo` (русский)
2. ❌ API ключ устарел (401 Unauthorized)
3. ❌ Нет автоматической синхронизации контента

## Пошаговый план:

### 1. Получить новый API ключ Cal.com

**Где:** https://app.cal.com/settings/developer/api-keys

**Что делать:**
1. Войти в Cal.com как Olga
2. Settings → Developer → API Keys
3. Create New API Key
4. Название: "olgarozet.ru Auto Sync"
5. Скопировать ключ

**Сохранить:**
```bash
export CAL_API_KEY="cal_live_..."
```

### 2. Создать русскоязычное событие "delo"

**Скрипт:** `create_delo_event.py`

```python
from calcom_gate import CalcomGateFull

gate = CalcomGateFull()

# Создаем новое событие
result = gate.create_event_type(
    title="В Дело",
    slug="delo",
    length=40,
    description="40 минут. Подключить меня к вашему делу.",
    locations=[{
        "type": "integration",
        "integration": "google-meet"
    }]
)

print(f"✅ Создано: cal.com/olgarozet/delo")
print(f"ID: {result['data']['id']}")
```

### 3. Автоматическая синхронизация

**GitHub Action:** `.github/workflows/sync-calcom-deep.yml`

```yaml
name: Deep Cal.com Sync

on:
  push:
    paths:
      - 'content.md'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install requests
      
      - name: Sync to Cal.com
        env:
          CAL_API_KEY: ${{ secrets.CAL_API_KEY }}
        run: python3 sync_calcom_full.py
```

### 4. Скрипт полной синхронизации

**Файл:** `sync_calcom_full.py`

```python
#!/usr/bin/env python3
"""
Синхронизирует content.md с Cal.com
- Обновляет описание события
- Обновляет название
- Обновляет длительность
"""
import re
import sys
sys.path.insert(0, '.gates/calcom')
from calcom_gate import CalcomGateFull

# Читаем content.md
with open('content.md', 'r') as f:
    content = f.read()

# Извлекаем данные о консультации
match = re.search(r'## Консультации\n\n(.+?)\n\n\*\*Стоимость', content, re.DOTALL)
if match:
    description = match.group(1).strip()
    
    # Обновляем Cal.com
    gate = CalcomGateFull()
    
    # Находим событие "delo"
    event_types = gate.get_event_types()
    delo_event = next((et for et in event_types if et['slug'] == 'delo'), None)
    
    if delo_event:
        gate.update_event_type(
            delo_event['id'],
            description=description
        )
        print(f"✅ Обновлено: cal.com/olgarozet/delo")
    else:
        print("❌ Событие 'delo' не найдено")
else:
    print("❌ Не удалось извлечь описание консультации")
```

### 5. Обновить ссылки

**В `content.md`:**
```markdown
[В Дело](https://cal.com/olgarozet/delo)
```

**В Telegram:**
```
cal.com/olgarozet/delo
```

## Текущее состояние:

- ✅ Скрипт интеграции готов: `.gates/calcom/calcom_gate.py`
- ❌ Нужен новый API ключ
- ❌ Событие `delo` не создано
- ❌ Автоматическая синхронизация не настроена

## Следующий шаг:

**Попросить пользователя:**
1. Получить API ключ: https://app.cal.com/settings/developer/api-keys
2. Сообщить ключ для настройки автоматизации

**Или предоставить доступ для самостоятельной настройки.**

