// ============================================================
// demo.js — catálogo interactivo sin base de datos.
// Los productos "de fábrica" viven en SEED_PRODUCTS.
// Lo que el modo admin agregue/edite/borre vive solo en memoria
// (array `productos`) y desaparece al recargar la página, tal
// como se pidió: nada de esto toca un servidor real.
// ============================================================

const SEED_PRODUCTS = [
    { id: 1, nombre: 'Camiseta Oversize Ecru', categoria: 'Camisetas', precio: 890, descuento: 0, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+1', stock: 14, tallas: ['S', 'M', 'L', 'XL'], colores: ['Blanco', 'Negro'] },
    { id: 2, nombre: 'Hoodie Estructurado', categoria: 'Hoodies', precio: 2100, descuento: 15, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+2', stock: 6, tallas: ['M', 'L', 'XL'], colores: ['Gris', 'Negro'] },
    { id: 3, nombre: 'Pantalón Cargo Recto', categoria: 'Pantalones', precio: 1750, descuento: 0, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+3', stock: 9, tallas: ['28', '30', '32', '34'], colores: ['Beige', 'Negro'] },
    { id: 4, nombre: 'Gorra Bordada', categoria: 'Accesorios', precio: 650, descuento: 0, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+4', stock: 20, tallas: [], colores: ['Negro', 'Verde'] },
    { id: 5, nombre: 'Camiseta Gráfica Vintage', categoria: 'Camisetas', precio: 950, descuento: 20, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+5', stock: 3, tallas: ['S', 'M', 'L'], colores: ['Blanco'] },
    { id: 6, nombre: 'Chaqueta Ligera Cortavientos', categoria: 'Chaquetas', precio: 2600, descuento: 0, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+6', stock: 5, tallas: ['M', 'L', 'XL'], colores: ['Azul', 'Negro'] },
    { id: 7, nombre: 'Bolso Tote de Lona', categoria: 'Accesorios', precio: 720, descuento: 0, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+7', stock: 11, tallas: [], colores: ['Crudo'] },
    { id: 8, nombre: 'Pantalón Jogger Slim', categoria: 'Pantalones', precio: 1450, descuento: 10, imagen: 'https://placehold.co/600x750/EFEFEA/1B1B1F?text=Producto+8', stock: 0, tallas: ['S', 'M', 'L', 'XL'], colores: ['Negro', 'Gris'] },
];

let productos = SEED_PRODUCTS.map(p => ({...p }));
let nextId = Math.max(...productos.map(p => p.id)) + 1;
let favoritos = new Set(); // ids de producto
let carrito = []; // { cartId, producto_id, cantidad, talla, color }
let nextCartId = 1;
let filtroActual = 'todos';

// Cuenta cuántas veces se vio cada categoría en esta sesión, para simular
// el modo "personalizado" de orden_productos_helper.php: mientras más veas
// productos de una categoría, más arriba aparece esa categoría en "Todos".
let vistasPorCategoria = {};

const WHATSAPP_NUMERO = '18090000000';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

document.addEventListener('DOMContentLoaded', () => {
    cargarCarritoCompartidoDesdeURL();
    renderFiltros();
    renderGrid();
    actualizarContadores();
    bindHeader();
    bindDetailModal();
    bindAdminForm();
    bindCartPanel();
    bindFavPanel();
});

/* ---------------------------------------------------------------
   MODO CLIENTE / ADMIN
--------------------------------------------------------------- */
function bindHeader() {
    const savedMode = localStorage.getItem('demo_modo') || 'cliente';
    setMode(savedMode);

    $$('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    $('#addProductBtn').addEventListener('click', () => abrirFormulario());
    $('#cartToggle').addEventListener('click', () => togglePanel('#cartOverlay', true));
    $('#favToggle').addEventListener('click', () => togglePanel('#favOverlay', true));
}

function setMode(mode) {
    document.body.dataset.mode = mode;
    localStorage.setItem('demo_modo', mode);
    $$('.mode-btn').forEach(b => b.classList.toggle('is-active', b.dataset.mode === mode));
}

/* ---------------------------------------------------------------
   FILTROS + GRID
--------------------------------------------------------------- */
function renderFiltros() {
    const cats = ['todos', ...new Set(productos.map(p => p.categoria))];
    const wrap = $('#filters');
    wrap.innerHTML = '';
    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-btn' + (cat === filtroActual ? ' is-active' : '');
        btn.textContent = cat === 'todos' ? 'Todos' : cat;
        btn.dataset.cat = cat;
        btn.addEventListener('click', () => {
            filtroActual = cat;
            renderFiltros();
            renderGrid();
        });
        wrap.appendChild(btn);
    });
}

function precioFinal(p) {
    if (!p.descuento) return p.precio;
    return Math.round(p.precio * (1 - p.descuento / 100));
}

function renderGrid() {
    const grid = $('#productGrid');
    grid.innerHTML = '';

    let lista = filtroActual === 'todos' ? [...productos] :
        productos.filter(p => p.categoria === filtroActual);

    // Modo "personalizado": si ya viste productos de alguna categoría,
    // esa categoría sube al inicio — igual que en tu index.php real.
    if (filtroActual === 'todos' && Object.keys(vistasPorCategoria).length) {
        lista.sort((a, b) => (vistasPorCategoria[b.categoria] || 0) - (vistasPorCategoria[a.categoria] || 0));
    }

    if (lista.length === 0) {
        grid.innerHTML = '<p style="color:var(--muted);">No hay productos en esta categoría todavía.</p>';
        return;
    }

    lista.forEach(p => grid.appendChild(crearCard(p)));
}

function crearCard(p) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const esFav = favoritos.has(p.id);
    const pFinal = precioFinal(p);
    const sinStock = p.stock <= 0;

    card.innerHTML = `
    <div class="product-img-wrap" data-open-detail="${p.id}">
      ${p.descuento ? `<span class="discount-pill">-${p.descuento}%</span>` : ''}
      <button type="button" class="fav-btn ${esFav ? 'is-active' : ''}" data-fav="${p.id}" aria-label="Favorito">
        <svg viewBox="0 0 24 24" stroke-width="1.8"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.6 4c2-.3 3.8.7 6.4 3.4C14.6 4.7 16.4 3.7 18.4 4 22 4.5 23.6 8 22 11.7 19.5 16.4 12 21 12 21z"/></svg>
      </button>
      <img src="${p.imagen}" alt="${p.nombre}">
      <div class="admin-controls">
        <button type="button" data-edit="${p.id}" title="Editar">✎</button>
        <button type="button" class="danger" data-delete="${p.id}" title="Eliminar">✕</button>
      </div>
    </div>
    <div class="product-info">
      <p class="product-cat">${p.categoria}</p>
      <p class="product-name">${p.nombre}</p>
      <div class="product-price-row">
        <span class="price-final">RD$ ${pFinal.toLocaleString()}</span>
        ${p.descuento ? `<span class="price-old">RD$ ${p.precio.toLocaleString()}</span>` : ''}
      </div>
      <p class="stock-note">${sinStock ? 'Agotado' : p.stock + ' disponibles'}</p>
      <button type="button" class="add-cart-btn" data-open-detail="${p.id}" ${sinStock ? 'disabled' : ''}>
        ${sinStock ? 'Sin stock' : 'Agregar al carrito'}
      </button>
    </div>
  `;

  card.querySelectorAll('[data-open-detail]').forEach(el =>
    el.addEventListener('click', () => abrirDetalle(p.id))
  );
  card.querySelector('[data-fav]').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorito(p.id);
  });
  const editBtn = card.querySelector('[data-edit]');
  const delBtn  = card.querySelector('[data-delete]');
  if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); abrirFormulario(p.id); });
  if (delBtn)  delBtn.addEventListener('click', (e) => { e.stopPropagation(); eliminarProducto(p.id); });

  return card;
}

