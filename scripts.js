/* Mock API + form handling for Willow & Bean
   - Intercepts requests to /api/* and returns simulated responses
   - Populates menu, handles newsletter, contact, order, reservations
*/

(function () {
  // Simple in-memory mock data
  const mockMenu = {
    categories: [
      {
        id: 'coffee',
        title: 'Coffee',
        items: [
          { id: 'c1', name: 'House Brew', price: 3.5, desc: 'Daily blend, smooth and balanced.' },
          { id: 'c2', name: 'Pour Over', price: 4.5, desc: 'Single origin, brewed to order.' },
          { id: 'c3', name: 'Cold Brew', price: 4.0, desc: 'Slow steep for a mellow finish.' },
          { id: 'c4', name: 'Nitro Cold Brew', price: 5.0, desc: 'Silky, effervescent.' }
        ]
      },
      {
        id: 'espresso',
        title: 'Espresso & Milk Drinks',
        items: [
          { id: 'e1', name: 'Espresso', price: 2.5, desc: 'Single shot.' },
          { id: 'e2', name: 'Cappuccino', price: 4.0, desc: 'Equal parts espresso, steamed milk, foam.' },
          { id: 'e3', name: 'Latte', price: 4.5, desc: 'Creamy and smooth.' },
          { id: 'e4', name: 'Mocha', price: 5.0, desc: 'Chocolate, espresso, steamed milk.' }
        ]
      },
      {
        id: 'tea',
        title: 'Tea & Cozy Drinks',
        items: [
          { id: 't1', name: 'Matcha Latte', price: 4.5, desc: 'Ceremonial grade matcha.' },
          { id: 't2', name: 'Chai Latte', price: 4.0, desc: 'House-spiced chai.' },
          { id: 't3', name: 'Herbal Tea', price: 3.0, desc: 'Selection of herbal blends.' }
        ]
      },
      {
        id: 'pastries',
        title: 'Pastries',
        items: [
          { id: 'p1', name: 'Almond Croissant', price: 3.5, desc: 'Buttery, flaky goodness.' },
          { id: 'p2', name: 'Blueberry Muffin', price: 2.75, desc: 'Bursting with berries.' },
          { id: 'p3', name: 'Banana Bread', price: 3.0, desc: 'Moist, house-made.' }
        ]
      }
    ]
  };

  // Utility: create Response-like object for intercepted fetch
  function jsonResponse(obj, delay = 400) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
        const init = { status: 200, statusText: 'OK' };
        resolve(new Response(blob, init));
      }, delay);
    });
  }

  // Intercept fetch calls to /api/*
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function (url, opts = {}) {
    try {
      const u = (typeof url === 'string') ? url : (url && url.url) || '';
      if (u.startsWith('/api/')) {
        // Handle mock endpoints
        if (u === '/api/menu' && (!opts.method || opts.method.toUpperCase() === 'GET')) {
          return jsonResponse({ success: true, menu: mockMenu });
        }

        if (u === '/api/newsletter' && opts.method && opts.method.toUpperCase() === 'POST') {
          const bodyText = opts.body || '{}';
          let data = {};
          try { data = JSON.parse(bodyText); } catch (e) {}
          return jsonResponse({ success: true, message: `Subscribed ${data.email || 'unknown'}` });
        }

        if (u === '/api/contact' && opts.method && opts.method.toUpperCase() === 'POST') {
          return jsonResponse({ success: true, message: 'Thanks! We received your message.' });
        }

        if (u === '/api/orders' && opts.method && opts.method.toUpperCase() === 'POST') {
          return jsonResponse({ success: true, orderId: 'ORD-' + Math.floor(Math.random() * 90000 + 10000) });
        }

        if (u === '/api/reservations' && opts.method && opts.method.toUpperCase() === 'POST') {
          return jsonResponse({ success: true, reservationId: 'RES-' + Math.floor(Math.random() * 90000 + 10000) });
        }

        // Default fallback for unknown api
        return jsonResponse({ success: false, message: 'Unknown API endpoint' }, 300);
      }
    } catch (err) {
      console.error('Mock fetch error:', err);
    }
    return nativeFetch(url, opts);
  };

  // DOM utilities
  function qs(sel, ctx = document) { return ctx.querySelector(sel); }
  function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

  // Populate menu preview on index and full menu on menu.html
  async function loadMenu() {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (!data || !data.menu) return;
      const menu = data.menu;

      // Index preview: show first item of first two categories
      const previewEl = qs('#menu-preview');
      if (previewEl) {
        previewEl.innerHTML = '';
        menu.categories.slice(0, 2).forEach(cat => {
          const item = cat.items[0];
          const card = document.createElement('div');
          card.className = 'p-4 rounded bg-amber-50';
          card.innerHTML = `
            <h4 class="font-semibold text-amber-900">${item.name}</h4>
            <p class="text-sm text-amber-700">${item.desc}</p>
            <div class="mt-2 text-amber-800 font-medium">$${item.price.toFixed(2)}</div>
          `;
          previewEl.appendChild(card);
        });
      }

      const menuListEl = qs('#menu-list');
      if (menuListEl) {
        menuListEl.innerHTML = '';
        menu.categories.forEach(cat => {
          const section = document.createElement('section');
          section.className = 'bg-cream-50 p-4 rounded';
          let itemsHtml = cat.items.map(i => `
            <div class="py-2 border-b last:border-b-0">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-semibold text-amber-900">${i.name}</div>
                  <div class="text-sm text-amber-700">${i.desc}</div>
                </div>
                <div class="text-amber-800 font-medium">$${i.price.toFixed(2)}</div>
              </div>
            </div>
          `).join('');
          section.innerHTML = `<h3 class="font-semibold mb-2">${cat.title}</h3>${itemsHtml}`;
          menuListEl.appendChild(section);
        });
      }

      // Populate order select
      const orderSelect = qs('#order-item');
      if (orderSelect) {
        orderSelect.innerHTML = '';
        menu.categories.forEach(cat => {
          const optGroup = document.createElement('optgroup');
          optGroup.label = cat.title;
          cat.items.forEach(it => {
            const opt = document.createElement('option');
            opt.value = it.id;
            opt.textContent = `${it.name} — $${it.price.toFixed(2)}`;
            opt.dataset.name = it.name;
            optGroup.appendChild(opt);
          });
          orderSelect.appendChild(optGroup);
        });
      }

    } catch (err) {
      console.error('Failed to load menu', err);
    }
  }

  // Generic form helper to POST JSON to mock endpoints
  async function postJson(url, data) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  }

  // Setup form handlers
  function setupForms() {
    const newsletter = qs('#newsletter-form');
    if (newsletter) {
      newsletter.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = newsletter.email.value;
        const btn = newsletter.querySelector('button');
        btn.disabled = true;
        const msgEl = qs('#newsletter-msg');
        try {
          const res = await postJson('/api/newsletter', { email });
          msgEl.textContent = res.message || 'Subscribed!';
        } catch (err) { msgEl.textContent = 'Subscription failed.' }
        btn.disabled = false;
      });
    }

    const contactForm = qs('#contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { name: contactForm.name.value, email: contactForm.email.value, subject: contactForm.subject.value, message: contactForm.message.value };
        const msgEl = qs('#contact-msg');
        try {
          const res = await postJson('/api/contact', data);
          msgEl.textContent = res.message || 'Message sent!';
          contactForm.reset();
        } catch (err) { msgEl.textContent = 'Send failed.' }
      });
    }

    const orderForm = qs('#order-form');
    if (orderForm) {
      orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { itemId: orderForm.item.value, quantity: orderForm.quantity.value, name: orderForm.name.value, pickup: orderForm.pickup.value };
        const msgEl = qs('#order-msg');
        try {
          const res = await postJson('/api/orders', data);
          msgEl.textContent = res.orderId ? `Order placed — ${res.orderId}` : (res.message || 'Order placed');
          orderForm.reset();
        } catch (err) { msgEl.textContent = 'Order failed.' }
      });
    }

    const reservationForm = qs('#reservation-form');
    if (reservationForm) {
      reservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { name: reservationForm.name.value, email: reservationForm.email.value, phone: reservationForm.phone.value, guests: reservationForm.guests.value, datetime: reservationForm.datetime.value };
        const msgEl = qs('#reservation-msg');
        try {
          const res = await postJson('/api/reservations', data);
          msgEl.textContent = res.reservationId ? `Reservation requested — ${res.reservationId}` : (res.message || 'Reservation requested');
          reservationForm.reset();
        } catch (err) { msgEl.textContent = 'Reservation failed.' }
      });
    }
  }

  // Small polyfill for colors used in markup so Tailwind classes don't break in logic (these are just CSS token names used visually in class names above). No-op here.

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    await loadMenu();
    setupForms();
  });

})();
