/* ============================================================
   Mouna · Tienda — lógica del sitio (sin backend)
   El carrito vive en el cliente y el pedido se envía por WhatsApp.
   ============================================================ */

/* --- Configuración editable --- */
// Teléfono para los links de WhatsApp. Formato: solo dígitos, sin 0 ni 15.
// Se arma como https://wa.me/549<PHONE>
const PHONE = '1167183887';
const PHONE_DISPLAY = '11 6718 3887';

/* --- Catálogo (editable: precios en pesos argentinos) ---
   img: ruta a la foto del producto, o '' para usar el logo como fallback.
   fit: 'cover' para FOTOS reales (llenan el recuadro) · 'contain' para
        TARJETAS gráficas de marca (se ven enteras, sin recortar el marco). */
const SECTIONS = [
  {
    id: 'infusiones',
    label: 'Infusiones & Bebidas',
    short: 'Infusiones',
    note: 'Para despertar, limpiar y acompañar el día.',
    items: [
      { name: 'Tesoro', desc: 'Yerba mate con hierbas y magia. Energizante y desintoxicante.', price: 20000, img: 'assets/images/mouna-generic.png', fit: 'contain' },
      { name: 'Pancha Kofi', desc: 'Flecha de café. Granos de Brasil y especias indias.', price: 30000, img: 'assets/images/pancha-kofi.png', fit: 'contain' },
      { name: 'Kefir', desc: 'Probiótico. Mejora la digestión y la absorción de nutrientes.', price: 15000, img: 'assets/images/kefir.png', fit: 'cover' },
      { name: 'Soham Té', desc: 'Jengibre, hinojo y magia.', price: 10000, img: '' },
      { name: 'Ginger Shots', desc: 'Jengibre, cúrcuma, pimienta y limón.', price: 10000, img: '' },
      { name: 'Jaman Shot', desc: 'Hibiscus, chía, sal marina, naranja y limón.', price: 8000, img: '' },
    ],
  },
  {
    id: 'despensa',
    label: 'Despensa',
    short: 'Despensa',
    note: 'Nutrir el cuerpo con lo simple y verdadero.',
    items: [
      { name: 'Ghee', desc: 'Manteca clarificada. Vitaminas y antioxidantes, sin grasa.', price: 15000, img: '' },
      { name: 'Miel Pura', desc: '100% natural.', price: 12000, img: '' },
      { name: 'Crackers', desc: 'Harina de almendras, lino, chía, sésamo y magia. Dulces y saladas.', price: 12000, img: '' },
      { name: 'Trufas', desc: 'Frutos húmedos y secos, chocolate y magia. Por tres.', price: 12000, img: '' },
      { name: 'Churna', desc: 'Curry ayurvédico. Balancea los seis sabores.', price: 20000, img: 'assets/images/churna.png', fit: 'contain' },
      { name: 'Mix de Semillas', desc: 'Mezcla de semillas seleccionadas.', price: 8000, img: '' },
      { name: 'Humus', desc: 'Garbanzo, zanahoria o berenjena.', price: 8000, img: '' },
    ],
  },
  {
    id: 'aromas',
    label: 'Aromas & Ritual',
    short: 'Aromas',
    note: 'Aquietar los sentidos y habitar la pausa.',
    items: [
      { name: 'Noni Noni', desc: 'Almohadillas de descanso para párpados. Lavanda y lino.', price: 20000, img: 'assets/images/noni-noni.png', fit: 'contain' },
      { name: 'Elixires', desc: 'Aceites esenciales para los siete chakras principales.', price: 30000, img: 'assets/images/elixires.png', fit: 'cover' },
      { name: 'Aceites Esenciales', desc: 'Un solo aroma, puro.', price: 30000, img: '' },
      { name: 'Chuf Chuf', desc: 'Aromatiza ambientes y ropa.', price: 12000, img: 'assets/images/chuf-chuf.png', fit: 'contain' },
      { name: 'Sucundum', desc: 'Solución granulada para axilas. Aroma lavanda.', price: 10000, img: 'assets/images/sucundum.png', fit: 'contain' },
    ],
  },
];

