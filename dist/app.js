'use strict';

const key = 'local-wishlist-v1';
const gifts = document.querySelector('#gifts');
const template = document.querySelector('#gift-template');
const notice = document.querySelector('#notice');
const editor = document.body.hasAttribute('data-editor');
const dialog = document.querySelector('#edit-dialog');
const form = document.querySelector('#edit-form');

function read() {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function message(node, value) {
  if (!node) return;
  node.textContent = value;
  node.hidden = !value;
}

function save(list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function webUrl(value) {
  try {
    const url = new URL(value);
    if (/^https?:$/.test(url.protocol) && !url.username && !url.password) return url;
  } catch {
    return null;
  }
  return null;
}

function paintRating(card, rating) {
  for (const button of card.querySelectorAll('[data-rating]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.rating) === rating));
  }
}

function ratingLabel(rating) {
  return rating === 4 ? '🌟 Мечтаю больше всего' : '♥'.repeat(rating);
}

function priceLabel(price) {
  const amount = (price || '').trim()
    .replace(/^[≈~]\s*/, '')
    .replace(/\s*(?:₽|RUB|RUR|руб(?:\.|лей|ля)?|р\.)\s*$/iu, '')
    .trim();
  return amount ? '≈ ' + amount + ' руб.' : '';
}

function render(publishedList) {
  let list;
  try {
    list = publishedList ?? read();
  } catch {
    message(notice, 'Не удалось прочитать список из хранилища браузера.');

    return;
  }

  if (!editor) list.sort((a, b) => b.rating - a.rating);
  document.querySelector('#empty').hidden = list.length > 0;
  gifts.replaceChildren();

  for (const gift of list) {
    const card = template.content.firstElementChild.cloneNode(true);
    const url = webUrl(gift.url);
    if (!url) continue;
    card.dataset.id = gift.id;
    const title = card.querySelector('[data-title]');
    title.textContent = title.title = gift.title || 'Подарок · ' + url.hostname;
    const price = card.querySelector('[data-price]');
    price.textContent = price.title = priceLabel(gift.price);
    card.querySelector('[data-store]').href = url.href;

    const photo = card.querySelector('[data-photo]');
    photo.addEventListener('error', () => { photo.hidden = true; });
    const source = gift.upload || gift.image;
    if (source) {
      photo.alt = gift.title || 'Фото подарка';
      photo.src = source;
      photo.hidden = false;
    }

    if (editor) {
      paintRating(card, gift.rating);

    } else {
      const hearts = card.querySelector('[data-hearts]');
      hearts.textContent = ratingLabel(gift.rating);
      card.querySelector('[data-guest-rating]').hidden = !gift.rating;
      hearts.setAttribute('aria-label', gift.rating === 4 ? 'Мечтаю больше всего' : 'Сердечек: ' + gift.rating);
    }
    gifts.append(card);
  }
}

function uploadPhoto(file) {
  if (file.size > 30 * 1024 * 1024) throw new Error('Выберите фото размером до 30 МБ.');
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      } catch {
        reject(new Error('Не удалось обработать фото.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось открыть фото. Выберите другой файл.'));
    };
    img.src = url;
  });
}

function openEdit(gift = null) {
  form.reset();
  form.dataset.id = gift?.id || '';

  document.querySelector('#edit-heading').textContent = gift ? 'Редактировать подарок' : 'Добавить подарок';
  document.querySelector('#save-edit').textContent = gift ? 'Сохранить' : 'Добавить подарок';

  form.elements.url.value = gift?.url || '';
  for (const field of ['title', 'price', 'image']) form.elements[field].value = gift?.[field] || '';
  document.querySelector('#remove-photo-row').hidden = !(gift?.upload || gift?.image);
  message(document.querySelector('#edit-error'), '');
  dialog.showModal();
  (gift ? form.elements.title : form.elements.url).focus();
}

