export const readingDuration = (text: string): number => {
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
  return words * 600;
};

export const startSubtitles = (
  output: HTMLElement,
  questions: readonly string[],
  signal: AbortSignal,
): void => {
  let index = 0;
  let timer: number | undefined;

  const showNext = (): void => {
    if (signal.aborted) return;
    const question = questions[index];
    if (question === undefined) {
      output.textContent = "";
      return;
    }
    output.textContent = question;
    index += 1;
    timer = window.setTimeout(showNext, readingDuration(question));
  };

  signal.addEventListener(
    "abort",
    () => {
      if (timer !== undefined) window.clearTimeout(timer);
      output.textContent = "";
    },
    { once: true },
  );
  showNext();
};
