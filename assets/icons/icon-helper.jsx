/* Lucide → React wrapper with NHR Solution defaults. */
function Icon({ name, size = 24, strokeWidth = 1.75, style, className }) {
  const lib = (typeof lucide !== 'undefined' && lucide) || {};
  const node = lib[name] || (lib.icons && lib.icons[name]) || [];
  const children = Array.isArray(node) ? node : [];
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flex: '0 0 auto', ...style }} aria-hidden="true"
    >
      {children.map((c, i) => React.createElement(c[0], { key: i, ...c[1] }))}
    </svg>
  );
}
window.Icon = Icon;
