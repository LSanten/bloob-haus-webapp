document.querySelectorAll(".team__wrapper").forEach((el) => {
  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add("is-visible");
        obs.disconnect();
      }
    },
    { threshold: 0.1 }
  );
  obs.observe(el);
});
