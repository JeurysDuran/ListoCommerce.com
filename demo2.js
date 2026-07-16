// ============================================================
// demo.js — catálogo interactivo sin base de datos.
// Los productos "de fábrica" viven en SEED_PRODUCTS.
// Lo que el modo admin agregue/edite/borre vive solo en memoria
// (array `productos`) y desaparece al recargar la página, tal
// como se pidió: nada de esto toca un servidor real.
// ============================================================

const SEED_PRODUCTS = [
    { id: 1, nombre: 'Camiseta Oversize Ecru', categoria: 'Camisetas', precio: 890, descuento: 0, imagen: 'imgdemo/camiseta1.webp', stock: 14, tallas: ['S', 'M', 'L', 'XL'], colores: ['Blanco', 'Negro'] },
    { id: 2, nombre: 'Hoodie Estructurado', categoria: 'Hoodies', precio: 2100, descuento: 15, imagen: 'imgdemo/hoddie2.webp', stock: 6, tallas: ['M', 'L', 'XL'], colores: ['Gris', 'Negro'] },
    { id: 3, nombre: 'Pantalón Cargo Recto', categoria: 'Pantalones', precio: 1750, descuento: 0, imagen: 'imgdemo/pantalon3.webp', stock: 9, tallas: ['28', '30', '32', '34'], colores: ['Beige', 'Negro'] },
    { id: 4, nombre: 'Gorra Bordada', categoria: 'Accesorios', precio: 650, descuento: 0, imagen: 'imgdemo/gorra4.webp', stock: 20, tallas: [], colores: ['Negro', 'Verde'] },
    { id: 5, nombre: 'Camiseta Gráfica Vintage', categoria: 'Camisetas', precio: 950, descuento: 20, imagen: 'imgdemo/camiseta5.webp', stock: 3, tallas: ['S', 'M', 'L'], colores: ['Blanco'] },
    { id: 6, nombre: 'Chaqueta Ligera Cortavientos', categoria: 'Chaquetas', precio: 2600, descuento: 0, imagen: 'imgdemo/chaqueta6.webp', stock: 5, tallas: ['M', 'L', 'XL'], colores: ['Azul', 'Negro'] },
    { id: 7, nombre: 'Bolso Tote de Lona', categoria: 'Accesorios', precio: 720, descuento: 0, imagen: 'imgdemo/bolso7.webp', stock: 11, tallas: [], colores: ['Crudo'] },
    { id: 8, nombre: 'Pantalón Jogger Slim', categoria: 'Pantalones', precio: 1450, descuento: 10, imagen: 'imgdemo/pantalon8.webp', stock: 0, tallas: ['S', 'M', 'L', 'XL'], colores: ['Negro', 'Gris'] },
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

// Categorías administrables (como crear_categoria.php, pero en memoria).
let categorias = [...new Set(SEED_PRODUCTS.map(p => p.categoria))];

// Simula analytics.php: cuenta vistas, likes y agregados al carrito por
// producto durante esta sesión (nada se guarda en servidor).
let analytics = {
    vistas: {}, // producto_id -> veces visto
    likes: {}, // producto_id -> veces marcado como favorito
    agregadosCarrito: {}, // producto_id -> veces agregado al carrito
};

function registrarEvento(mapa, id) {
    mapa[id] = (mapa[id] || 0) + 1;
}

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
    bindCategoriesPanel();
    bindAnalyticsPanel();
    bindSearch();
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
    $('#categoriesBtn').addEventListener('click', () => {
        renderCategoryList();
        togglePanel('#categoriesOverlay', true);
    });
    $('#analyticsBtn').addEventListener('click', () => {
        renderAnalytics();
        togglePanel('#analyticsOverlay', true);
    });
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
    const cats = ['todos', ...categorias];
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
    card.className = 'producto';
    card.dataset.id = p.id;

    const esFav = favoritos.has(p.id);
    const pFinal = precioFinal(p);
    const sinStock = p.stock <= 0;

    card.innerHTML = `
    <div class="producto-img-wrap" data-open-detail="${p.id}">
      <span class="producto-categoria">${p.categoria}</span>
      <button type="button" class="fav-btn ${esFav ? 'is-active' : ''}" data-fav="${p.id}" aria-label="Favorito">
        <i class="fas fa-heart"></i>
      </button>
      <img src="${p.imagen}" alt="${p.nombre}" class="producto-imagen">
      ${p.descuento ? `<div class="descuento-badge">-${p.descuento}%</div>` : ''}
      <div class="admin-controls">
        <button type="button" data-edit="${p.id}" title="Editar"><i class="fas fa-pen"></i></button>
        <button type="button" class="danger" data-delete="${p.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="producto-body" data-open-detail="${p.id}" style="cursor:pointer;">
      <p class="producto-nombre">${p.nombre}</p>
      <div class="precio-wrap">
        <span class="precio-final ${p.descuento ? 'con-descuento' : ''}">$${pFinal.toLocaleString()}</span>
        ${p.descuento ? `<span class="precio-original">$${p.precio.toLocaleString()}</span>` : ''}
      </div>
      ${sinStock
        ? '<div class="stock-badge stock-agotado"><i class="fas fa-times-circle"></i> Agotado</div>'
        : p.stock <= 5
          ? `<div class="stock-badge stock-bajo"><i class="fas fa-exclamation-triangle"></i> ¡Solo ${p.stock}!</div>`
          : p.stock <= 15
            ? `<div class="stock-badge stock-medio"><i class="fas fa-clock"></i> Pocas unidades</div>`
            : '<div class="stock-badge stock-ok"><i class="fas fa-check-circle"></i> En stock</div>'}
      <div class="producto-acciones" onclick="event.stopPropagation()">
        <button type="button" class="add-cart-btn" data-open-detail="${p.id}" ${sinStock ? 'disabled' : ''}>
          ${sinStock ? 'Sin stock' : 'Agregar'}
        </button>
      </div>
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
  else { favoritos.add(id); registrarEvento(analytics.likes, id); }
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
  registrarEvento(analytics.vistas, p.id);
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
  registrarEvento(analytics.agregadosCarrito, producto_id);
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

  // ── Imagen: clic/drag&drop → preview en base64 (nada se sube a un servidor) ──
  const fileInput   = $('#fileInput');
  const uploadArea  = $('#uploadArea');
  const previewWrap = $('#previewWrap');
  const previewImg  = $('#imagePreview');
  const imagenData  = $('input[name="imagenData"]', $('#productForm'));

  function cargarImagen(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagenData.value = e.target.result;
      previewImg.src = e.target.result;
      previewWrap.classList.add('is-visible');
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', () => cargarImagen(fileInput.files[0]));
  ['dragover', 'dragenter'].forEach(ev => uploadArea.addEventListener(ev, (e) => { e.preventDefault(); uploadArea.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach(ev => uploadArea.addEventListener(ev, (e) => { e.preventDefault(); uploadArea.classList.remove('is-drag'); }));
  uploadArea.addEventListener('drop', (e) => cargarImagen(e.dataTransfer.files[0]));
  $('#previewClear').addEventListener('click', () => {
    imagenData.value = '';
    fileInput.value = '';
    previewWrap.classList.remove('is-visible');
  });

  // ── Switch de descuento ──
  const descSwitch = $('#descSwitch');
  const descField  = $('#descField');
  $('#descToggle').addEventListener('click', () => {
    const activo = descSwitch.classList.toggle('is-on');
    descField.style.display = activo ? 'flex' : 'none';
    if (!activo) descField.querySelector('input').value = '';
  });

  // ── Envío del formulario ──
  $('#productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = fd.get('id') ? parseInt(fd.get('id')) : null;
    const anterior = id ? productos.find(x => x.id === id) : null;

    const datos = {
      nombre: fd.get('nombre').trim(),
      precio: parseFloat(fd.get('precio')) || 0,
      categoria: fd.get('categoria'),
      stock: parseInt(fd.get('stock')) || 0,
      tallas: fd.get('tallas').split(',').map(t => t.trim()).filter(Boolean),
      colores: fd.get('colores').split(',').map(c => c.trim()).filter(Boolean),
      descuento: descSwitch.classList.contains('is-on') ? (parseInt(fd.get('descuento')) || 0) : 0,
      imagen: fd.get('imagenData') || anterior?.imagen || `https://placehold.co/600x750/EFEFEA/1B1B1F?text=${encodeURIComponent(fd.get('nombre'))}`,
    };

    if (id) {
      Object.assign(anterior, datos);
      mostrarToast('Producto actualizado (solo en esta sesión)');
    } else {
      productos.push({ id: nextId++, ...datos });
      mostrarToast('Producto agregado (solo en esta sesión)');
    }

    togglePanel('#formOverlay', false);
    renderFiltros();
    renderGrid();
  });
}

