# Коллекции в версии 20

- **Обувь.** «Магазин → Одежда → Обувь». В каждой эпохе можно оставить обувь из комплекта или выбрать отдельную пару. Примерочная показывает обувь крупно, а затем на игроке в движении. Выбор хранится по десятилетиям. В матчах и на своём экране сетевой комнаты обувь видна на персонаже.
- **Мячи.** По четыре модели на каждую эпоху. Новый мяч каждой эпохи использует отдельный рисунок и текстуру. Набор соответствует эпохе активного двора.
- **Зрители.** В редакторе появился дворовый тренер. У бабушки, ребят, соседки и тренера есть реплики на русском или испанском. Испанские персонажи используют свой набор изображений. Реплики показаны в виде текста.
- **Эффекты.** «Магазин → Голы». Волна по сетке, меловой круг и искры фонарей. Можно посмотреть эффект до выбора. Он появляется при голе игрока в одиночной «Американке» и «Навесе», а также в повторе этого гола. Системная настройка уменьшения движения упрощает анимацию.
- **Альбом.** Шесть заданий на нашивки. Снимок добавляется при завершении матча с выполненным заданием, отдельно для каждого двора и сезона. Снимок запоминает оформление двора. В тестовой версии есть отдельный пример снимка, доступный до матча.

Во время теста весь каталог доступен, а примерка и выбор не списывают жетоны и не записывают покупки. [Таблица будущих платных предложений](paid-catalog-v20.md).

## Файлы и запросы ImageGen

Обувь создана правкой пяти атласов `outfits-*.webp`. В игре используются `assets/shoes-80.webp`, `assets/shoes-90.webp`, `assets/shoes-00.webp`, `assets/shoes-10.webp`, `assets/shoes-20.webp`. Новые изображения мячей и зрителей находятся в `assets/balls-collection.webp` и `assets/spectators-iberia.webp`. Изображения получены через встроенный ImageGen и сохранены в WebP с альфа-каналом.

### shoes-80

Edit ONLY the shoes on the original four-by-four 16-frame animation atlas. Keep the exact 4 by 4 cell positions, order, transparent background, character identity, poses, proportions, hands, feet orientation, trousers, shorts, shirts, socks, lighting, top and bottom margins and original canvas dimensions. Replace footwear in every frame of both outfits with the same pair specified below. Edit only areas occupied by the shoes. All 16 frames must remain complete with matching frames and transparent gutters. Genuine RGBA transparency outside the person in each frame. No logos, no words, no new objects.
1980s dark burgundy canvas low-top court shoes, off-white rubber toe cap, cream sole and cream laces.

### shoes-90

Edit ONLY the shoes on the original four-by-four 16-frame animation atlas. Keep the exact 4 by 4 cell positions, order, transparent background, character identity, poses, proportions, hands, feet orientation, trousers, shorts, shirts, socks, lighting, top and bottom margins and original canvas dimensions. Replace footwear in every frame of both outfits with the same pair specified below. Edit only areas occupied by the shoes. All 16 frames must remain complete with matching frames and transparent gutters. Genuine RGBA transparency outside the person in each frame. No logos, no words, no new objects.
1990s white court trainers with deep teal panels and a light tan gum sole, white laces.

### shoes-00

Edit ONLY the shoes on the original four-by-four 16-frame animation atlas. Keep the exact 4 by 4 cell positions, order, transparent background, character identity, poses, proportions, hands, feet orientation, trousers, shorts, shirts, socks, lighting, top and bottom margins and original canvas dimensions. Replace footwear in every frame of both outfits with the same pair specified below. Edit only areas occupied by the shoes. All 16 frames must remain complete with matching frames and transparent gutters. Genuine RGBA transparency outside the person in each frame. No logos, no words, no new objects.
2000s turf football boots in black with vivid gold panels and a low rubber turf outsole.

### shoes-10

Edit ONLY the shoes on the original four-by-four 16-frame animation atlas. Keep the exact 4 by 4 cell positions, order, transparent background, character identity, poses, proportions, hands, feet orientation, trousers, shorts, shirts, socks, lighting, top and bottom margins and original canvas dimensions. Replace footwear in every frame of both outfits with the same pair specified below. Edit only areas occupied by the shoes. All 16 frames must remain complete with matching frames and transparent gutters. Genuine RGBA transparency outside the person in each frame. No logos, no words, no new objects.
2010s turquoise lightweight football boots with a slim white sole and white laces.

### shoes-20

Edit ONLY the shoes on the original four-by-four 16-frame animation atlas. Keep the exact 4 by 4 cell positions, order, transparent background, character identity, poses, proportions, hands, feet orientation, trousers, shorts, shirts, socks, lighting, top and bottom margins and original canvas dimensions. Replace footwear in every frame of both outfits with the same pair specified below. Edit only areas occupied by the shoes. All 16 frames must remain complete with matching frames and transparent gutters. Genuine RGBA transparency outside the person in each frame. No logos, no words, no new objects.
2020s lime green low-cut knitted football boots with a contrasting dark navy sole and clean geometric stitching.

### balls-collection

One transparent 5-column by 1-row sprite strip of five separate photorealistic vintage soccer balls for a street football game. Exactly five equal square cells side by side, equal-scale balls completely contained, clear transparent margin on every side. Front three-quarter view, round sphere with realistic seams, studio soft shadows only on the ball, no floor, no text or logos. From left to right: 1980s dark caramel 18-panel stitched leather with a laced seam; 1990s orange rubber black pentagon pattern street ball; early 2000s silver-white synthetic with broad cobalt blue arcs; 2010s warm lime yellow thermobonded ball with navy pinwheel graphic; 2020s off-white textured ball with electric violet and mint angular graphics. Strongly distinct designs, balanced framing, transparent outside the five spheres.

### spectators-iberia

A transparent realistic game sprite atlas, four isolated subjects in an exact 2x2 grid, no background, transparent margins and gutters, no words. Top left: older Spanish woman in a beige cardigan and patterned skirt on a plain stool, with a little paper cone of sunflower seeds, full figure. Top right: three teenage neighborhood friends of varied Mediterranean appearance in unbranded casual clothes standing full length, watching a neighborhood football match. Bottom left: warm middle-aged Spanish neighbor in muted terracotta shirt calling out from a window, show chest-up gesture and no window frame. Bottom right: full body kindly middle aged neighborhood football coach in a navy track jacket with whistle lanyard, dark trousers and sneakers, hands lightly clasped, no text. Soft neutral evening light, realistic faces and fabrics, all artwork stays fully inside each quadrant. No logos, no floor, no shadows outside sprites.

### Повторная обработка прозрачности для обуви 80-х, 2010-х и 2020-х

Remove the hazy gray-white background entirely to TRUE alpha transparency. Isolate the 16 football character cutouts as crisp game sprites, like a professional background removal result. All empty areas around silhouettes and between characters must be totally transparent (alpha 0), with no milky backdrop, colored haze, glows or cast shadows. Keep exact same dimensions, 4×4 cell grid, poses, faces, clothing and especially the existing colored shoes on every character. Do not rearrange or resize the figures, do not change any character colors. Maintain only a very thin soft anti-aliased edge around each opaque silhouette. No graphics or text.
