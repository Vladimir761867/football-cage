# Аудит «Дворового футбола» · версия 18

## Сложность и повторные матчи

У каждого из четырёх режимов уже есть пять уровней. «Собачка» дополнительно ускоряется каждые восемь передач. В «Квадрате» сложность меняет окно приёма, точность ботов и ширину допуска направления. В «Американке» меняются окно тайминга, разброс и точность соперников. В «Навесе» на реакцию вратаря отведено от 0,95 до 0,50 с, а на первых двух уровнях есть стрелка.

После хорошей серии стоит предложить кнопку **«Следующий уровень»** на экране результата. Повышение принимает игрок, уровень сохраняется отдельно для каждого режима. Приведённые ниже пороги подходят для первого теста. Их нужно откалибровать по партиям реальных игроков.

| Режим | Когда предложить сложнее | Что меняется на следующей ступени |
|---|---|---|
| Собачка | Дважды за три матча сделать 12 своих передач подряд с не более чем одной потерей за матч | Один защитник отрезает короткий пас, другой встречает дальний. После нескольких передач в одну сторону они начинают его читать, оставляя другой выход. |
| Квадрат | Дважды за три матча выиграть с максимум двумя штрафами | Соперники чередуют короткие и глубокие мячи. Первый отскок на высоком уровне виден по траектории. Для мастеров подойдёт отдельное испытание на приём после одного отскока. |
| Американка | Дважды выиграть дуэль и за матч поразить хотя бы два вида цели | Серии с обязательным порядком «штанга → перекладина → девятка» и разные позиции мяча. Окно тайминга узкое, точный жест даёт предсказуемый результат. |
| Навес | В двух из трёх партий забить минимум дважды и отбить минимум половину ударов в створ, если таких ударов было хотя бы два | Чередовать ближнюю и дальнюю подачи, угол удара читается по корпусу бьющего и началу траектории. Сложность растёт за счёт выбора и чтения игры. |

На пятом уровне лучше открывать мастерские испытания с отдельными рекордами. Уровень, правила и размеры мишеней фиксируются для общего вызова. Подсказка об ошибке должна объяснять следующий жест. Для «Квадрата» это направление, сила или опоздание. Для «Навеса» это ошибка паса, тайминга или стороны сейва.

Приоритеты по всей игре:

1. На первом экране выбора поднять четыре режима над дополнительными настройками и кубками. Сразу показать одно главное действие для выбранного режима.
2. Добавить реванш на том же дворе, «Уровень выше» и короткую причину результата после партии. Считать успехи отдельно по режимам и уровням, а не по одному суммарному рекорду.
3. Для дружеских комнат убрать ручной ввод сервера после подключения публичного HTTPS. Проверить переподключение и сохранить одинаковые условия для всех участников. Сейчас публичный адрес комнаты нужен отдельно. Счёт в ссылке на асинхронный вызов передаёт сам игрок, поэтому такой счёт подходит для дружеской игры. Общей таблице результатов нужна серверная проверка.
4. Для проверки темпа смотреть долю завершённых первых матчей, выбор реванша, принятие нового уровня, процент попаданий или отборов и возврат на 1-й и 7-й день. Замерять отдельно по режиму и уровню. Это план измерений, данных о реальных игроках пока нет.

## Сравнение витрин и модель покупок

Выборка объединяет прямых конкурентов в мобильном футболе и крупные игры с развитым каталогом косметики. Она описывает механики, которые раскрывают сами разработчики. Данные о выручке и конверсии этих механик не использовались.

