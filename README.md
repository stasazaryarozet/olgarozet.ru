# olgarozet.ru

Официальный сайт Ольги Розет.

## Архитектура

```
olgarozet.ru/
├── index.html          # Главная (v2.5+)
├── content.md          # Source of truth для контента
├── art/                # Галерея работ
│   ├── index.html      # 94 произведения, shuffle
│   └── img/            # Изображения (195MB)
├── booking/            # Страница консультаций (каноническая)
├── book/               # Редирект → /booking/
└── .integrations.json  # Манифест интеграции с Dela
```

## Sources of Truth

| Данные | Файл | Синхронизируется с |
|--------|------|-------------------|
| Bio | `../bio.txt` | Telegram канал, intro сайта |
| Контент | `content.md` | index.html (build.py) |
| Работы | `../olga_artworks/` | art/img/ |

## Интеграции

### Cal.com
- Event Type: `delo-40min`
- Embed: `/booking/`
- API sync: `sync-calcom.yml`

### Telegram
- Канал: @olga_rozet
- Bio sync: `ru.olgarozet.sync` daemon
- Session: `.gates/telegram_olga_azarya_device.session`

### Instagram
- Аккаунт: @olga_rozet
- Link in bio → olgarozet.ru

## Deployment

```bash
# Push → GitHub Actions → GitHub Pages
git push origin main
```

**Workflows:**
- `static.yml` — Deploy на каждый push
- `build-and-deploy.yml` — Auto-build content.md → index.html
- `sync-calcom.yml` — Sync с Cal.com API

## Зависимости

**Tools:**
- `tools/credentials_master.py`
- `tools/sync_channel_bio.py`

**Daemons:**
- `ru.olgarozet.sync` — Bio sync (каждые 5 мин + на изменение bio.txt)
- `com.dela.art.sync` — Artwork sync

**Gates:**
- Telegram session (Olga)
- Google credentials (для будущих интеграций)

## Связанные проекты

- **parisinjanuary.ru** — Париж 2026
- **Telegram канал** — @olga_rozet
- **Instagram** — @olga_rozet
- **olga_artworks/** — База произведений
