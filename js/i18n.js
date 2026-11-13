/* Russian source strings and their localized UI equivalents. */
const I18n = (() => {
  const languages = {ru:'Русский',en:'English',es:'Español',zh:'简体中文',pt:'Português',hi:'हिन्दी'};
  const data = `
Дворовый футбол|Street Football|Fútbol de barrio|街头足球|Futebol de bairro|गली फ़ुटबॉल
Дворовый|Street|Fútbol de|街头|Futebol de|गली
футбол|Football|barrio|足球|bairro|फ़ुटबॉल
Язык|Language|Idioma|语言|Idioma|भाषा
Играть|Play|Jugar|开始游戏|Jogar|खेलें
С друзьями|Play with friends|Jugar con amigos|和好友玩|Jogar com amigos|दोस्तों के साथ खेलें
Вызов дня|Daily challenge|Reto diario|每日挑战|Desafio diário|दैनिक चुनौती
Тренировка|Practice|Entrenamiento|训练|Treino|अभ्यास
Магазин|Shop|Tienda|商店|Loja|दुकान
Коллекции|Collections|Colecciones|收藏|Coleções|संग्रह
Все предметы доступны бесплатно|All items are free|Todos los artículos son gratis|所有物品均免费|Todos os itens são gratuitos|सभी आइटम मुफ़्त हैं
Политика конфиденциальности|Privacy policy|Política de privacidad|隐私政策|Política de privacidade|गोपनीयता नीति
Игровое поле|Playing field|Cancha de juego|比赛场地|Campo de jogo|खेल का मैदान
Мой двор онлайн|My online court|Mi cancha en línea|我的在线球场|Minha quadra online|मेरा ऑनलाइन मैदान
Мой двор|My court|Mi cancha|我的球场|Minha quadra|मेरा मैदान
Одежда|Clothing|Ropa|服装|Roupas|कपड़े
Альбом и нашивки|Album and badges|Álbum e insignias|相册和徽章|Álbum e distintivos|एल्बम और बैज
Альбом дворов|Court album|Álbum de canchas|球场相册|Álbum de quadras|मैदानों का एल्बम
Альбом|Album|Álbum|相册|Álbum|एल्बम
Нашивки|Badges|Insignias|徽章|Distintivos|बैज
Фотографии|Photos|Fotos|照片|Fotos|फ़ोटो
Настройки|Settings|Ajustes|设置|Configurações|सेटिंग्स
Звук|Sound|Sonido|声音|Som|आवाज़
Вибрация|Vibration|Vibración|振动|Vibração|कंपन
Обновить игру|Refresh game|Actualizar juego|刷新游戏|Atualizar jogo|गेम रीफ़्रेश करें
Версия|Version|Versión|版本|Versão|संस्करण
Сложность|Difficulty|Dificultad|难度|Dificuldade|कठिनाई
Уровень|Level|Nivel|等级|Nível|स्तर
Знакомство|Beginner|Principiante|入门|Iniciante|शुरुआती
Разминка|Warm-up|Calentamiento|热身|Aquecimento|वार्म-अप
Двор|Street|Barrio|街头|Bairro|गली
Мастер|Master|Maestro|大师|Mestre|मास्टर
Легенда|Legend|Leyenda|传奇|Lenda|लीजेंड
Собачка|Rondo|Rondo|抢圈|Bobinho|रोंडो
Квадрат|Four Square|Cuadrado|方格足球|Quadrado|चार खाने
Американка|Target Shots|Tiros a dianas|射门打靶|Chutes ao alvo|निशाने पर शॉट
Навес|Crosses|Centros|传中射门|Cruzamentos|क्रॉस पर शॉट
Испытания|Challenges|Retos|挑战|Desafios|चुनौतियाँ
Испытания двора|Court challenges|Retos de la cancha|球场挑战|Desafios da quadra|मैदान की चुनौतियाँ
Быстрая дуэль|Quick duel|Duelo rápido|快速对决|Duelo rápido|तेज़ मुकाबला
Смена водящего|Switch defenders|Cambiar defensor|轮换抢球者|Trocar marcador|डिफेंडर बदलें
Кубки двора|Court cups|Copas de la cancha|球场杯赛|Copas da quadra|मैदान कप
Кубок квадрата|Four Square Cup|Copa del cuadrado|方格杯赛|Copa do quadrado|चार खाने का कप
Кубок американки|Target Shots Cup|Copa de tiros|射门打靶杯赛|Copa de chutes ao alvo|निशानेबाज़ी कप
Турнир квадрата|Four Square tournament|Torneo de cuadrado|方格足球锦标赛|Torneio de quadrado|चार खाने का टूर्नामेंट
Турнир американки|Target Shots tournament|Torneo de tiros|射门打靶锦标赛|Torneio de chutes ao alvo|निशानेबाज़ी टूर्नामेंट
Турниры|Tournaments|Torneos|锦标赛|Torneios|टूर्नामेंट
Таблица турнира|Tournament standings|Tabla del torneo|赛事积分榜|Tabela do torneio|टूर्नामेंट तालिका
Полуфинал|Semifinal|Semifinal|半决赛|Semifinal|सेमीफ़ाइनल
Финал|Final|Final|决赛|Final|फ़ाइनल
Отбор|Qualifier|Clasificación|资格赛|Classificatória|क्वालिफ़ायर
Партия|Round|Ronda|轮次|Rodada|राउंड
Сет|Set|Set|盘|Set|सेट
Сеты|Sets|Sets|盘数|Sets|सेट
Быстрые пасы под прессингом, 4×1 или 5×2.|Quick passes under pressure, 4×1 or 5×2.|Pases rápidos bajo presión, 4×1 o 5×2.|在逼抢下快速传球，4 对 1 或 5 对 2。|Passes rápidos sob pressão, 4×1 ou 5×2.|दबाव में तेज़ पास, 4×1 या 5×2।
Отбей до второго отскока. На 10 штрафах — вылет.|Return before the second bounce. Ten penalties knock you out.|Devuelve antes del segundo bote. Diez faltas te eliminan.|在第二次落地前回球。累计 10 次失误出局。|Devolva antes do segundo quique. Dez faltas eliminam.|दूसरी उछाल से पहले गेंद लौटाएँ। दस पेनल्टी पर बाहर।
Попадай в раму и углы. Цель — 300 очков.|Aim for the frame and corners. Reach 300 points.|Apunta al marco y a las esquinas. Llega a 300 puntos.|瞄准门框和角落，拿到 300 分。|Acerte a trave e os cantos. Chegue a 300 pontos.|फ्रेम और कोनों पर निशाना लगाएँ। लक्ष्य 300 अंक।
Партнёры подают. Твой ход — удар по воротам.|Teammates cross. You finish.|Tus compañeros centran. Tú rematas.|队友传中，由你射门。|Os colegas cruzam. Você finaliza.|साथी क्रॉस करेंगे। आप शॉट लगाएँ।
Коснись партнёра сбоку или сделай короткий свайп к нему.|Tap a teammate or swipe briefly toward them.|Toca a un compañero o desliza hacia él.|点击队友，或向队友短滑。|Toque num colega ou deslize na direção dele.|साथी पर टैप करें या उसकी ओर छोटा स्वाइप करें।
Тап по партнёру или короткий свайп|Tap a teammate or swipe|Toca a un compañero o desliza|点击队友或短滑|Toque num colega ou deslize|साथी पर टैप या स्वाइप करें
Ты внизу слева. Коснись соперника или свайпни в его сторону.|You start at bottom left. Tap or swipe toward a rival.|Estás abajo a la izquierda. Toca al rival o desliza hacia él.|你在左下方。点击对手或向对手滑动。|Você está embaixo à esquerda. Toque ou deslize até o rival.|आप नीचे बाएँ हैं। प्रतिद्वंद्वी पर टैप करें या उसकी ओर स्वाइप करें।
Отбей до второго отскока. Тап по сопернику или свайп.|Return before the second bounce. Tap or swipe toward a rival.|Devuelve antes del segundo bote. Toca al rival o desliza hacia él.|在第二次落地前回球。点击对手或滑向对手。|Devolva antes do segundo quique. Toque no rival ou deslize.|दूसरी उछाल से पहले लौटाएँ। प्रतिद्वंद्वी पर टैप या स्वाइप करें।
Твой мяч. Тап или свайп к сопернику.|Your ball. Tap or swipe toward a rival.|Tu balón. Toca o desliza hacia el rival.|轮到你。点击对手或滑向对手。|Sua bola. Toque ou deslize até o rival.|आपकी गेंद। प्रतिद्वंद्वी पर टैप या स्वाइप करें।
Твой удар. Свайп вверх к цели.|Your shot. Swipe up toward the target.|Tu tiro. Desliza hacia arriba al objetivo.|轮到你射门。向目标上滑。|Seu chute. Deslize para cima até o alvo.|आपका शॉट। निशाने की ओर ऊपर स्वाइप करें।
Свайп вверх. Отпусти, когда бегунок в золотой зоне.|Swipe up and release in the gold zone.|Desliza hacia arriba y suelta en la zona dorada.|向上滑动，在金色区域松手。|Deslize para cima e solte na zona dourada.|ऊपर स्वाइप करें और सुनहरे क्षेत्र में छोड़ें।
Свайпни вверх к центру ворот. Пунктир покажет цель.|Swipe up toward the center. The dotted line shows your aim.|Desliza al centro de la portería. La línea de puntos indica el tiro.|向球门中央上滑，虚线显示瞄准方向。|Deslize para o centro do gol. A linha pontilhada mostra a mira.|गोल के बीच की ओर स्वाइप करें। बिंदीदार रेखा निशाना दिखाती है।
Целься мимо вратаря. Отпусти свайп в золотой зоне.|Aim past the keeper and release in the gold zone.|Evita al portero y suelta en la zona dorada.|避开门将，在金色区域松手。|Mire longe do goleiro e solte na zona dourada.|गोलकीपर से दूर निशाना लगाएँ और सुनहरे क्षेत्र में छोड़ें।
Партнёры подают. Отпусти свайп к углу ворот, пока кольцо золотое.|Teammates cross. Swipe to a corner and release when the ring is gold.|Tus compañeros centran. Desliza a una esquina y suelta cuando el aro sea dorado.|队友传中。向角落滑动，圆环变金时松手。|Os colegas cruzam. Deslize para um canto e solte quando o anel estiver dourado.|साथी क्रॉस करेंगे। कोने की ओर स्वाइप करें और घेरा सुनहरा हो तो छोड़ें।
Выбери подачу. Партнёр навесит, твой ход — удар.|Choose the cross. Your teammate delivers, you shoot.|Elige el centro. Tu compañero centra y tú rematas.|选择传中方式。队友传球，你来射门。|Escolha o cruzamento. O colega cruza e você chuta.|क्रॉस चुनें। साथी गेंद देगा, आप शॉट लगाएँ।
Свайп к углу. Отпусти палец, пока кольцо золотое.|Swipe to a corner and release when the ring is gold.|Desliza a una esquina y suelta con el aro dorado.|向角落滑动，金环亮起时松手。|Deslize para um canto e solte quando o anel estiver dourado.|कोने की ओर स्वाइप करें और घेरा सुनहरा हो तो छोड़ें।
На ближнюю|Near post|Primer palo|近门柱|Primeira trave|नज़दीकी पोस्ट
На дальнюю|Far post|Segundo palo|远门柱|Segunda trave|दूर की पोस्ट
На воротах|Keeper|Portero|门将|Goleiro|गोलकीपर
Розыгрыш|Play|Jugada|回合|Jogada|चाल
Удары по воротам|Shots on goal|Tiros a portería|射门练习|Chutes a gol|गोल पर शॉट
Удары по мишеням|Target practice|Práctica de tiro|打靶训练|Treino de mira|निशाने का अभ्यास
Против вратаря|Against the keeper|Contra el portero|挑战门将|Contra o goleiro|गोलकीपर के खिलाफ़
Удары|Shots|Tiros|射门|Chutes|शॉट
ударов|shots|tiros|次射门|chutes|शॉट
Голы|Goals|Goles|进球|Gols|गोल
Гол|Goal|Gol|进球|Gol|गोल
Сейвы|Saves|Paradas|扑救|Defesas|बचाव
Вратарь отбил|Keeper saved it|Parada del portero|门将扑救成功|Defesa do goleiro|गोलकीपर ने बचाया
Ты|You|Tú|你|Você|आप
ТЫ|YOU|TÚ|你|VOCÊ|आप
Игрок|Player|Jugador|球员|Jogador|खिलाड़ी
Очки|Points|Puntos|分数|Pontos|अंक
очков|points|puntos|分|pontos|अंक
очк.|pts|pts|分|pts|अंक
Команда|Team|Equipo|队伍|Equipe|टीम
Потери|Turnovers|Pérdidas|丢球|Perdas|गेंद खोई
Темп|Pace|Ritmo|节奏|Ritmo|गति
Цель|Goal|Objetivo|目标|Meta|लक्ष्य
Перекладина|Crossbar|Larguero|横梁|Travessão|क्रॉसबार
ПЕРЕКЛАДИНА|CROSSBAR|LARGUERO|横梁|TRAVESSÃO|क्रॉसबार
Штанга|Post|Palo|门柱|Trave|पोस्ट
Девятка|Top corner|Escuadra|球门上角|Ângulo|ऊपरी कोना
Мимо|Miss|Fuera|射偏|Para fora|चूक
Слишком рано|Too early|Demasiado pronto|太早|Cedo demais|बहुत जल्दी
Не успел|Too late|Demasiado tarde|太迟|Tarde demais|बहुत देर
Мяч упал|Ball dropped|Cayó el balón|球已落地|A bola caiu|गेंद गिर गई
Точная передача|Accurate pass|Pase preciso|传球精准|Passe preciso|सटीक पास
Мяч за линией|Ball out|Balón fuera|球出界|Bola fora|गेंद बाहर
Два отскока|Two bounces|Dos botes|两次落地|Dois quiques|दो उछाल
штраф|penalty|falta|失误|falta|पेनल्टी
Победа|Victory|Victoria|获胜|Vitória|जीत
Ничья|Draw|Empate|平局|Empate|ड्रॉ
Матч окончен|Match finished|Partido terminado|比赛结束|Partida encerrada|मैच समाप्त
Серия окончена|Series finished|Serie terminada|系列结束|Série encerrada|सीरीज़ समाप्त
Тренировка окончена|Practice finished|Entrenamiento terminado|训练结束|Treino encerrado|अभ्यास समाप्त
Серия навесов завершена|Crossing drill finished|Ejercicio de centros terminado|传中训练结束|Treino de cruzamentos encerrado|क्रॉस अभ्यास समाप्त
Ты выбыл|You are out|Estás eliminado|你已出局|Você foi eliminado|आप बाहर हैं
Время вышло|Time ran out|Se acabó el tiempo|时间到|O tempo acabou|समय समाप्त
Получилось|Well done|Bien hecho|做得好|Muito bem|शाबाश
К тренировкам|Back to practice|Volver al entrenamiento|返回训练|Voltar ao treino|अभ्यास पर लौटें
Пауза|Paused|Pausa|暂停|Pausa|रुका हुआ
Продолжить|Continue|Continuar|继续|Continuar|जारी रखें
Выйти|Leave|Salir|退出|Sair|बाहर निकलें
Назад|Back|Atrás|返回|Voltar|वापस
Закрыть|Close|Cerrar|关闭|Fechar|बंद करें
Готово|Done|Listo|完成|Pronto|हो गया
Сохранить|Save|Guardar|保存|Salvar|सहेजें
Сыграть|Play|Jugar|开始|Jogar|खेलें
Ещё раз|Play again|Jugar otra vez|再玩一次|Jogar de novo|फिर खेलें
В меню|Back to menu|Volver al menú|返回菜单|Voltar ao menu|मेनू पर लौटें
Начать матч|Start match|Empezar partido|开始比赛|Começar partida|मैच शुरू करें
Сразу в матч|Play match|Jugar partido|直接比赛|Jogar partida|मैच खेलें
Обучение|Tutorial|Tutorial|教程|Tutorial|ट्यूटोरियल
Пропустить обучение|Skip tutorial|Saltar tutorial|跳过教程|Pular tutorial|ट्यूटोरियल छोड़ें
Начать кубок|Start cup|Empezar copa|开始杯赛|Começar copa|कप शुरू करें
Соперники|Opponents|Rivales|对手|Adversários|प्रतिद्वंद्वी
К матчу|Back to match|Volver al partido|返回比赛|Voltar à partida|मैच पर लौटें
Новая комната|New room|Nueva sala|新房间|Nova sala|नया कमरा
Ссылка на комнату|Room link|Enlace de la sala|房间链接|Link da sala|कमरे का लिंक
Пригласить друзей|Invite friends|Invitar amigos|邀请好友|Convidar amigos|दोस्त बुलाएँ
Приглашение в комнату|Room invitation|Invitación a la sala|房间邀请|Convite para a sala|कमरे का निमंत्रण
Приглашение во двор|Court invitation|Invitación a la cancha|球场邀请|Convite para a quadra|मैदान का निमंत्रण
Пригласить во двор|Invite to court|Invitar a la cancha|邀请加入球场|Convidar para a quadra|मैदान में बुलाएँ
Название команды|Team name|Nombre del equipo|队名|Nome da equipe|टीम का नाम
Название двора|Court name|Nombre de la cancha|球场名称|Nome da quadra|मैदान का नाम
Код комнаты|Room code|Código de sala|房间代码|Código da sala|कमरे का कोड
Адрес сервера комнат|Room server address|Dirección del servidor|房间服务器地址|Endereço do servidor|कमरा सर्वर का पता
Войти по коду|Join by code|Entrar con código|输入代码加入|Entrar com código|कोड से जुड़ें
Квадрат на четверых|Four-player Square|Cuadrado para cuatro|四人方格足球|Quadrado para quatro|चार खिलाड़ियों का स्क्वेयर
двое|two players|dos jugadores|两人|dois jogadores|दो खिलाड़ी
четверо|four players|cuatro jugadores|四人|quatro jogadores|चार खिलाड़ी
Ждём|Waiting|En espera|等待中|Aguardando|प्रतीक्षा
Комната|Room|Sala|房间|Sala|कमरा
Комната закрыта|Room closed|Sala cerrada|房间已关闭|Sala fechada|कमरा बंद है
Матч начнётся, когда все войдут.|The match starts when everyone joins.|El partido empieza cuando entren todos.|所有玩家加入后开始比赛。|A partida começa quando todos entrarem.|सभी के जुड़ने पर मैच शुरू होगा।
Подключение|Connecting|Conectando|连接中|Conectando|कनेक्ट हो रहा है
Ход|Turn|Turno|回合|Vez|बारी
Победитель турнира|Tournament winner|Ganador del torneo|赛事冠军|Vencedor do torneio|टूर्नामेंट विजेता
Счёт по сетам|Set scores|Marcador por sets|各盘比分|Placar dos sets|सेट स्कोर
Создать онлайн-двор|Create an online court|Crear cancha en línea|创建在线球场|Criar quadra online|ऑनलाइन मैदान बनाएँ
Создать этот двор онлайн|Open this court online|Abrir esta cancha en línea|将此球场开放为在线球场|Abrir esta quadra online|इस मैदान को ऑनलाइन खोलें
Создать другой двор|Create another court|Crear otra cancha|创建其他球场|Criar outra quadra|दूसरा मैदान बनाएँ
Создать двор|Create court|Crear cancha|创建球场|Criar quadra|मैदान बनाएँ
Вступить во двор|Join a court|Unirse a la cancha|加入球场|Entrar na quadra|मैदान से जुड़ें
Войти во двор|Join court|Entrar en la cancha|进入球场|Entrar na quadra|मैदान में जाएँ
Во двор|Back to court|Volver a la cancha|返回球场|Voltar à quadra|मैदान पर लौटें
Рейтинг двора|Court leaderboard|Clasificación de la cancha|球场排行榜|Ranking da quadra|मैदान रैंकिंग
Обновить комнаты|Refresh rooms|Actualizar salas|刷新房间列表|Atualizar salas|कमरे रीफ़्रेश करें
Победа — 3 очка, ничья — 1.|Win: 3 points. Draw: 1.|Victoria: 3 puntos. Empate: 1.|胜利得 3 分，平局得 1 分。|Vitória: 3 pontos. Empate: 1.|जीत: 3 अंक। ड्रॉ: 1 अंक।
Здесь появятся результаты после первого матча во дворе.|Results will appear after the first court match.|Los resultados aparecerán después del primer partido.|首场球场比赛结束后显示结果。|Os resultados aparecem após a primeira partida.|पहले मैच के बाद नतीजे यहाँ दिखेंगे।
По этой ссылке друзья смогут вступить во двор.|Friends can join this court with this link.|Tus amigos pueden unirse a la cancha con este enlace.|好友可通过此链接加入球场。|Os amigos podem entrar na quadra por este link.|दोस्त इस लिंक से मैदान से जुड़ सकते हैं।
Ссылка|Link|Enlace|链接|Link|लिंक
Копировать|Copy|Copiar|复制|Copiar|कॉपी करें
Ссылка скопирована|Link copied|Enlace copiado|链接已复制|Link copiado|लिंक कॉपी हो गया
Вызвать друга|Challenge a friend|Retar a un amigo|挑战好友|Desafiar um amigo|दोस्त को चुनौती दें
Повтор момента|Replay|Repetición|回放|Replay|रीप्ले
Дворы|Courts|Canchas|球场|Quadras|मैदान
Мячи|Balls|Balones|足球|Bolas|गेंदें
Комплекты|Kits|Conjuntos|套装|Uniformes|किट
Обувь|Footwear|Calzado|球鞋|Calçados|जूते
Страна|Country|País|国家|País|देश
Площадка|Court|Cancha|球场|Quadra|मैदान
Сезон|Season|Estación|季节|Estação|मौसम
Покрытие|Surface|Superficie|场地表面|Piso|सतह
Ворота|Goal|Portería|球门|Gol|गोलपोस्ट
Свет|Lighting|Iluminación|照明|Iluminação|रोशनी
Россия|Russia|Rusia|俄罗斯|Rússia|रूस
Испания|Spain|España|西班牙|Espanha|स्पेन
Бразилия|Brazil|Brasil|巴西|Brasil|ब्राज़ील
Китай|China|China|中国|China|चीन
Индия|India|India|印度|Índia|भारत
Лето|Summer|Verano|夏季|Verão|गर्मी
Зима|Winter|Invierno|冬季|Inverno|सर्दी
Все|All|Todo|全部|Tudo|सभी
Выбрать|Select|Elegir|选择|Selecionar|चुनें
Выбран|Selected|Elegido|已选择|Selecionado|चुना गया
Бесплатно|Free|Gratis|免费|Grátis|मुफ़्त
Для теста|For testing|En pruebas|测试内容|Para teste|परीक्षण के लिए
Тестовый доступ · весь каталог открыт|Test access · all items unlocked|Acceso de prueba · catálogo abierto|测试期间全部内容开放|Acesso de teste · catálogo aberto|परीक्षण के लिए पूरी सूची खुली है
По эпохам|By era|Por época|按年代|Por época|दशक के अनुसार
Дворовая одежда|Streetwear|Ropa de calle|街头服装|Roupa casual|गली के कपड़े
Футбольная форма|Football kit|Equipación|足球队服|Uniforme de futebol|फ़ुटबॉल किट
Примерить и надеть|Try on and wear|Probar y equipar|试穿并装备|Experimentar e vestir|पहनकर देखें
Примерить|Try on|Probar|试穿|Experimentar|पहनकर देखें
Надеть|Wear|Equipar|装备|Vestir|पहनें
Надет|Equipped|Equipado|已装备|Equipado|पहना हुआ
Детали и зрители|Details and spectators|Detalles y público|装饰和观众|Detalhes e torcida|सजावट और दर्शक
Наборы оформления|Decor sets|Conjuntos decorativos|装饰套装|Conjuntos de decoração|सजावट के सेट
Вызов в моём дворе|Challenge on my court|Reto en mi cancha|在我的球场发起挑战|Desafio na minha quadra|मेरे मैदान की चुनौती
Золотая зона|Gold zone|Zona dorada|金色区域|Zona dourada|सुनहरा क्षेत्र
шкалы|of the bar|de la barra|进度条|da barra|बार का
до первого отскока|to first bounce|hasta el primer bote|至第一次落地|até o primeiro quique|पहली उछाल तक
на пас|to pass|para pasar|传球时间|para passar|पास के लिए
Подача|Cross|Centro|传中|Cruzamento|क्रॉस
окно удара|shot window|ventana de tiro|射门窗口|janela de chute|शॉट का समय
Вратарь реагирует за|Keeper reacts in|El portero reacciona en|门将反应时间|O goleiro reage em|गोलकीपर की प्रतिक्रिया
мс|ms|ms|毫秒|ms|मि॰से॰
Сервер комнат недоступен|Room server unavailable|Servidor no disponible|房间服务器不可用|Servidor indisponível|कमरा सर्वर उपलब्ध नहीं है
Введи название команды|Enter a team name|Introduce un nombre de equipo|请输入队名|Digite o nome da equipe|टीम का नाम दर्ज करें
Введи название двора|Enter a court name|Introduce un nombre para la cancha|请输入球场名称|Digite o nome da quadra|मैदान का नाम दर्ज करें
Двор не найден|Court not found|Cancha no encontrada|找不到球场|Quadra não encontrada|मैदान नहीं मिला
Комната не найдена|Room not found|Sala no encontrada|找不到房间|Sala não encontrada|कमरा नहीं मिला
Введи шестизначный код из приглашения|Enter the six-character invite code|Introduce el código de seis caracteres|请输入六位邀请代码|Digite o código de seis caracteres|निमंत्रण का छह अक्षरों वाला कोड दर्ज करें
По этому адресу нет сервера комнат|No room server at this address|No hay servidor en esta dirección|此地址没有房间服务器|Não há servidor neste endereço|इस पते पर कमरा सर्वर नहीं है
Для игры по этой ссылке нужен адрес сервера комнат. Вставь адрес или открой приглашение.|Enter the room server address or open an invitation link.|Introduce la dirección del servidor o abre una invitación.|请输入房间服务器地址，或打开邀请链接。|Digite o endereço do servidor ou abra um convite.|कमरा सर्वर का पता दर्ज करें या निमंत्रण लिंक खोलें।
Комната заполнена или матч уже начался|Room is full or the match has started|La sala está llena o el partido ya empezó|房间已满或比赛已开始|A sala está cheia ou a partida já começou|कमरा भर गया है या मैच शुरू हो चुका है
Твоя команда уже заняла место в комнате|Your team already has a seat|Tu equipo ya tiene plaza en la sala|你的队伍已经加入房间|Sua equipe já tem uma vaga na sala|आपकी टीम पहले से कमरे में है
Такое название команды уже занято в этом дворе|That team name is already taken in this court|Ese nombre de equipo ya está ocupado en esta cancha|该队名已在此球场使用|Esse nome de equipe já está em uso nesta quadra|इस मैदान में यह टीम नाम पहले से है
Вступи в этот двор по приглашению|Use the invitation to join this court|Únete a la cancha con una invitación|请通过邀请加入此球场|Use o convite para entrar nesta quadra|निमंत्रण से इस मैदान में जुड़ें
Сервер комнат нужно обновить для этого формата.|Update the room server to use this format.|Actualiza el servidor para usar este formato.|此模式需要更新房间服务器。|Atualize o servidor para usar este formato.|इस प्रारूप के लिए कमरा सर्वर अपडेट करें।
Код|Code|Código|代码|Código|कोड
Отправь ссылку всем участникам.|Send the link to all players.|Envía el enlace a todos los jugadores.|把链接发给所有玩家。|Envie o link a todos os jogadores.|सभी खिलाड़ियों को लिंक भेजें।
Скопируй выделенную ссылку|Copy the selected link|Copia el enlace seleccionado|复制已选中的链接|Copie o link selecionado|चुना हुआ लिंक कॉपी करें
В редактор|Back to editor|Volver al editor|返回编辑器|Voltar ao editor|एडिटर पर लौटें
Сетевой матч продолжается, пока открыто это окно. Выход закроет начатую партию.|The online match continues. Leaving closes the room.|El partido sigue en línea. Si sales, se cierra la sala.|在线比赛仍在继续。退出将关闭房间。|A partida online continua. Sair fecha a sala.|ऑनलाइन मैच जारी है। बाहर निकलने पर कमरा बंद होगा।
Выйти из матча? Прогресс партии не сохранится.|Leave the match? Match progress will be lost.|¿Salir del partido? Se perderá el progreso.|退出比赛？本局进度将丢失。|Sair da partida? O progresso será perdido.|मैच छोड़ें? इस मैच की प्रगति मिट जाएगी।
Классический двор|Classic court|Cancha clásica|经典球场|Quadra clássica|क्लासिक मैदान
Косметика — только стиль. На игру не влияет.|Cosmetics change your look only.|Los cosméticos solo cambian la apariencia.|外观道具仅改变样式。|Os itens cosméticos mudam só o visual.|कॉस्मेटिक आइटम केवल रूप बदलते हैं।
Все предметы — косметика. Физика мяча и правила одинаковы для всех.|All items are cosmetic. Ball physics and rules are the same for everyone.|Todos los artículos son cosméticos. La física y las reglas son iguales para todos.|所有道具均为外观。球的物理和规则对所有玩家相同。|Todos os itens são cosméticos. A física e as regras são iguais para todos.|सभी आइटम कॉस्मेटिक हैं। गेंद और खेल के नियम सभी के लिए समान हैं।
Рекорд|Best|Récord|最佳纪录|Recorde|सर्वश्रेष्ठ
Первый розыгрыш|First play|Primera jugada|首次回合|Primeira jogada|पहली चाल
Теперь попробуй в матче.|Now try it in a match.|Ahora inténtalo en un partido.|现在去比赛试试吧。|Agora tente em uma partida.|अब मैच में आज़माएँ।
Вызов выполнен|Challenge complete|Reto completado|挑战完成|Desafio concluído|चुनौती पूरी
Можно точнее|Try again|Inténtalo otra vez|再试一次|Tente de novo|फिर कोशिश करें
Первый отскок — отбивай|First bounce — return it|Primer bote: devuelve el balón|第一次落地，回球|Primeiro quique: devolva|पहली उछाल — गेंद लौटाएँ
Остался последним|Last player standing|Último jugador en pie|你坚持到了最后|Último jogador de pé|आख़िरी बचे खिलाड़ी
точных отбиваний|accurate returns|devoluciones precisas|次精准回球|devoluções precisas|सटीक रिटर्न
Все остальные набрали по 10 штрафов|All other players reached 10 penalties|Los demás llegaron a 10 faltas|其他球员均累计 10 次失误|Os outros jogadores chegaram a 10 faltas|बाकी खिलाड़ियों के 10 पेनल्टी हुए
Два отскока в своей части — штрафное очко|Two bounces in your zone count as one penalty|Dos botes en tu zona cuentan como una falta|球在你的区域落地两次，记一次失误|Dois quiques na sua área contam como uma falta|अपने हिस्से में दो उछाल पर एक पेनल्टी
Партия завершена по времени — победитель не определён|Time ran out. No winner was decided.|Se acabó el tiempo. No hay ganador.|时间到，本局无胜者。|O tempo acabou sem vencedor.|समय समाप्त। कोई विजेता नहीं।
Ход соперников|Opponents shooting|Turno de los rivales|对手回合|Vez dos adversários|प्रतिद्वंद्वियों की बारी
Слабый удар|Weak shot|Tiro flojo|射门太轻|Chute fraco|कमज़ोर शॉट
Слишком сильный удар|Too much power|Demasiada fuerza|力量过大|Chute muito forte|शॉट बहुत तेज़
Время удара вышло|Shot timed out|Tiempo de tiro agotado|射门超时|Tempo de chute esgotado|शॉट का समय समाप्त
С лёта|Volley|Volea|凌空射门|Voleio|वॉली
Головой|Header|Cabezazo|头球|Cabeceio|हेडर
Направь свайп вверх, к углу ворот|Swipe up toward a corner|Desliza hacia arriba a una esquina|向球门角落上滑|Deslize para cima até um canto|कोने की ओर ऊपर स्वाइप करें
Пять ударов по раме и углам|Five shots at the frame and corners|Cinco tiros al marco y a las esquinas|瞄准门框和角落射门五次|Cinco chutes na trave e nos cantos|फ्रेम और कोनों पर पाँच शॉट
По пять ударов каждому · победа по сумме очков|Five shots each · most points wins|Cinco tiros por jugador · gana la mayor puntuación|每人五次射门，积分最高者胜|Cinco chutes por pessoa · vence quem somar mais pontos|हर खिलाड़ी के पाँच शॉट · सबसे ज़्यादा अंक पर जीत
мимо или в каркас|off target or off the frame|fuera o al marco|次射偏或击中门框|para fora ou na trave|चूक या फ्रेम पर
из 10 голов|goals out of 10|goles de 10|球，共 10 次射门|gols em 10 chutes|गोल, 10 में से
Звон перекладины|Crossbar challenge|Reto del larguero|横梁挑战|Desafio do travessão|क्रॉसबार चुनौती
Три цели|Three targets|Tres objetivos|三个目标|Três alvos|तीन निशाने
Пасы под давлением|Passing under pressure|Pases bajo presión|逼抢下传球|Passes sob pressão|दबाव में पास
Хозяин четверти|Own your square|Domina tu zona|守住你的方格|Domine sua área|अपना खाना बचाएँ
Дважды попади в перекладину за пять ударов.|Hit the crossbar twice in five shots.|Da al larguero dos veces en cinco tiros.|五次射门中两次击中横梁。|Acerte o travessão duas vezes em cinco chutes.|पाँच शॉट में दो बार क्रॉसबार पर मारें।
Забей дважды за шесть розыгрышей.|Score twice in six plays.|Marca dos goles en seis jugadas.|在六个回合中进两球。|Marque dois gols em seis jogadas.|छह चालों में दो गोल करें।
Личный лучший результат|Personal best|Mejor marca personal|个人最佳|Recorde pessoal|व्यक्तिगत सर्वश्रेष्ठ
Результат друга|Friend's score|Resultado del amigo|好友成绩|Resultado do amigo|दोस्त का स्कोर
игр|matches|partidos|场次|jogos|मैच
Приближённая камера|Close camera|Cámara cercana|近景镜头|Câmera próxima|नज़दीकी कैमरा
Свайп вверх или кнопка угла по сигналу «Бей сейчас!».|Swipe up or tap a corner when it says Shoot now!|Desliza hacia arriba o toca una esquina al ver «¡Tira ahora!».|看到“现在射门！”时上滑或点选角落。|Deslize para cima ou toque num canto quando aparecer «Chute agora!».|“अभी मारें!” दिखे तो ऊपर स्वाइप करें या कोना टैप करें।
В левый угол|Left corner|Esquina izquierda|左角|Canto esquerdo|बायाँ कोना
В правый угол|Right corner|Esquina derecha|右角|Canto direito|दायाँ कोना
Бей сейчас!|Shoot now!|¡Tira ahora!|现在射门！|Chute agora!|अभी मारें!
Мяч летит…|Ball in flight…|Balón en el aire…|球在空中…|Bola no ar…|गेंद हवा में है…
Бей быстрее!|Hurry, shoot!|¡Tira rápido!|快射门！|Chute rápido!|जल्दी मारें!
Готовится навес|Cross coming|Preparando el centro|准备传中|Cruzamento a caminho|क्रॉस आने वाला है
Удар по воротам|Shot on goal|Tiro a puerta|射门|Chute a gol|गोल पर शॉट
Отпускай!|Release!|¡Suelta!|松手！|Solte!|छोड़ें!
Дождись золотой зоны|Wait for the gold zone|Espera la zona dorada|等待金色区域|Espere a zona dourada|सुनहरे हिस्से का इंतज़ार करें
Проведи вверх для прицела|Swipe up to aim|Desliza hacia arriba para apuntar|向上滑动瞄准|Deslize para cima para mirar|निशाना लगाने के लिए ऊपर स्वाइप करें
Прямые и кручёные удары.|Straight and curved shots.|Tiros rectos y con efecto.|直射和弧线球。|Chutes retos e com curva.|सीधे और घुमावदार शॉट।
Выбери удар и веди пальцем вверх. Пунктир покажет полёт.|Choose a shot and swipe up. The dotted line shows the flight path.|Elige el tiro y desliza hacia arriba. La línea de puntos indica la trayectoria.|选择射门方式后向上滑动。虚线显示球路。|Escolha o chute e deslize para cima. O pontilhado mostra a trajetória.|शॉट चुनें और ऊपर स्वाइप करें। बिंदीदार रेखा गेंद का रास्ता दिखाती है।
Вратарь отбил. Попробуй целиться дальше от него.|Saved. Try aiming farther from the keeper.|El portero paró el tiro. Apunta más lejos de él.|守门员扑出了。试着瞄准离他更远的位置。|O goleiro defendeu. Mire mais longe dele.|गोलकीपर ने बचाया। उससे दूर निशाना लगाएँ।
Влево|Left|Izquierda|左弧线|Esquerda|बाईं ओर
Прямой|Straight|Recto|直射|Reto|सीधा
Вправо|Right|Derecha|右弧线|Direita|दाईं ओर
`.trim().split('\n').map(line => line.split('|'));
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const cache = new Map();
  let lang = 'ru';
  let dict, pattern;
  try { lang = localStorage.getItem('football-language') || 'ru'; } catch { /* private browsing */ }
  if (!Object.hasOwn(languages,lang)) lang = 'ru';

  function rebuild() {
    const col = Object.keys(languages).indexOf(lang);
    dict = new Map(data.map(row => [row[0],row[col] || row[0]]));
    const keys = [...dict.keys()].sort((a,b) => b.length-a.length)
      .map(key => key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    pattern = new RegExp('(?<![\\p{L}])(?:'+keys.join('|')+')(?![\\p{L}])','gu');
    cache.clear();
  }
  rebuild();

  function text(value) {
    if (lang === 'ru' || typeof value !== 'string' || !/[А-Яа-яЁё]/.test(value)) return value;
    if (!cache.has(value)) {
      if (cache.size > 1500) cache.clear();
      const seconds = {en:'s',es:'s',zh:'秒',pt:'s',hi:'सेकंड'}[lang];
      cache.set(value,value.replace(pattern,key => dict.get(key)).replace(/(\d) с(?=[\s.]|$)/g,'$1 '+seconds));
    }
    return cache.get(value);
  }
  const fields = ['title','aria-label','placeholder'];
  function translateNode(node) {
    if (node.parentElement?.closest('script, style, [data-no-translate]')) return;
    const before = originals.get(node);
    const source = before && node.data === before.rendered ? before.source : node.data;
    const rendered = text(source);
    if (node.parentElement?.tagName === 'OPTION' && !node.parentElement.hasAttribute('value') && source !== rendered) {
      node.parentElement.value = source.trim();
      node.parentElement.setAttribute('value',source.trim());
    }
    if (node.data !== rendered) node.data = rendered;
    originals.set(node,{source,rendered});
  }
  function translateAttributes(el) {
    const last = attributes.get(el) || {};
    for (const name of fields) {
      const value = el.getAttribute(name);
      if (value === null) continue;
      const source = value === last[name]?.rendered ? last[name].source : value;
      const rendered = text(source);
      if (value !== rendered) el.setAttribute(name,rendered);
      last[name] = {source,rendered};
    }
    attributes.set(el,last);
  }
  function translate(root) {
    if (root.nodeType === 3) { translateNode(root); return; }
    if (root.nodeType !== 1) return;
    translateAttributes(root);
    root.querySelectorAll('[title],[aria-label],[placeholder]').forEach(translateAttributes);
    const walk = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) translateNode(walk.currentNode);
  }
  function apply() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
    document.title = text('Дворовый футбол');
    translate(document.body);
  }
  function start() {
    apply();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') translateNode(record.target);
        else if (record.type === 'attributes') translateAttributes(record.target);
        else for (const node of record.addedNodes) translate(node);
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:fields});
  }
  function set(value) {
    if (!Object.hasOwn(languages,value)) return;
    lang = value;
    try { localStorage.setItem('football-language',lang); } catch { /* private browsing */ }
    rebuild();
    apply();
  }
  return {languages,get language(){return lang;},text,start,set};
})();
if (typeof module !== 'undefined') module.exports = I18n;