/* ---------------------------------------------------------------
   FAVORITOS
--------------------------------------------------------------- */
function toggleFavorito(id) {
  if (favoritos.has(id)) favoritos.delete(id);
  else favoritos.add(id);
  renderGrid();
  renderFavPanel();
  actualizarContadores();
}

function bindFavPanel() {
  $$('[data-close-fav]').forEach(b => b.addEventListener('click', () => togglePanel('#favOverlay', false)));
  $('#favOverlay').addEventListener('click', (e) => { if (e.target.id === 'favOverlay') togglePanel('#favOverlay', false); });
}

function renderFavPanel() {
  const wrap = $('#favItems');
  const lista = productos.filter(p => favoritos.has(p.id));
  if (lista.length === 0) {
    wrap.innerHTML = '<p class="cart-empty">Aún no tienes favoritos.</p>';
    return;
  }
  wrap.innerHTML = lista.map(p => `
    <div class="cart-item">
      <img src="${p.imagen}" alt="${p.nombre}">
      <div class="cart-item-info">
        <p class="cart-item-name">${p.nombre}</p>
        <p class="cart-item-meta">RD$ ${precioFinal(p).toLocaleString()}</p>
        <button type="button" class="cart-item-remove" data-unfav="${p.id}">Quitar de favoritos</button>
      </div>
    </div>
  `).join('');
  $$('[data-unfav]', wrap).forEach(b => b.addEventListener('click', () => toggleFavorito(parseInt(b.dataset.unfav))));
}

