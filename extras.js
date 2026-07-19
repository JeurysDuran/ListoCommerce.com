(function () {
  "use strict";

  /* =====================================================================
     MODAL DE PLANES + CAPTURA PROGRESIVA DE LEADS
     ===================================================================== */

  var modal = document.getElementById("planesModal");
  var form = document.getElementById("planesForm");
  var openTriggers = document.querySelectorAll(".js-open-planes");
  var closeTriggers = modal ? modal.querySelectorAll("[data-planes-close]") : [];
  var CORREO_RESPALDO = "jeurysdurancuentanube@gmail.com";
  var PLANES_URL = "precios.html";
  var GUARDAR_LEAD_URL = "guardar_lead.php";

  function getLeadUid() {
    var uid = localStorage.getItem("leadUid");
    if (!uid) {
      uid = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "lead-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      localStorage.setItem("leadUid", uid);
    }
    return uid;
  }

  function guardarCampo(campo, valor) {
    if (!valor) return;
    var payload = { lead_uid: getLeadUid(), campo: campo, valor: valor };
    try {
      fetch(GUARDAR_LEAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () { /* silencioso: se reintenta al enviar el formulario */ });
    } catch (e) { /* fetch no disponible o bloqueado, seguimos sin romper la UI */ }
  }

  function abrirModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var primerCampo = form ? form.querySelector("input[name='nombre']") : null;
    if (primerCampo) setTimeout(function () { primerCampo.focus(); }, 50);
  }

  function cerrarModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openTriggers.forEach(function (btn) {
    btn.addEventListener("click", abrirModal);
  });

  closeTriggers.forEach(function (el) {
    el.addEventListener("click", cerrarModal);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && modal.classList.contains("is-open")) {
      cerrarModal();
    }
  });

  if (form) {
    // Guarda cada campo apenas el usuario lo completa, así aunque cierre
    // el formulario a la mitad, ya queda un registro parcial del lead.
    form.querySelectorAll("input, select").forEach(function (campo) {
      campo.addEventListener("blur", function () {
        campo.classList.add("touched");
        guardarCampo(campo.name, campo.value.trim());
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var datos = {};
      form.querySelectorAll("input, select").forEach(function (campo) {
        datos[campo.name] = campo.value.trim();
        campo.classList.add("touched");
      });

      if (!datos.nombre || !datos.empresa || !datos.tipo_empresa || !datos.correo) {
        form.reportValidity();
        return;
      }

      var payloadFinal = Object.assign({}, datos, {
        lead_uid: getLeadUid(),
        completado: 1
      });

      var submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Un momento...";
      }

      fetch(GUARDAR_LEAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFinal)
      })
        .then(function () {
          irAPlanes();
        })
        .catch(function () {
          // Si no hay backend disponible en este hosting, no perdemos el
          // contacto: abrimos un correo pre-rellenado como respaldo.
          abrirCorreoDeRespaldo(datos);
          irAPlanes();
        });
    });
  }

  function abrirCorreoDeRespaldo(datos) {
    var asunto = "Nuevo interesado en planes — " + datos.empresa;
    var cuerpo =
      "Nombre: " + datos.nombre + "\n" +
      "Empresa: " + datos.empresa + "\n" +
      "Tipo de negocio: " + datos.tipo_empresa + "\n" +
      "Correo: " + datos.correo + "\n" +
      "WhatsApp: " + (datos.telefono || "No indicado");

    var mailto = "mailto:" + CORREO_RESPALDO +
      "?subject=" + encodeURIComponent(asunto) +
      "&body=" + encodeURIComponent(cuerpo);

    window.open(mailto, "_blank");
  }

  function irAPlanes() {
    window.location.href = PLANES_URL;
  }


  /* =====================================================================
     AVISO DE COOKIES
     ===================================================================== */

  var cookieBanner = document.getElementById("cookieBanner");

  if (cookieBanner) {
    var consentimiento = localStorage.getItem("cookieConsent");

    if (!consentimiento) {
      cookieBanner.classList.add("is-visible");
      cookieBanner.setAttribute("aria-hidden", "false");
    }

    cookieBanner.querySelectorAll("[data-cookie]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        localStorage.setItem("cookieConsent", btn.getAttribute("data-cookie"));
        cookieBanner.classList.remove("is-visible");
        cookieBanner.setAttribute("aria-hidden", "true");
      });
    });
  }
})();