/* --- Utilidades --- */
// Imagen para productos sin foto propia: tarjeta de marca MOUNA (no el logo suelto).
const FALLBACK_IMG = 'assets/images/mouna-generic.png';
const WA_BASE = 'https://wa.me/549' + PHONE.replace(/\D/g, '');
const money = (n) => '$' + n.toLocaleString('es-AR');
const waLink = (text) => WA_BASE + '?text=' + encodeURIComponent(text);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* --- Estado --- */
const STORAGE_KEY = 'mouna_cart_v1';
let cart = loadCart();
let cartOpen = false;

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
}

function addToCart(name, price) {
  const cur = cart[name] || { name, price, qty: 0 };
  cart[name] = { ...cur, qty: cur.qty + 1 };
  saveCart();
  renderCart();
}
function changeQty(name, delta) {
  if (!cart[name]) return;
  const q = cart[name].qty + delta;
  if (q <= 0) delete cart[name];
  else cart[name] = { ...cart[name], qty: q };
  saveCart();
  renderCart();
}
function clearCart() {
  cart = {};
  saveCart();
  setCartOpen(false);
  renderCart();
}
function setCartOpen(open) {
  cartOpen = open;
  const overlay = document.getElementById('cartOverlay');
  const panel = document.getElementById('cartPanel');
  overlay.hidden = !open;
  panel.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
}

/* --- Derivados --- */
function cartEntries() { return Object.values(cart); }
function cartCount() { return cartEntries().reduce((a, it) => a + it.qty, 0); }
function cartTotal() { return cartEntries().reduce((a, it) => a + it.price * it.qty, 0); }
function orderText() {
  const lines = cartEntries().map((it) => '• ' + it.name + '  x' + it.qty + ' — ' + money(it.price * it.qty));
  return 'Hola Mouna! Quiero hacer este pedido:\n\n' + lines.join('\n') + '\n\nTotal: ' + money(cartTotal());
}

