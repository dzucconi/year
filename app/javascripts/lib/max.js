const title = x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();

export default (els, prop) =>
  Math.max.apply(
    null,
    Array.prototype.map.call(els, el => el[`offset${title(prop)}`])
  );
