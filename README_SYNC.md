# Синхронизация описания консультации

## Принцип: Single Source of Truth

Описание консультации хранится в **content.md**:

```markdown
## Консультации

40 минут. Прямой разбор вашего дела.
```

## Автоматическая синхронизация

**Скрипт:** `sync_description.py`

**Запуск:**
```bash
CAL_API_KEY=cal_live_c7dba7d0cfbe9b741f496d56ef2f34e0 python3 sync_description.py
```

**Что делает:**
1. Читает `content.md`
2. Извлекает текст между `## Консультации` и `[Запись]`
3. Обновляет описание в Cal.com через API

## Workflow обновления

1. Редактируешь `content.md`
2. Коммитишь изменения (сайт обновится автоматически)
3. Запускаешь `sync_description.py` для синхронизации с Cal.com

## Альтернатива: GitHub Actions (будущее)

Можно автоматизировать через GitHub Actions:
- При пуше в `content.md`
- Автоматически запускается `sync_description.py`
- Описание синхронизируется в Cal.com

## Где используется

- **Сайт:** olgaroset.ru (раздел "Консультации")
- **Cal.com:** https://cal.com/olgarozet/delo-40min (описание события)
- **Google Calendar:** автоматически через Cal.com

## API

Используется Cal.com API v2:
```python
gate.update_event_type(3859146, description="...")
```

Event Type ID: `3859146` (delo-40min)