/* ---------------------------------------------------------------
   DETALLE DE PRODUCTO
--------------------------------------------------------------- */
let detalleActual = null;

function bindDetailModal() {
  $('#detailOverlay').addEventListener('click', (e) => { if (e.target.id === 'detailOverlay') togglePanel('#detailOverlay', false); });
}

function abrirDetalle(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  detalleActual = { producto: p, talla: p.tallas[0] || null, color: p.colores[0] || null, cantidad: 1 };
  renderDetalle();
  togglePanel('#detailOverlay', true);

  // Simula registrar_vista_producto.php: guarda que se vio esta categoría,
  // para reordenar "Todos" la próxima vez (solo en esta sesión).
  vistasPorCategoria[p.categoria] = (vistasPorCategoria[p.categoria] || 0) + 1;
}

function renderDetalle() {
  const { producto: p, talla, color, cantidad } = detalleActual;
  const panel = $('#detailPanel');
  panel.innerHTML = `
    <img class="detail-img" src="${p.imagen}" alt="${p.nombre}">
    <div class="detail-content">
      <p class="product-cat">${p.categoria}</p>
      <h2>${p.nombre}</h2>
      <div class="product-price-row">
        <span class="price-final">RD$ ${precioFinal(p).toLocaleString()}</span>
        ${p.descuento ? `<span class="price-old">RD$ ${p.precio.toLocaleString()}</span>` : ''}
      </div>
      <p class="detail-desc">Producto de ejemplo para la demo — reemplaza esta descripción con la real de tu catálogo.</p>

      ${p.tallas.length ? `
        <div class="option-group">
          <label>Talla</label>
          <div class="option-pills" data-group="talla">
            ${p.tallas.map(t => `<button type="button" class="option-pill ${t === talla ? 'is-active' : ''}" data-val="${t}">${t}</button>`).join('')}
          </div>
        </div>` : ''}

      ${p.colores.length ? `
        <div class="option-group">
          <label>Color</label>
          <div class="option-pills" data-group="color">
            ${p.colores.map(c => `<button type="button" class="option-pill ${c === color ? 'is-active' : ''}" data-val="${c}">${c}</button>`).join('')}
          </div>
        </div>` : ''}

      <div class="qty-row">
        <button type="button" data-qty="-1">−</button>
        <span id="detailQty">${cantidad}</span>
        <button type="button" data-qty="1">+</button>
      </div>

      <button type="button" class="btn btn-primary" id="confirmAddCart" style="width:100%;justify-content:center;">
        Agregar al carrito
      </button>
    </div>
  `;

  $$('.option-pill[data-val]', panel).forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.parentElement.dataset.group;
      detalleActual[group] = btn.dataset.val;
      renderDetalle();
    });
  });
  $$('[data-qty]', panel).forEach(btn => {
    btn.addEventListener('click', () => {
      detalleActual.cantidad = Math.max(1, detalleActual.cantidad + parseInt(btn.dataset.qty));
      renderDetalle();
    });
  });
  $('#confirmAddCart').addEventListener('click', () => {
    agregarAlCarrito(p.id, detalleActual.cantidad, detalleActual.talla, detalleActual.color);
    togglePanel('#detailOverlay', false);
    togglePanel('#cartOverlay', true);
  });
}

