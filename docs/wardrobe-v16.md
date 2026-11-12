# Одежда эпох — версия 16

В магазине появился раздел «Одежда». В каждой эпохе два самостоятельных комплекта: бесплатная дворовая одежда и футбольная форма за 120 заработанных жетонов. Это комплект целиком, включая обувь. Отдельное комбинирование вещей пока не предусмотрено.

Обычная одежда — полноценный вариант для матчей. Она не ухудшает скорость, точность или отбор. Покупка формы тоже не меняет характеристики.

| Эпоха | Дворовая одежда | Форма |
|---|---|---|
| 80-е | Выцветшая хлопковая футболка, короткие шорты, парусиновые кеды | Длинный рукав, короткие белые шорты, гетры, кожаные бутсы |
| 90-е | Цветная олимпийка, тренировочные брюки, кроссовки | Свободная футболка с воротником, шорты, гетры, бутсы с отворотом |
| 2000-е | Футболка, джинсовые шорты, массивные кроссовки | Форма с боковыми вставками, гетры, красно-чёрные бутсы |
| 2010-е | Худи, спортивные брюки, простые низкие кеды | Техническая футболка, шорты, гетры, яркие бутсы |
| 2020-е | Свободная футболка, спортивные шорты, высокие носки, кроссовки | Облегающая форма и бутсы с вязаным верхом |

Это собирательные художественные образы. Повседневная одежда различалась между городами, семьями и сезонами. Мы не выдаём один наряд за универсальный исторический стандарт или лицензионную копию конкретного бренда.

Источники для визуальных ориентиров футбольной экипировки: [фото Олимпиады 1980 года](https://russiainphoto.ru/photos/283397/), [история обуви UEFA](https://www.uefa.com/news-media/news/025c-0f8e77a93d00-7ec63067d431-1000--tools-of-the-trade-the-history-of-the-football-boot/), [история adidas](https://www.adidas-group.com/en/about/history). Повседневные комплекты — авторская стилизация, не реконструкция по этим спортивным фотографиям.

Выбранный комплект хранится отдельно по эпохам. В испытаниях используется эпоха площадки испытания. В сетевых комнатах фиксирован двор 90-х, сервер передаёт выбранный комплект 90-х другим участникам. На GitHub Pages для живых комнат по-прежнему нужен отдельно размещённый HTTPS-сервер. Оплата реальными деньгами не подключена.

Новые ассеты: assets/outfits-80.webp, outfits-90.webp, outfits-00.webp, outfits-10.webp, outfits-20.webp. По 16 кадров в каждом: два комплекта, у каждого четыре шага бега, стойка, удар, стойка в воротах, прыжок. Изображения созданы встроенным ImageGen, оригиналы сохранены, в репозитории лежат оптимизированные копии с той же прозрачностью. Атлас загружается только при обращении к своей эпохе.

## Промпты генерации

Общая часть:

Use case: historical-scene. Production game sprite animation atlas, transparent background RGBA, no text, no borders, no ground, no ball, no cast shadows. Square image EXACT 4 columns by 4 rows of equal square cells. Exactly ONE full body teenage neighborhood football boy in each cell. Consistent realistic hand-painted 3D game look, natural slim teenage proportions, brown short hair, age 15-16, fully dressed, warm neutral daylight. All figures at same scale, centered horizontally, feet on baseline at 92% cell height, top of standing head 10% cell height. No figure crosses its cell boundary. View slightly from above, three-quarter profile facing RIGHT. Detailed fabric, believable joints and shoes. Rows 1-2 costume A, rows 3-4 costume B. Each costume exactly 8 poses: first row left to right RUN CONTACT left leg forward; RUN PASSING legs under body; RUN CONTACT right leg forward; RUN PASSING opposite arms. Second row left to right IDLE standing attentive; KICK leg extended right; GOALKEEPER READY crouch hands apart; GOALKEEPER DIVE right horizontal fully within cell, same anatomical size as standing figures. Costume strictly identical in all its 8 frames, including when keeping goal. Do not add goalkeeper jersey. Leave clean transparent gutters. No letters numbers brand logos emblems or watermarks.

### 80

Costume A: 1980s Soviet courtyard boy, faded cream cotton short sleeve T-shirt with navy rib collar, short navy sports shorts, plain white ankle socks, worn navy canvas plimsolls with white rubber toe caps and white soles. Costume B: 1980s amateur football team, burgundy-red long sleeve V-neck jersey with white cuffs and collar, short white football shorts, burgundy knee socks, black matte leather football boots, no modern neon.

### 90

Costume A: 1990s Russian neighborhood, teal turquoise and purple color-block nylon zip track jacket, loose matching dark purple full-length track pants with single pale side piping, white chunky lace-up trainers. Costume B: 1990s junior football, oversized cobalt royal blue satin short-sleeve jersey with white foldover polo collar, subtle tonal geometric woven pattern, loose white knee-above shorts, tall royal blue socks, black leather football boots with folded tongue and small white trim.

### 00

Costume A: 2000s Russian courtyard, loose burnt-orange cotton T-shirt, faded blue denim knee-length shorts, white ankle socks, gray chunky running sneakers. Costume B: 2000s football, red technical short-sleeve jersey with curved white panels down sides, black loose shorts, tall black socks with red cuffs, black and red football boots with foldover tongue.

### 10

Costume A: 2010s Russian courtyard, forest-green lightweight hoodie with hood DOWN, slim gray full-length joggers, black low-top sneakers with white soles. Costume B: 2010s youth football, fitted bright yellow technical short-sleeve jersey, navy shorts, tall yellow football socks, vivid orange lightweight low-cut football boots.

### 20

Costume A: 2020s Russian courtyard, dusty mauve oversized T-shirt, black above-knee sports shorts, high white crew socks, cream modern sneakers. Costume B: 2020s football, close-fitting pale aqua jersey with dark navy shoulder panels, navy short shorts, tall white socks, coral-orange streamlined knit football boots with short ankle collar.
