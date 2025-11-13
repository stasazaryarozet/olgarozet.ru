# olgaroset.ru

Сайт Ольги Розет — консультации, ближайшие мероприятия.

## Архитектура

**Single Source of Truth:** `content.md` (Markdown)

**Rendering:** Pre-render (build.py → index.html)

**Deployment:** GitHub Pages

## Workflow

### Локально (MacBook)

1. Открываешь `content.md` в TextEdit
2. Вносишь изменения → сохраняешь
3. **fswatch автоматически:**
   - Запускает `build.py`
   - Коммитит изменения
   - Пушит в GitHub
4. Через ~30 сек обновляется https://olgaroset.ru

### На сервере (GitHub Actions)

При пуше `content.md` в `main`:
- GitHub Actions запускает `build.py`
- Генерирует `index.html`
- Автоматически коммитит и деплоит

## Структура

```
content.md          # Источник правды
build.py            # Генератор HTML
index.html          # Результат (автогенерируемый)
.github/workflows/
  build-and-deploy.yml    # GitHub Action для авто-сборки
  sync-calcom.yml         # Синхронизация с Cal.com
```

## Версионирование

Версия задаётся в frontmatter `content.md`:

```markdown
---
version: 1.0
---
```

Отображается в правом нижнем углу сайта.

## Cal.com интеграция

Описание консультации "40 минут. Прямой разбор вашего дела." берётся из `content.md` и автоматически синхронизируется с Cal.com при изменении.

## Миграция на сервер

Текущий fswatch работает на MacBook. Для переноса на сервер:
- Запустить fswatch на сервере с доступом к iCloud Drive
- Или использовать только GitHub Actions (пушить content.md вручную или через API)

