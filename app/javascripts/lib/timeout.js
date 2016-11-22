export default (fn, interval) => {
  let now, delta;

  const then = Date.now();

  const check = () => {
    now = Date.now();
    delta = now - then;

    if (delta >= interval) return fn();

    return requestAnimationFrame(check);
  };

  return check();
};
