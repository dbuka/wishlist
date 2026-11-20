'use strict';

const bookingNotice = document.querySelector('#booking-notice');
let reservationEndpoint;
let reservationHeaders;
let reservationIds;

function updateBookingButton(button, reserved) {
  button.disabled = reserved;
  button.textContent = reserved ? 'Забронировано' : 'Забронировать';
}

async function loadReservations(ids) {
  const response = await fetch('./booking-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить настройки бронирования.');
  const { url, publishableKey } = await response.json();
  if (!url || !publishableKey) {
    message(bookingNotice, 'Бронирование пока не подключено.');
    return;
  }
  reservationEndpoint = new URL('/rest/v1/gift_reservations', url);
  if (reservationEndpoint.protocol !== 'https:') throw new Error('Supabase требует HTTPS.');
  reservationHeaders = { apikey: publishableKey };
  reservationIds = new Set();

  // Keep each URL short and each response below the default API row limit.
  for (let start = 0; start < ids.length; start += 50) {
    const query = new URL(reservationEndpoint);
    query.searchParams.set('select', 'gift_id');
    query.searchParams.set('gift_id', 'in.(' + ids.slice(start, start + 50).join(',') + ')');
    const result = await fetch(query, { headers: reservationHeaders, cache: 'no-store' });
    if (!result.ok) throw new Error('Не удалось загрузить брони.');
    for (const { gift_id } of await result.json()) reservationIds.add(gift_id);
  }

  for (const button of gifts.querySelectorAll('[data-reserve]')) {
    updateBookingButton(button, reservationIds.has(button.closest('[data-id]').dataset.id));
  }
}

if (document.body.hasAttribute('data-published')) {
  gifts.addEventListener('click', async event => {
    const button = event.target.closest('[data-reserve]');
    if (!button || button.disabled) return;
    const id = button.closest('[data-id]').dataset.id;
    button.disabled = true;
    button.textContent = 'Бронируем…';
    message(bookingNotice, '');
    try {
      const result = await fetch(reservationEndpoint, {
        method: 'POST',
        headers: { ...reservationHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ gift_id: id }),
      });
      if (!result.ok) {
        const error = await result.json().catch(() => ({}));
        if (result.status !== 409 || error.code !== '23505') throw new Error('Ошибка бронирования.');
        message(bookingNotice, 'Этот подарок уже забронирован.');
      } else {
        message(bookingNotice, 'Бронь сохранена.');
      }
      reservationIds.add(id);
      updateBookingButton(button, true);
    } catch {
      updateBookingButton(button, false);
      message(bookingNotice, 'Не удалось подтвердить бронь. Попробуй ещё раз.');
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