| Игра | Что делает | Что применимо здесь |
|---|---|---|
| EA SPORTS FC Mobile | Star Pass за выполнение заданий и матчи, премиальная дорожка и пакеты. [Руководство события EA](https://forums.ea.com/blog/ea-sports-fc-mobile-game-info-hub-en/fc-mobile---team-of-the-season/8036606), [витрина EA](https://store.fcm.ea.com/en-de/easports-fcmobile) | Общий прогресс по четырём режимам и видимая цель следующей награды. |
| eFootball | Монеты за игру и из магазина тратятся в том числе на подписание футболистов. [Руководство Konami](https://www.konami.com/efootball/en/page/overview) | Понятный бесплатный путь к коллекции. Для соревновательных партий «Дворового футбола» параметры игрока остаются общими. |
| Dream League Soccer | Бесплатная и премиальная дорожки, премиальные награды за XP и заметное оформление профиля. Пропуск покупается на один сезон. [Справка First Touch Games](https://support.ftgames.com/hc/en-us/articles/4404070913169-What-is-the-Season-Pass) | Косметика профиля, которую видно другу. Сезон с разовой оплатой подходит, когда хватает заданий и регулярных выпусков. |
| Rocket League | Rocket Pass с оформлением и эффектами гола. В сезоне 20 недельные и сезонные испытания открыли всем. [Описание сезона Psyonix](https://www.rocketleague.com/news/rocket-league-patch-notes-v2-56-season-20-live?lang=en) | Общие испытания для всей аудитории, выразительная анимация гола как отдельная ценность. |
| Fortnite | Каталог покупаемых образов и отдельная дорожка наград за XP. [Epic Games о магазине](https://www.fortnite.com/news/fortnitemares-update-1-8-patch-notes), [пример Battle Pass](https://www.fortnite.com/battle-pass?lang=en-US&tid=21) | Покупатель заранее видит содержимое и примеряет его. Комплект хорошо работает, когда части можно использовать по отдельности. |
| Brawl Stars | Тематический каталог образов, значков и граффити, примерка скинов в тренировке. [Каталог Supercell](https://support.supercell.com/brawl-stars/en/articles/the-catalog-2.html), [примерка](https://support.supercell.com/brawl-stars/en/articles/skins-7.html) | Тематические коллекции и проба мяча, формы, зрителей и эффектов прямо во дворе. |

Рекомендуемое распределение для запуска:

- **Бесплатно.** Четыре режима, обучение, все уровни, базовый двор каждой страны, обычная одежда каждой эпохи, стандартный мяч и базовый редактор. Игра с друзьями и соревнования дают причину возвращаться.
- **За заработанные жетоны.** Дополнительные мячи и форма, цвета ворот и покрытия, часть декора, часть площадок. Первая вещь должна открываться за несколько коротких сессий. В текущем пилоте Мадрид открыт сразу, Севилья и Барселона стоят по 180 жетонов.
- **За деньги после подключения оплаты.** Покупка конкретной вещи и тематические наборы с указанным составом. Пример структуры: отдельный стиль мяча или эмоция, средний набор оформления двора, большой комплект «Триана на закате» с двором, формой, мячом и звуком. Для набора показать каждую часть до покупки, для купленного ранее предмета учитывать его в цене. Начать с пары комплектов и проверять интерес на витрине. Реальных платежей сейчас нет.
- **Позже.** Сезон из бесплатной и премиальной косметических дорожек. Добавлять, когда есть аудитория, ритм выпусков и возможность восстановить покупку на другом устройстве. Сначала замерить, сколько людей примеряют вещь, возвращаются к ней и используют её в матче.

Предметы с лучшей отдачей при расширении каталога:

| Коллекция | Что добавить | Где игрок увидит |
|---|---|---|
| Двор | Лавки, флажки, сетки, рамы, настенные таблички, рисунки мелом, фонари, разные звуки двора | В редакторе, в домашнем матче, у друга по ссылке |
| Зрители | Бабушка с семечками, районные ребята, соседка в окне, затем местные варианты одежды и реплик | За боковой линией и на фасаде |
| Одежда | Отдельные кеды, олимпийки, футболки и аксессуары без изменения характеристик | В примерке, при беге и в воротах |
| Мяч и гол | Фактура мяча, короткий звук сетки, лёгкое свечение после точного попадания | Во время розыгрыша и в повторе |
| Награды | Нашивки за серии передач, сейвы и победы в кубках. Фотоальбом посещённых дворов | На карточке игрока и в подборке достижений |

## Испанский пилот

Площадки вымышлены и используют узнаваемые детали города и эпохи. Мадрид 80-х — кирпич, зелёная ограда и бетон. Триана 2000-х — белые фасады, керамические цоколи и апельсиновые деревья. Барселона 2020-х — современная ограда, синяя площадка и вечерние фонари. Мячи и одежда выбираются по эпохе. Фоны открываются в «Магазин → Дворы → Испания», а «Мой двор» комбинирует площадку и зрителей. Для 90-х и 2010-х в Испании пока нет площадок. [Муниципальные площадки Мадрида](https://www.madrid.es/UnidadWeb/Contenidos/Publicaciones/TemaDeportes/GuiaEquiDepor/Ficheros/06instalaciones%20basicas.pdf), [керамика Трианы](https://www.legacy.visitasevilla.es/historia/ceramica), [спортивные площадки Барселоны](https://ajuntament.barcelona.cat/sants-montjuic/sites/default/files/documentacio/balanc_i_propostes_de_les_necessitats_dequipaments_al_poble-sec_2016_0.pdf).

На экране 360 × 740 проверены запуск четырёх режимов на мадридской площадке, переключение стран, фильтр эпохи, недостаток жетонов при покупке, сохранение четырёх деталей и их передача по ссылке. Автоматические проверки дополнительно покрывают механику матчей, кубки, комнаты и совместимость приглашений.

Файлы фонов: `assets/madrid.webp`, `assets/sevilla.webp`, `assets/barcelona.webp`. Атлас декора: `assets/yard-spectators.webp`. Изображения созданы встроенным ImageGen и сохранены в WebP. Ниже записаны использованные запросы.

### madrid

Create a photorealistic mobile street football game background. Portrait 2:3, symmetrical eye-level wide-angle camera looking straight at the far end of a playable small neighborhood futsal court. ONE white painted steel rectangular soccer goal with natural net, perfectly front-on, feet level, centered horizontally. Goal opening target rectangle at 35%-65% of image width and 33%-47% of image height. Place the far wall and whole goal in the middle distance. The entire lower 52% is empty continuous level playing surface with subtle material texture and minimal muted futsal lines, room for game characters to be drawn later. The top half shows recognizably local buildings with windows and sky. Leave the left and right borders by the goal feet clear for optional spectator cutouts. Quiet nostalgic documentary-style scene, detailed natural surfaces. No people, no ball, no commercial signs, no logos, no text, no additional goals or hoops.
Madrid, Spain, late 1980s. Working-class neighborhood enclosed concrete futsal court bordered by low olive green railings and reddish brick residential apartment blocks, dark metal balconies and striped retractable awnings, mature plane trees, blue late-summer dusk, warm window light, dusty warm gray concrete. A restrained naturalistic period setting.

### sevilla

Create a photorealistic mobile street football game background. Portrait 2:3, symmetrical eye-level wide-angle camera looking straight at the far end of a playable small neighborhood futsal court. ONE white painted steel rectangular soccer goal with natural net, perfectly front-on, feet level, centered horizontally. Goal opening target rectangle at 35%-65% of image width and 33%-47% of image height. Place the far wall and whole goal in the middle distance. The entire lower 52% is empty continuous level playing surface with subtle material texture and minimal muted futsal lines, room for game characters to be drawn later. The top half shows recognizably local buildings with windows and sky. Leave the left and right borders by the goal feet clear for optional spectator cutouts. Quiet nostalgic documentary-style scene, detailed natural surfaces. No people, no ball, no commercial signs, no logos, no text, no additional goals or hoops.
Triana, Seville, Spain, around the 2000s. Small neighborhood court with smooth reddish outdoor concrete, white stucco homes with dark iron balconies and restrained blue-and-white ceramic tile at the base, orange trees outside play space, soft amber sunset and terracotta rooftops.

### barcelona

Create a photorealistic mobile street football game background. Portrait 2:3, symmetrical eye-level wide-angle camera looking straight at the far end of a playable small neighborhood futsal court. ONE white painted steel rectangular soccer goal with natural net, perfectly front-on, feet level, centered horizontally. Goal opening target rectangle at 35%-65% of image width and 33%-47% of image height. Place the far wall and whole goal in the middle distance. The entire lower 52% is empty continuous level playing surface with subtle material texture and minimal muted futsal lines, room for game characters to be drawn later. The top half shows recognizably local buildings with windows and sky. Leave the left and right borders by the goal feet clear for optional spectator cutouts. Quiet nostalgic documentary-style scene, detailed natural surfaces. No people, no ball, no commercial signs, no logos, no text, no additional goals or hoops.
Barcelona, Spain, 2020s. Modern public neighborhood futsal court of dark slate blue outdoor concrete with subtle wear, airy wire perimeter fence behind the goal, dense ochre apartment blocks with contemporary balconies and a few old balconies, Mediterranean trees, cool blue dusk with warm window highlights and municipal lighting.

### crowd

Transparent game asset sprite sheet, 2×2 equal quadrants, each has an isolated cutout, strict clear transparent gutters. Realistic documentary texture and warm soft evening light, all oriented toward a small football pitch viewed from the front. Top left: a grandmother in a plain muted blue cardigan and headscarf seated on a small simple stool, snacking on sunflower seeds held in a paper cone, full body and stool visible. Top right: three teenage neighborhood boys in ordinary unbranded sportswear hanging out side by side watching the match, full bodies visible, relaxed friendly poses. Bottom left: a single middle-aged woman chest-up leaning forward and calling out, raising one open hand slightly, no window frame or backdrop. Bottom right: a plain weathered wooden park bench front view with dark metal legs. Each subject must fit entirely into its own quadrant, similar natural proportions and warm realistic textures. No background, no text, no borders, no lettering.
