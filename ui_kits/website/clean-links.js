/* Clean-URL link rewriting for the published site.

   The build serves each page at a clean address (/pricing/) with
   <base href="/ui_kits/website/"> so the prototype's relative script and
   asset paths keep resolving. React still renders the original relative
   hrefs ("pricing.html"), so this rewrites them to the clean addresses as
   they appear. It does nothing unless the build has set NHR_ROUTES, so the
   prototype behaves exactly as before when opened from ui_kits/. */
(function () {
  var routes = window.NHR_ROUTES;
  if (!routes) return;
  var SOURCE = /^\/ui_kits\/website\/([a-z0-9-]+\.html)?$/;

  function fix(a) {
    var href = a.getAttribute('href');
    if (!href) return;
    // With a <base> element, "#x" would resolve against the base directory.
    if (href.charAt(0) === '#') {
      a.setAttribute('href', location.pathname + location.search + href);
      return;
    }
    var url;
    try { url = new URL(href, document.baseURI); } catch (e) { return; }
    if (url.origin !== location.origin) return;
    var m = url.pathname.match(SOURCE);
    if (!m) return;
    var clean = routes[m[1] || 'index.html'];
    if (clean) a.setAttribute('href', clean + url.search + url.hash);
  }

  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.tagName === 'A') fix(node);
    var links = node.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) fix(links[i]);
  }

  new MutationObserver(function (records) {
    records.forEach(function (r) {
      if (r.type === 'attributes') { if (r.target.tagName === 'A') fix(r.target); }
      else r.addedNodes.forEach(scan);
    });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });

  scan(document.documentElement);
})();
