# DIDS 1.1 — автоматизация «ОСТРОВА МЕЧТЫ»

Модульный прототип V34, офлайн-конвейер сборки, браузерные проверки и отчёты производительности. Игровые ресурсы — в `game/legacy_v34/`; версия конвейера — 1.1.0.

## Сборка

Python 3.10+; Node.js 22+ для проверки синтаксиса всех JS-модулей. Сторонние Python-пакеты не нужны.

```bash
python -m unittest discover -s tests -v
python scripts/dids.py audit
python scripts/dids.py build
```

Результат: `reports/qa.json`, `dist/OSTROV_MECHTY_V34_DIDS.zip` и SHA-256-манифест внутри архива. Игра использует локальные classic scripts, без CDN и сборщика. Входной файл — `game/legacy_v34/ОСТРОВ_МЕЧТЫ_V34_ИГРАТЬ.html`. Для запуска через HTTP:

```bash
python -m http.server 8000 --directory game/legacy_v34
```

Откройте входной HTML в списке по адресу `http://localhost:8000`.

## Проверки JavaScript и браузера

```bash
npm ci
npm test
cd game/legacy_v34
node QA/test_v31_logic.js
cd ../..
npx playwright install --with-deps chromium
npm run test:browser
```

Playwright сам запускает HTTP-сервер. Каждый сценарий выполняется с WebGL и с принудительным Canvas 2D fallback: начало ночи, движение, пять CCTV-камер, перезапуск, предметы, генератор, победа и разряд батареи. Позиции предметов и конец ночи задаются через тестовые hooks; это проверки механик, а не полное автономное прохождение карты. Ошибки JavaScript и консоли завершают тест провалом.

Если Chromium уже установлен, задайте `DIDS_CHROMIUM_PATH=/path/to/chromium`. По умолчанию используется браузер Playwright. Зависимости фиксируются в `package-lock.json`.

## Отчёты

- `reports/browser-tests.json` — результаты браузерных проверок.
- `reports/performance/{webgl,canvas2d}.{json,md}` — среднее, p95 и максимум интервала кадра, обновления и отрисовки, FPS, версия браузера и параметры сценария.
- `playwright-report/` — HTML-отчёт; `test-results/` — screenshots и traces при ошибках.

Измерение: 1 секунда прогрева, затем 3 секунды неподвижной ночи с четырьмя противниками, viewport 1280×720. Буфер ограничен 600 кадрами. FPS показывает частоту requestAnimationFrame; WebGL отдельно ограничивает частоту фактической отрисовки. CPU wall time не измеряет время выполнения команд GPU. Программный WebGL нельзя сравнивать напрямую с игровым компьютером.

Бюджет суммы p95 обновления и отрисовки — 250 мс; переопределяется через `DIDS_CPU_P95_BUDGET_MS`. Это начальная защита от грубых регрессий, а не требование 60 FPS. Скриншотных эталонов и сравнений с историческим baseline пока нет.

## GitHub Actions

На push в `main`/`develop`, pull request и ручной запуск выполняются Python-сборка и отдельная проверка модулей/браузера. Артефакты `dids-ci-*` и `dids-browser-*` хранятся 14 дней. Для проверки feature-ветки откройте PR или запустите workflow вручную.

`DIDS Manual Candidate` требует ввода `APPROVED`, выполняет все проверки и создаёт артефакт кандидата; релиз автоматически не публикуется. Графика остаётся прототипной (`NOT_FINAL_ART_APPROVED`), центральное питание в начале ночи выключено.
