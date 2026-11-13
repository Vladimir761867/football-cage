# Android-сборка

Идентификатор релиза: `io.github.vladimir761867.footballcage`. Версия 1.0.1, код 24. Минимальный Android 8.0, целевой Android 16 (API 36). Манифест запрашивает только вибрацию. HTML, JavaScript, стили и игровые изображения входят в пакет. Во время сборки удаляются обращения к внешним шрифтам и настройки сервера комнат.

Из корня репозитория с JDK 17, Gradle 8.13, SDK Platform 36 и Build Tools 35.0.0:

```powershell
gradle -p android :app:assembleQa :app:bundleQa :app:bundleRelease :app:assembleRelease
```

На Windows используйте путь из латинских букв, например `C:\projects\football-cage`. Если основная папка содержит кириллицу, запустите сборку из копии проекта: Gradle берёт игровые файлы из корня репозитория.

QA имеет отдельный идентификатор с суффиксом `.qa` и отладочный сертификат. Его APK можно установить на тестовое устройство через `adb install -r`. В магазины загружайте только релиз с ключом владельца. Без ключа задачи `bundleRelease` и `assembleRelease` выдают файлы без подписи для проверки сборки.

Для подписи задайте в защищённом окружении `FOOTBALL_KEYSTORE` (полный путь к хранилищу), `FOOTBALL_STORE_PASSWORD`, `FOOTBALL_KEY_ALIAS` и `FOOTBALL_KEY_PASSWORD`. Затем:

```powershell
gradle -p android :app:storeRelease
```

Пакеты находятся в `android/app/build/outputs`. Google Play принимает AAB, RuStore — APK или AAB. Если для магазинов используются разные ключи, сборки подписываются отдельно. Храните ключи и пароли вне Git.

Ссылки: [требования Google Play к API](https://support.google.com/googleplay/android-developer/answer/11926878) · [подпись приложения Android](https://developer.android.com/studio/publish/app-signing) · [загрузка AAB в RuStore](https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/upload-aab).
