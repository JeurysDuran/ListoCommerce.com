// ============================================================
// script.js — menú móvil, selector cliente/admin y carruseles
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Año en el footer ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Menú móvil ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const navMobile  = document.getElementById('navMobile');

  if (menuToggle && navMobile) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navMobile.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });

    // Cerrar el menú al tocar un enlace
    navMobile.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMobile.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  /* ---------- Selector Cliente / Admin ----------
     Por ahora solo cambia el estado visual y guarda la preferencia.
     Cuando conectes el backend real, usa `document.body.dataset.mode`
     para mostrar/ocultar bloques con [data-admin-only] / [data-client-only]. */
  const modeButtons = document.querySelectorAll('.mode-btn');
  const savedMode = localStorage.getItem('vista_modo') || 'cliente';
  document.body.dataset.mode = savedMode;

  function setMode(mode) {
    document.body.dataset.mode = mode;
    localStorage.setItem('vista_modo', mode);
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.mode === mode);
    });
  }
  setMode(savedMode);

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  /* ---------- Carruseles ----------
     Funciona con cualquier número de .carousel-slide dentro de cada
     [data-carousel]: solo agrega o quita slides en el HTML. */
  document.querySelectorAll('[data-carousel]').forEach(initCarousel);

  function initCarousel(root) {
    const track  = root.querySelector('.carousel-track');
    const slides = Array.from(root.querySelectorAll('.carousel-slide'));
    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const dotsWrap = root.querySelector('[data-carousel-dots]');

    if (!track || slides.length === 0) return;

    let index = 0;

    // Construir los indicadores
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Ir a la imagen ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    // Si solo hay una slide, ocultar controles
    if (slides.length <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (dotsWrap) dotsWrap.style.display = 'none';
      return;
    }

    function update() {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      update();
    }

    prevBtn && prevBtn.addEventListener('click', () => goTo(index - 1));
    nextBtn && nextBtn.addEventListener('click', () => goTo(index + 1));

    // Deslizar con el dedo en móvil
    let startX = null;
    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      if (startX === null) return;
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? index - 1 : index + 1);
      startX = null;
    }, { passive: true });

    update();
  }

  /* ---------- Revelar secciones al hacer scroll ---------- */
  const revealTargets = document.querySelectorAll('.section-inner');
  revealTargets.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach(el => observer.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

});
