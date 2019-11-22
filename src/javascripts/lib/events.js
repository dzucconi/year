export const one = (el, type, cb) => {
  const callee = e => {
    e.target.removeEventListener(e.type, callee);
    return cb(e);
  };

  el.addEventListener(type, callee);
};

export const on = (el, type, cb) => {
  el.addEventListener(type, cb);
};

export const off = (el, type, callee) => {
  el.removeEventListener(type, callee);
};
