# Настройка GitHub Secret для автоматической синхронизации

## Что нужно сделать один раз:

1. **Открой репозиторий на GitHub:**
   https://github.com/azrozet/olgaroset.ru

2. **Перейди в Settings → Secrets and variables → Actions**

3. **Нажми "New repository secret"**

4. **Добавь секрет:**
   - **Name:** `CAL_API_KEY`
   - **Value:** `cal_live_c7dba7d0cfbe9b741f496d56ef2f34e0`

5. **Нажми "Add secret"**

## Всё!

После этого при каждом изменении `content.md`:
- Коммитишь и пушишь в GitHub
- GitHub Actions автоматически:
  - Читает новое описание из `content.md`
  - Синхронизирует с Cal.com через API
  
## Проверка работы:

1. Измени описание в `content.md`
2. Закоммить и запушь
3. Зайди в GitHub → вкладка "Actions"
4. Увидишь запущенный workflow "Sync to Cal.com"
5. Через минуту описание обновится в Cal.com

## Ручной запуск (если нужно):

В GitHub → Actions → "Sync to Cal.com" → "Run workflow"

## Файлы:

- `.github/workflows/sync-calcom.yml` — конфигурация GitHub Action
- `sync_description.py` — скрипт синхронизации
- `content.md` — источник правды

## Безопасность:

✅ API ключ хранится в GitHub Secrets (зашифровано)
✅ Не виден в логах
✅ Доступен только для GitHub Actions