function renderCategoriaSelect(seleccionada = null) {
  const select = $('#categoriaSelect');
  select.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
  if (seleccionada) select.value = seleccionada;
}

function abrirFormulario(id = null) {
  const form = $('#productForm');
  form.reset();
  $('#previewWrap').classList.remove('is-visible');
  $('#descSwitch').classList.remove('is-on');
  $('#descField').style.display = 'none';
  renderCategoriaSelect();

  if (id) {
    const p = productos.find(x => x.id === id);
    $('#formTitle').textContent = 'Editar producto';
    form.id.value = p.id;
    form.nombre.value = p.nombre;
    form.precio.value = p.precio;
    renderCategoriaSelect(p.categoria);
    form.stock.value = p.stock;
    form.tallas.value = p.tallas.join(',');
    form.colores.value = p.colores.join(',');
    if (p.imagen) {
      $('#imagePreview').src = p.imagen;
      $('#previewWrap').classList.add('is-visible');
    }
    if (p.descuento) {
      $('#descSwitch').classList.add('is-on');
      $('#descField').style.display = 'flex';
      form.descuento.value = p.descuento;
    }
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

/* ---------------------------------------------------------------
   ADMIN: CATEGORÍAS (como crear_categoria.php, en memoria)
--------------------------------------------------------------- */
function bindCategoriesPanel() {
  $$('[data-close-categories]').forEach(b => b.addEventListener('click', () => togglePanel('#categoriesOverlay', false)));
  $('#categoriesOverlay').addEventListener('click', (e) => { if (e.target.id === 'categoriesOverlay') togglePanel('#categoriesOverlay', false); });

  $('#categoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nombre = fd.get('nombre').trim();
    if (!nombre) return;
    if (categorias.some(c => c.toLowerCase() === nombre.toLowerCase())) {
      mostrarToast('Esa categoría ya existe');
      return;
    }
    categorias.push(nombre);
    e.target.reset();
    renderFiltros();
    renderCategoryList();
    mostrarToast('Categoría agregada (solo en esta sesión)');
  });
}

function renderCategoryList() {
  const wrap = $('#categoryList');
  wrap.innerHTML = categorias.map(cat => {
    const count = productos.filter(p => p.categoria === cat).length;
    return `
      <div class="cat-row">
        <span>${cat}<span class="cat-row-count">${count} producto${count === 1 ? '' : 's'}</span></span>
        <div class="cat-row-actions">
          <button type="button" data-del-cat="${cat}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('') || '<p class="analytics-empty">No hay categorías todavía.</p>';

  $$('[data-del-cat]', wrap).forEach(b => {
    b.addEventListener('click', () => {
      const cat = b.dataset.delCat;
      const enUso = productos.some(p => p.categoria === cat);
      if (enUso) {
        mostrarToast('No se puede eliminar: hay productos usándola');
        return;
      }
      categorias = categorias.filter(c => c !== cat);
      renderFiltros();
      renderCategoryList();
    });
  });
}

/* ---------------------------------------------------------------
   ADMIN: ANALÍTICAS (como analytics.php, contado en memoria)
--------------------------------------------------------------- */
function renderAnalytics() {
  const totalVistas   = Object.values(analytics.vistas).reduce((a, b) => a + b, 0);
  const totalLikes    = Object.values(analytics.likes).reduce((a, b) => a + b, 0);
  const totalCarrito  = Object.values(analytics.agregadosCarrito).reduce((a, b) => a + b, 0);

  function top(mapa, n = 3) {
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([id, veces]) => ({ producto: productos.find(p => p.id === parseInt(id)), veces }))
      .filter(x => x.producto);
  }

  function renderLista(items, etiqueta) {
    if (items.length === 0) return `<p class="analytics-empty">Todavía no hay ${etiqueta}.</p>`;
    return items.map(({ producto, veces }) => `
      <div class="analytics-row">
        <span>${producto.nombre}</span>
        <strong>${veces}</strong>
      </div>
    `).join('');
  }

  $('#analyticsBody').innerHTML = `
    <div class="analytics-cards">
      <div class="analytics-card"><div class="num">${totalVistas}</div><div class="lbl">Vistas de producto</div></div>
      <div class="analytics-card"><div class="num">${totalLikes}</div><div class="lbl">Favoritos</div></div>
      <div class="analytics-card"><div class="num">${totalCarrito}</div><div class="lbl">Agregados al carrito</div></div>
      <div class="analytics-card"><div class="num">${carrito.length}</div><div class="lbl">Líneas en el carrito</div></div>
    </div>

    <p class="analytics-section-title">MÁS VISTOS</p>
    ${renderLista(top(analytics.vistas), 'vistas')}

    <p class="analytics-section-title">MÁS AGREGADOS AL CARRITO</p>
    ${renderLista(top(analytics.agregadosCarrito), 'productos en carritos')}
  `;
}

function bindAnalyticsPanel() {
  $$('[data-close-analytics]').forEach(b => b.addEventListener('click', () => togglePanel('#analyticsOverlay', false)));
  $('#analyticsOverlay').addEventListener('click', (e) => { if (e.target.id === 'analyticsOverlay') togglePanel('#analyticsOverlay', false); });
}

/* ---------------------------------------------------------------
   BUSCADOR — como el de index.php, con sugerencias en vivo
--------------------------------------------------------------- */
function bindSearch() {
  const inputs = [
    { input: $('#searchInput'), dropdown: $('#searchDropdown') },
    { input: $('#searchInputMobile'), dropdown: $('#searchDropdownMobile') },
  ];

  inputs.forEach(({ input, dropdown }) => {
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      // Mantener ambos campos sincronizados
      inputs.forEach(o => { if (o.input && o.input !== input) o.input.value = input.value; });
      mostrarSugerencias(input.value, dropdown);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        ejecutarBusqueda(input.value);
        dropdown.style.display = 'none';
      }
    });
  });

  $('#searchBtn')?.addEventListener('click', () => ejecutarBusqueda($('#searchInput').value));

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box') && !e.target.closest('.mob-search-wrap')) {
      $('#searchDropdown').style.display = 'none';
      $('#searchDropdownMobile').style.display = 'none';
    }
  });
}

function mostrarSugerencias(valor, dropdown) {
  const q = valor.trim().toLowerCase();
  if (q.length < 1) { dropdown.style.display = 'none'; return; }

  const coincidencias = productos.filter(p => p.nombre.toLowerCase().includes(q)).slice(0, 7);
  if (coincidencias.length === 0) {
    dropdown.innerHTML = '<div class="sugerencia-vacia">Sin resultados</div>';
  } else {
    dropdown.innerHTML = coincidencias.map(p => {
      const resaltado = p.nombre.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<strong>$1</strong>');
      return `<div class="sugerencia-item" data-id="${p.id}">${resaltado}</div>`;
    }).join('');
    $$('.sugerencia-item', dropdown).forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id);
        dropdown.style.display = 'none';
        $('#searchInput').value = '';
        if ($('#searchInputMobile')) $('#searchInputMobile').value = '';
        abrirDetalle(id);
      });
    });
  }
  dropdown.style.display = 'block';
}

function ejecutarBusqueda(texto) {
  const q = texto.trim().toLowerCase();
  filtroActual = 'todos';
  renderFiltros();

  const grid = $('#productGrid');
  grid.innerHTML = '';
  const resultados = q === '' ? productos : productos.filter(p => p.nombre.toLowerCase().includes(q));

  $('#sectionTitle').textContent = q ? `Resultados: "${texto}"` : 'Todos los Productos';
  $('#sectionSubtitle').textContent = q ? `${resultados.length} producto${resultados.length !== 1 ? 's' : ''}` : 'Colección completa';

  if (resultados.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:48px;color:var(--gray-400);">No encontramos productos para tu búsqueda.</p>';
    return;
  }
  resultados.forEach(p => grid.appendChild(crearCard(p)));
  document.querySelector('.section-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}