/* --- Render del catálogo (una sola vez) --- */
function renderCatalog() {
  const nav = document.getElementById('navLinks');
  nav.innerHTML = SECTIONS.map((s) => `<a href="#${s.id}">${esc(s.label)}</a>`).join('');

  const catalog = document.getElementById('catalog');
  catalog.innerHTML = SECTIONS.map((s) => `
    <section id="${s.id}" class="mn-section">
      <div class="mn-sec-head">
        <h2>${esc(s.label)}</h2>
        <p>${esc(s.note)}</p>
      </div>
      <div class="mn-grid">
        ${s.items.map((p) => {
          const src = p.img || FALLBACK_IMG;
          // Fotos reales llenan el recuadro (cover); tarjetas de marca y placeholder se ven enteras (contain).
          const cls = (p.img && p.fit !== 'contain') ? '' : ' class="fit-contain"';
          return `
          <article class="mn-card">
            <div class="mn-card-img">
              <img src="${src}"${cls} alt="${esc(p.name)}" loading="lazy"
                   onerror="this.onerror=null;this.src='${FALLBACK_IMG}';this.className='fit-contain';">
            </div>
            <h3>${esc(p.name)}</h3>
            <p class="mn-card-desc">${esc(p.desc)}</p>
            <div class="mn-card-foot">
              <span class="mn-price">${money(p.price)}</span>
              <button type="button" class="mn-add" data-name="${esc(p.name)}" data-price="${p.price}">Agregar +</button>
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>`).join('');

  catalog.querySelectorAll('.mn-add').forEach((btn) => {
    btn.addEventListener('click', () => addToCart(btn.dataset.name, Number(btn.dataset.price)));
  });
}

/* --- Render del carrito (badges + drawer) --- */
function renderCart() {
  const count = cartCount();
  const hasItems = count > 0;

  ['headerBadge', 'floatBadge'].forEach((id) => {
    const el = document.getElementById(id);
    el.textContent = count;
    el.hidden = !hasItems;
  });

  const body = document.getElementById('cartBody');
  if (!hasItems) {
    body.innerHTML = `<div class="mn-empty">Tu pedido está vacío.<br>Agregá productos para armarlo.</div>`;
    return;
  }

  const items = cartEntries().map((it) => `
    <div class="mn-item">
      <div class="mn-item-main">
        <div class="mn-item-name">${esc(it.name)}</div>
        <div class="mn-item-unit">${money(it.price)} c/u</div>
        <div class="mn-qty">
          <button type="button" class="mn-qbtn" data-act="dec" data-name="${esc(it.name)}" aria-label="Restar">−</button>
          <span class="mn-qval">${it.qty}</span>
          <button type="button" class="mn-qbtn" data-act="inc" data-name="${esc(it.name)}" aria-label="Sumar">+</button>
        </div>
      </div>
      <div class="mn-item-line">${money(it.price * it.qty)}</div>
    </div>`).join('');

  body.innerHTML = `
    <div class="mn-items">${items}</div>
    <div class="mn-summary">
      <div class="mn-total-row">
        <span class="mn-total-label">Total</span>
        <span class="mn-total-val">${money(cartTotal())}</span>
      </div>
      <a class="mn-send" href="${waLink(orderText())}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#FFFFFF"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.652a11.882 11.882 0 005.71 1.454h.006c6.585 0 11.946-5.359 11.949-11.945a11.821 11.821 0 00-3.481-8.463"></path></svg>
        Enviar pedido
      </a>
      <button type="button" class="mn-clear" id="clearBtn">Vaciar pedido</button>
    </div>`;

  body.querySelectorAll('.mn-qbtn').forEach((btn) => {
    btn.addEventListener('click', () => changeQty(btn.dataset.name, btn.dataset.act === 'inc' ? 1 : -1));
  });
  body.querySelector('#clearBtn').addEventListener('click', clearCart);
}

/* --- Enlaces de WhatsApp genéricos --- */
function wireStaticLinks() {
  const general = waLink('Hola Mouna! Quiero hacer un pedido.');
  document.getElementById('floatWa').href = general;
  const footerWa = document.getElementById('footerWa');
  footerWa.href = general;
  footerWa.textContent = 'WhatsApp · ' + PHONE_DISPLAY;
}

/* --- Navegación de categorías móvil ---
   Barra que aparece al scrollear el catálogo y resalta la categoría actual. */
function initMobileNav() {
  const catbar = document.getElementById('catbar');
  const inner = catbar.querySelector('.mn-catbar-inner');
  const catalog = document.getElementById('catalog');

  inner.innerHTML = SECTIONS.map((s) => `<a href="#${s.id}" data-cat="${s.id}">${esc(s.short || s.label)}</a>`).join('');
  const links = [...inner.querySelectorAll('a')];

  const setActive = (id) => links.forEach((a) => a.classList.toggle('is-active', a.dataset.cat === id));
  links.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const el = document.getElementById(a.dataset.cat);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); // respeta scroll-margin-top
    setActive(a.dataset.cat);
    history.replaceState(null, '', '#' + a.dataset.cat);
  }));

  // Aparecer/ocultar: visible una vez que el catálogo llega cerca del header.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      catbar.classList.toggle('is-visible', catalog.getBoundingClientRect().top < 90);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Resaltado según la sección visible (scroll-spy).
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) spy.observe(el); });
}

/* --- Init --- */
document.addEventListener('DOMContentLoaded', () => {
  renderCatalog();
  wireStaticLinks();
  renderCart();
  initMobileNav();

  document.getElementById('headerCartBtn').addEventListener('click', () => setCartOpen(true));
  document.getElementById('floatCartBtn').addEventListener('click', () => setCartOpen(true));
  document.getElementById('closeCart').addEventListener('click', () => setCartOpen(false));
  document.getElementById('cartOverlay').addEventListener('click', () => setCartOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cartOpen) setCartOpen(false); });
});