if (editor) {
  const addButton = document.querySelector('#add-gift');
  addButton.addEventListener('click', () => openEdit());
  document.querySelector('#export-gifts').addEventListener('click', () => {
    try {
      const list = read().map(({ id, url, title, price, image, upload, rating }) =>
        ({ id, url, title, price, image, upload, rating }));
      const blob = new Blob([JSON.stringify(list, null, 2) + '\n'], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'gifts.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      message(notice, '');
    } catch {
      message(notice, 'Не удалось экспортировать список подарков.');
    }
  });
  gifts.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const card = button.closest('[data-id]');
    try {
      const list = read();
      const gift = list.find(item => item.id === card.dataset.id);
      if (!gift) return;
      if (button.hasAttribute('data-edit')) openEdit(gift);
      if (button.hasAttribute('data-delete') && confirm('Удалить этот подарок?')) {
        save(list.filter(item => item.id !== gift.id));



        render();
        addButton.focus();
      }
      if (button.dataset.rating) {
        const rating = Number(button.dataset.rating);
        gift.rating = gift.rating === rating ? 0 : rating;
        save(list);
        paintRating(card, gift.rating);

      }
      message(notice, '');
    } catch {
      message(notice, 'Не удалось сохранить изменение в браузере.');

    }
  });

  document.querySelector('#cancel-edit').addEventListener('click', () => dialog.close());
  const closeButton = document.querySelector('#close-edit');
  closeButton.addEventListener('click', () => dialog.close());
  const saveButton = document.querySelector('#save-edit');
  dialog.addEventListener('cancel', event => {
    if (saveButton.disabled) event.preventDefault();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.querySelector('#edit-error');
    const cancelButton = document.querySelector('#cancel-edit');
    message(error, '');
    saveButton.disabled = cancelButton.disabled = closeButton.disabled = true;
    try {
      const fields = form.elements;
      const adding = !form.dataset.id;
      const value = fields.url.value.trim();
      const url = webUrl(value);
      if (!url) {
        fields.url.focus();
        throw new Error(value ? 'Укажите ссылку на товар, начинающуюся с https:// или http://.' : 'Вставьте ссылку на товар.');
      }
      const photoUrl = fields.image.value.trim();
      const image = photoUrl && webUrl(photoUrl);
      if (photoUrl && !image) throw new Error('Укажите ссылку на фото, начинающуюся с https:// или http://.');
      const file = fields.file.files[0];
      const upload = file ? await uploadPhoto(file) : '';
      const list = read();
      const gift = adding
        ? { id: crypto.randomUUID(), url: url.href, title: '', price: '', image: '', upload: '', rating: 0 }
        : list.find(item => item.id === form.dataset.id);
      if (adding) list.push(gift);
      if (!gift) throw new Error('Подарок уже удалён.');
      gift.url = url.href;
      gift.title = fields.title.value.trim();
      gift.price = fields.price.value.trim();
      const imageChanged = (image?.href || '') !== gift.image;
      if (fields.removePhoto.checked || imageChanged || file) {
        gift.upload = upload;
        gift.image = file || (fields.removePhoto.checked && !imageChanged) ? '' : image?.href || '';
      }
      try {
        save(list);
      } catch {
        throw new Error('Не удалось сохранить изменения. Для фото попробуйте файл меньшего размера.');
      }
      dialog.close();
      message(notice, '');
      render();
      if (!adding) {
        Array.from(gifts.children).find(card => card.dataset.id === gift.id)
          ?.querySelector('[data-edit]').focus({ preventScroll: true });
      }
    } catch (failure) {
      message(error, failure.message);

    } finally {
      saveButton.disabled = cancelButton.disabled = closeButton.disabled = false;
    }
  });
}

const backToTop = document.querySelector('#back-to-top');
if (backToTop) {
  function updateBackToTop() {
    backToTop.hidden = window.scrollY < 320;
  }

  window.addEventListener('scroll', updateBackToTop, { passive: true });
  window.addEventListener('pageshow', updateBackToTop);
  backToTop.addEventListener('click', () => {
    document.querySelector('.brand')?.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
  });
  updateBackToTop();
}

if (!document.body.hasAttribute('data-published')) {
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) render();
  });
  window.addEventListener('pageshow', () => render());
  render();
}
