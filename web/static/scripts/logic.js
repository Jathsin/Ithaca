
// Use event delegation so the accordion keeps working across HTMX swaps
// and also when the browser restores the page from the back/forward cache.
function onAccordionClick(e) {
  const accordion = e.target.closest(".accordion");
  if (!accordion) return;

  const parent = accordion.parentElement;
  const panel = parent?.querySelector(".panel");
  const icon = accordion.querySelector("svg");

  if (!panel) return;

  const isOpen = !!panel.style.maxHeight;

  if (isOpen) {
    panel.style.maxHeight = "";
    if (icon) icon.style.transform = "rotate(0deg)";
  } else {
    // Ensure we measure the current content height each time
    panel.style.maxHeight = panel.scrollHeight + "px";
    if (icon) icon.style.transform = "rotate(90deg)";
  }
}

// Attach once
document.addEventListener("click", onAccordionClick);

// If the page is restored from the browser's back/forward cache (bfcache),
// scripts don't re-run, but delegated listeners remain. This is here mainly
// for debugging visibility.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) console.log("pageshow: restored from bfcache");
});
