/**
 * Menu Toggle - Menú Hamburguesa Responsive
 * EASP 40 Años - Proyecto Web
 */

(function() {
  'use strict';
  
  // Esperar a que el DOM esté completamente cargado
  document.addEventListener('DOMContentLoaded', function() {
    
    // Elementos del DOM
    const toggle = document.querySelector('.navbar-toggle');
    const nav = document.querySelector('nav');
    const body = document.body;
    
    // Si no existen los elementos, salir
    if (!toggle || !nav) return;
    
    // Toggle del menú
    function toggleMenu() {
      toggle.classList.toggle('active');
      nav.classList.toggle('active');
      body.classList.toggle('menu-open');
      
      // Accesibilidad: actualizar aria-expanded
      const isExpanded = toggle.classList.contains('active');
      toggle.setAttribute('aria-expanded', isExpanded);
      
      // Prevenir scroll cuando el menú está abierto en móvil
      if (isExpanded) {
        body.style.overflow = 'hidden';
      } else {
        body.style.overflow = '';
      }
    }
    
    // Click en el botón hamburguesa
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMenu();
    });
    
    // Cerrar menú al hacer click en un enlace
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
          toggleMenu();
        }
      });
    });
    
    // Cerrar menú al hacer click fuera
    document.addEventListener('click', function(e) {
      if (nav.classList.contains('active') && 
          !nav.contains(e.target) && 
          !toggle.contains(e.target)) {
        toggleMenu();
      }
    });
    
    // Cerrar menú con tecla ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && nav.classList.contains('active')) {
        toggleMenu();
      }
    });
    
    // Cerrar menú al cambiar de móvil a desktop
    let previousWidth = window.innerWidth;
    window.addEventListener('resize', function() {
      const currentWidth = window.innerWidth;
      
      // Si pasamos de móvil a desktop
      if (previousWidth <= 768 && currentWidth > 768) {
        if (nav.classList.contains('active')) {
          toggleMenu();
        }
      }
      
      previousWidth = currentWidth;
    });
    
    // Inicializar atributos de accesibilidad
    toggle.setAttribute('aria-label', 'Menú de navegación');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'main-navigation');
    nav.setAttribute('id', 'main-navigation');
    
  });
  
})();