/* ---------------------------------------------------------------
   CARRITO
--------------------------------------------------------------- */
function agregarAlCarrito(producto_id, cantidad, talla, color) {
  const existente = carrito.find(i => i.producto_id === producto_id && i.talla === talla && i.color === color);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({ cartId: nextCartId++, producto_id, cantidad, talla, color });
  }
  renderCartPanel();
  actualizarContadores();
  mostrarToast('Agregado al carrito');
}

function bindCartPanel() {
  $$('[data-close-cart]').forEach(b => b.addEventListener('click', () => togglePanel('#cartOverlay', false)));
  $('#cartOverlay').addEventListener('click', (e) => { if (e.target.id === 'cartOverlay') togglePanel('#cartOverlay', false); });
  $('#shareCartBtn').addEventListener('click', compartirCarrito);
  renderCartPanel();
}

function renderCartPanel() {
  const wrap = $('#cartItems');
  if (carrito.length === 0) {
    wrap.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
  } else {
    wrap.innerHTML = carrito.map(item => {
      const p = productos.find(x => x.id === item.producto_id);
      if (!p) return '';
      return `
        <div class="cart-item">
          <img src="${p.imagen}" alt="${p.nombre}">
          <div class="cart-item-info">
            <p class="cart-item-name">${p.nombre}</p>
            <p class="cart-item-meta">${[item.talla, item.color].filter(Boolean).join(' · ') || 'Sin variantes'} · RD$ ${precioFinal(p).toLocaleString()}</p>
            <div class="cart-item-qty">
              <button type="button" data-cart-qty="${item.cartId}:-1">−</button>
              <span>${item.cantidad}</span>
              <button type="button" data-cart-qty="${item.cartId}:1">+</button>
            </div>
            <button type="button" class="cart-item-remove" data-cart-remove="${item.cartId}">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  }

  $$('[data-cart-qty]', wrap).forEach(b => {
    b.addEventListener('click', () => {
      const [cartId, delta] = b.dataset.cartQty.split(':').map(Number);
      const item = carrito.find(i => i.cartId === cartId);
      if (!item) return;
      item.cantidad = Math.max(1, item.cantidad + delta);
      renderCartPanel();
      actualizarContadores();
    });
  });
  $$('[data-cart-remove]', wrap).forEach(b => {
    b.addEventListener('click', () => {
      carrito = carrito.filter(i => i.cartId !== parseInt(b.dataset.cartRemove));
      renderCartPanel();
      actualizarContadores();
    });
  });

  const total = carrito.reduce((sum, item) => {
    const p = productos.find(x => x.id === item.producto_id);
    return p ? sum + precioFinal(p) * item.cantidad : sum;
  }, 0);
  $('#cartTotal').textContent = `RD$ ${total.toLocaleString()}`;

  const mensaje = carrito.map(item => {
    const p = productos.find(x => x.id === item.producto_id);
    if (!p) return '';
    const variantes = [item.talla, item.color].filter(Boolean).join(' / ');
    return `• ${item.cantidad}x ${p.nombre}${variantes ? ' (' + variantes + ')' : ''} — RD$ ${(precioFinal(p) * item.cantidad).toLocaleString()}`;
  }).join('\n');
  const texto = encodeURIComponent(`Hola, quiero pedir:\n\n${mensaje}\n\nTotal: RD$ ${total.toLocaleString()}`);
  $('#whatsappCheckoutBtn').href = `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`;
}

function compartirCarrito() {
  if (carrito.length === 0) {
    mostrarToast('Tu carrito está vacío');
    return;
  }
  const payload = carrito.map(i => ({ p: i.producto_id, c: i.cantidad, t: i.talla, k: i.color }));
  const codificado = btoa(encodeURIComponent(JSON.stringify(payload)));
  const url = `${location.origin}${location.pathname}?carrito=${codificado}`;

  navigator.clipboard?.writeText(url).then(() => {
    mostrarToast('Enlace copiado al portapapeles');
  }).catch(() => {
    prompt('Copia este enlace para compartir tu carrito:', url);
  });
}

function cargarCarritoCompartidoDesdeURL() {
  const params = new URLSearchParams(location.search);
  const codificado = params.get('carrito');
  if (!codificado) return;
  try {
    const payload = JSON.parse(decodeURIComponent(atob(codificado)));
    carrito = payload.map(item => ({
      cartId: nextCartId++,
      producto_id: item.p,
      cantidad: item.c,
      talla: item.t || null,
      color: item.k || null,
    }));
  } catch (e) {
    console.warn('No se pudo leer el carrito compartido de la URL', e);
  }
}

/* ---------------------------------------------------------------
   CONTADORES / TOAST / PANELES
--------------------------------------------------------------- */
function actualizarContadores() {
  $('#favCount').textContent = favoritos.size;
  $('#cartCount').textContent = carrito.reduce((sum, i) => sum + i.cantidad, 0);
}

function togglePanel(selector, abrir) {
  const el = $(selector);
  el.classList.toggle('is-open', abrir);
  if (abrir && selector === '#cartOverlay') renderCartPanel();
  if (abrir && selector === '#favOverlay') renderFavPanel();
}

let toastTimeout;
function mostrarToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

/* ---------------------------------------------------------------
   ADMIN: AGREGAR / EDITAR / ELIMINAR (todo en memoria)
--------------------------------------------------------------- */
function bindAdminForm() {
  $$('[data-close-form]').forEach(b => b.addEventListener('click', () => togglePanel('#formOverlay', false)));
  $('#formOverlay').addEventListener('click', (e) => { if (e.target.id === 'formOverlay') togglePanel('#formOverlay', false); });

  $('#productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = fd.get('id') ? parseInt(fd.get('id')) : null;

    const datos = {
      nombre: fd.get('nombre').trim(),
      precio: parseFloat(fd.get('precio')) || 0,
      categoria: fd.get('categoria').trim() || 'General',
      stock: parseInt(fd.get('stock')) || 0,
      tallas: fd.get('tallas').split(',').map(t => t.trim()).filter(Boolean),
      colores: fd.get('colores').split(',').map(c => c.trim()).filter(Boolean),
      imagen: fd.get('imagen').trim() || `https://placehold.co/600x750/EFEFEA/1B1B1F?text=${encodeURIComponent(fd.get('nombre'))}`,
    };

    if (id) {
      const p = productos.find(x => x.id === id);
      Object.assign(p, datos);
      mostrarToast('Producto actualizado (solo en esta sesión)');
    } else {
      productos.push({ id: nextId++, descuento: 0, ...datos });
      mostrarToast('Producto agregado (solo en esta sesión)');
    }

    togglePanel('#formOverlay', false);
    renderFiltros();
    renderGrid();
  });
}

function abrirFormulario(id = null) {
  const form = $('#productForm');
  form.reset();
  if (id) {
    const p = productos.find(x => x.id === id);
    $('#formTitle').textContent = 'Editar producto';
    form.id.value = p.id;
    form.nombre.value = p.nombre;
    form.precio.value = p.precio;
    form.categoria.value = p.categoria;
    form.stock.value = p.stock;
    form.tallas.value = p.tallas.join(',');
    form.colores.value = p.colores.join(',');
    form.imagen.value = p.imagen;
  } else {
    $('#formTitle').textContent = 'Agregar producto';
    form.id.value = '';
  }
  togglePanel('#formOverlay', true);
}

function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto de la demo?')) return;
  productos = productos.filter(p => p.id !== id);
  favoritos.delete(id);
  carrito = carrito.filter(i => i.producto_id !== id);
  renderFiltros();
  renderGrid();
  renderCartPanel();
  renderFavPanel();
  actualizarContadores();
  mostrarToast('Producto eliminado (solo en esta sesión)');
}