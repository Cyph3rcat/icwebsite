// IC MakerLab — Landing Page JS

(function () {
  // "More detail" button → smooth scroll to machine nav
  var btn = document.getElementById('btn-more-detail');
  if (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById('machines');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Login CTA → keyboard Enter/Space support
  var cta = document.getElementById('sso-placeholder');
  if (cta) {
    cta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cta.click();
      }
    });
  }

  // Machine tab switching: mark active + smooth scroll to section
  var tabs = document.querySelectorAll('.machine-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      var section = document.getElementById(tab.dataset.target);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Highlight tab while scrolling through machine sections
  var sections = document.querySelectorAll('.machine-section');
  if ('IntersectionObserver' in window && sections.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            tabs.forEach(function (t) {
              var match = t.dataset.target === id;
              t.classList.toggle('is-active', match);
              t.setAttribute('aria-selected', match ? 'true' : 'false');
            });
          }
        });
      },
      { rootMargin: '-30% 0px -55% 0px' }
    );
    sections.forEach(function (s) { observer.observe(s); });
  }
})();
