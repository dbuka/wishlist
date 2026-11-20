'use strict';

const bookingNotice = document.querySelector('#booking-notice');
const reservationTokenKey = 'wishlist-reservation-token-v1';
const reservationStates = new Map();
const feedbackTimers = new WeakMap();
let reservationApi;
let reservationHeaders;

function updateBookingButton(button, state) {
  button.disabled = state === 'reserved';
  button.textContent = {
    available: 'Забронировать',
    mine: 'Снять бронь',
    reserved: 'Забронировано',
  }[state];
}

function showBookingFeedback(feedback, title, detail) {
  clearTimeout(feedbackTimers.get(feedback));
  feedback.replaceChildren();
  if (!title) return;

  const heading = document.createElement('strong');
  heading.textContent = title;
  feedback.append(heading);
  if (detail) feedback.append(detail);
  feedbackTimers.set(feedback, setTimeout(() => feedback.replaceChildren(), 8000));
}

async function reservationRequest(operation, body) {
  const response = await fetch(new URL(operation, reservationApi), {
    method: 'POST',
    headers: reservationHeaders,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Ошибка сервиса бронирования.');
  return response.json();
}

async function loadReservations(ids) {
  const response = await fetch('./booking-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить настройки бронирования.');
  const { url, publishableKey } = await response.json();
  if (!url || !publishableKey) {
    message(bookingNotice, 'Бронирование пока не подключено.');
    return;
  }

  reservationApi = new URL('/rest/v1/rpc/', url);
  if (reservationApi.protocol !== 'https:') throw new Error('Supabase требует HTTPS.');
  reservationHeaders = { apikey: publishableKey, 'Content-Type': 'application/json' };

  let browserToken = null;
  try {
    browserToken = localStorage.getItem(reservationTokenKey);
  } catch {
    // Statuses remain visible when browser storage is unavailable.
  }

  for (let start = 0; start < ids.length; start += 50) {
    const rows = await reservationRequest('wishlist_reservation_status', {
      gift_ids: ids.slice(start, start + 50), browser_token: browserToken,
    });
    for (const { gift_id, mine } of rows) reservationStates.set(gift_id, mine ? 'mine' : 'reserved');
  }

  for (const button of gifts.querySelectorAll('[data-reserve]')) {
    updateBookingButton(button, reservationStates.get(button.closest('[data-id]').dataset.id) || 'available');
  }
}

if (document.body.hasAttribute('data-published')) {
  gifts.addEventListener('click', async event => {
    const button = event.target.closest('[data-reserve]');
    if (!button || button.disabled) return;
    const feedback = button.parentElement.querySelector('[data-booking-feedback]');
    const id = button.closest('[data-id]').dataset.id;
    const previous = reservationStates.get(id) || 'available';
    const release = previous === 'mine';
    button.disabled = true;
    button.textContent = release ? 'Снимаем бронь…' : 'Бронируем…';
    showBookingFeedback(feedback);

    let browserToken;
    try {
      browserToken = localStorage.getItem(reservationTokenKey);
      if (!browserToken) {
        if (release) throw new Error('Токен брони удалён.');
        browserToken = crypto.randomUUID();
        localStorage.setItem(reservationTokenKey, browserToken);
      }
    } catch {
      updateBookingButton(button, previous);
      showBookingFeedback(feedback, 'Не удалось изменить бронь', 'Разрешите сохранение данных сайта в браузере.');
      return;
    }

    try {
      const state = await reservationRequest('wishlist_change_reservation', {
        target_gift: id, browser_token: browserToken, release,
      });
      const result = {
        available: ['Бронь снята', 'Подарок снова можно забронировать.'],
        mine: ['Подарок забронирован', 'Если передумаете, нажмите ещё раз.'],
        reserved: ['Этот подарок уже забронирован'],
      }[state];
      if (!Array.isArray(result)) throw new Error('Неизвестный статус бронирования.');
      reservationStates.set(id, state);
      updateBookingButton(button, state);
      showBookingFeedback(feedback, ...result);
    } catch {
      updateBookingButton(button, previous);
      showBookingFeedback(feedback, 'Не удалось обновить бронь', 'Попробуйте ещё раз.');
    }
  });

  void (async () => {
    try {
      const response = await fetch('./gifts.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Ошибка загрузки списка.');
      const list = await response.json();
      render(list);
      if (!list.length) return;
      try {
        await loadReservations(list.map(gift => gift.id));
      } catch {
        message(bookingNotice, 'Не удалось проверить брони. Обнови страницу.');
      }
    } catch {
      message(notice, 'Не удалось загрузить список подарков.');
    }
  })();
}
