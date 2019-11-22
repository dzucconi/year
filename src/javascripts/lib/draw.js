let frame = 0;

export default (fps, tick) => {
  const interval = 1000 / fps;

  let now;
  let then = Date.now();
  let delta;

  function draw() {
    const cb = () => draw(tick);
    requestAnimationFrame(cb);

    now = Date.now();
    delta = now - then;

    if (delta > interval) {
      then = now - (delta % interval);
      tick(frame++);
    }
  }

  return draw;
};
