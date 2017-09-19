const allroutes = () => {
  const route = window.location.hash.slice(2);
  const sections = document.querySelectorAll('article');
  const section = Array.prototype.find.call(sections, section => {
    return section.attributes.item('route') && section.attributes.item('route').value == route;
  });

  if (section) {
    sections.forEach(s => s.style.display = 'none');
    section.style = null;
  }
};

const router = Router({
  '/': login,
  '/scan': scan,
  '/receipts': receipts
});

router.configure({
  on: allroutes
});

window.addEventListener("load", function(event) {
  router.init();
  mdc.autoInit();
  start();
});
