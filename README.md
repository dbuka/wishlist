# Список желаний Агаты

Редактор запускается локально. Гостевая страница на GitHub Pages читает список из `docs/gifts.json`, а брони хранит в Supabase.

## Обновить список подарков

1. Открой терминал в папке репозитория, которую используешь в GitHub Desktop, и запусти сервер.

   ```sh
   node server.js
   ```

2. Открой [редактор](http://127.0.0.1:3000/) в том же браузере и по тому же адресу, где добавляла подарки. Редактор хранит список в браузере. Перед экспортом убедись, что в редакторе виден весь список, который хочешь опубликовать.
3. Добавь, отредактируй или удали подарки. Нажми **Экспортировать для публикации** и замени скачанным файлом `gifts.json` файл `docs/gifts.json` в репозитории. Экспорт содержит весь список.
4. Открой [локальную гостевую страницу](http://127.0.0.1:3000/wishlist/) и проверь карточки. На этой странице бронирование подключается к Supabase из `docs/booking-config.json`. Кнопка **Предпросмотр** в редакторе показывает список из браузера.
5. В **GitHub Desktop** выбери репозиторий `wishlist` и ветку `main`. На вкладке **Changes** отметь `docs/gifts.json`, напиши короткое описание, например «Обновить список подарков», нажми **Commit to main**, затем **Push origin**.
6. Дождись успешной публикации во вкладке **Actions** на GitHub и обнови гостевую страницу. Адрес сайта можно найти в **Settings → Pages**.

Для обновления только подарков достаточно заменить `docs/gifts.json`. GitHub Pages публикует файлы из папки `/docs` ветки `main`. [Настройка источника публикации](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Обновить оформление или поведение сайта

После правок в `wishlist.html`, `app.js`, `booking.js` или `styles.css` запусти из папки репозитория:

```sh
node build-pages.js
```

Проверь [локальную гостевую страницу](http://127.0.0.1:3000/wishlist/) и отправь на GitHub исходные файлы вместе с изменившимися файлами в `docs/`. Сборка сохраняет `docs/gifts.json` и `docs/booking-config.json`. Разметка редактора находится в `index.html`, гостевой страницы — в `wishlist.html`.

## Управлять бронями

При редактировании существующего подарка его ID и бронь сохраняются. Если удалить карточку и добавить её заново, у неё будет новый ID.

- Свою бронь можно снять кнопкой **Снять бронь** в том же браузере и по тому же адресу, где она была сделана.
- Чтобы снять бронь вручную, открой в Supabase **Table Editor → gift_reservations** и удали строку с нужным `gift_id`. ID карточки можно найти в `docs/gifts.json`.
- Чтобы сбросить **все брони, включая брони гостей**, выполни в **SQL Editor** запрос ниже. Если `remaining_reservations` равно `0`, таблица пуста. После сброса обнови гостевую страницу.

  ```sql
  DELETE FROM public.gift_reservations;

  SELECT count(*) AS remaining_reservations
  FROM public.gift_reservations;
  ```

## Настройка при первой публикации

1. В Supabase открой **SQL Editor** и выполни содержимое `supabase/reservations.sql`.
2. В `docs/booking-config.json` укажи URL проекта в поле `url` и публичный ключ **Publishable key** в поле `publishableKey`. Этот файл доступен посетителям сайта. Используй только публичный ключ.
3. В репозитории GitHub открой **Settings → Pages**. В разделе **Build and deployment** выбери **Deploy from a branch**, ветку `main`, папку `/docs` и нажми **Save**. [Инструкция GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
