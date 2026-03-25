// PerlinCanvas
if (!window.__components_loaded__) {
  window.__components_loaded__ = true;

  const copy_icon = `
  <svg class="size-4.5" xmlns="http://www.w3.org/2000/svg" fill="var(--secondary)" viewBox="0 0 48 48" id="Copy--Streamline-Ionic-Filled">
    <desc>
        Copy Streamline Icon: https://streamlinehq.com
    </desc>
    <path d="M39.959 47.52H16.4397c-2.005 0 -3.9278 -0.7965 -5.3456 -2.2142 -1.4177 -1.4178 -2.2142 -3.3406 -2.2142 -5.3457V16.4407c0 -2.005 0.7965 -3.9277 2.2142 -5.3455 1.4178 -1.4177 3.3406 -2.2142 5.3456 -2.2142H39.959c2.0051 0 3.9279 0.7965 5.3457 2.2142 1.4177 1.4178 2.2142 3.3405 2.2142 5.3455v23.5194c0 2.0051 -0.7965 3.9279 -2.2142 5.3457 -1.4178 1.4177 -3.3406 2.2142 -5.3457 2.2142Z" stroke-width="1"></path>
    <path d="M13.9207 5.5199h24.7668c-0.5227 -1.4729 -1.4884 -2.748 -2.7644 -3.6503C34.647 0.9673 33.1232 0.4819 31.5602 0.48H8.0409c-2.005 0 -3.9279 0.7965 -5.3456 2.2142S0.4811 6.0348 0.4811 8.0398v23.5194C0.483 33.122 0.9684 34.646 1.8707 35.922c0.9023 1.276 2.1774 2.2418 3.6502 2.7643V13.9197c0 -2.2278 0.885 -4.3644 2.4602 -5.9396 1.5753 -1.5753 3.7119 -2.4602 5.9396 -2.4602Z" stroke-width="1"></path>
  </svg>
  `;

  const copied_icon = `
   <svg class="size-4.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="var(--secondary)" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
  `;

  document.addEventListener("click", async (e) => {
    const button = e.target.closest(".copy-btn");
    if (!button) return;
    const wrapper = button.closest(".code-block");
    const code = wrapper?.querySelector("pre code");
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.innerText);
      button.innerHTML = copied_icon;
      setTimeout(() => (button.innerHTML = copy_icon), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });

  window.addEventListener("resize", () => {
    if (window.location.pathname === "/") {
      window.resizing?.();
    }
  });

  document.body.addEventListener("htmx:beforeSwap", () => {
    window.stopLoop?.();
  });

  document.body.addEventListener("htmx:afterSettle", () => {
    render_katex(document.body);
    if (window.location.pathname === "/") {
      window.init_perlin?.();
    }
  });

  window.addEventListener("pageshow", () => {
    render_katex(document.body);
    if (window.location.pathname === "/") {
      window.init_perlin?.();
    }
  });

  window.addEventListener("resize", () => {
    window.resize_perlin?.(); // optional if you expose it
  });

  window.addEventListener("scroll", () => {
    window.update_scroll?.(); // optional
  });

  // Accordion
  document.addEventListener("click", onAccordionClick);

  // If the page is restored from the browser's back/forward cache (bfcache),
  // scripts don't re-run, but delegated listeners remain. This is here mainly
  // for debugging visibility.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) console.log("pageshow: restored from bfcache");
  });

  render_katex(document.body);
}

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

function render_katex(root_element) {
  if (!root_element) {
    return;
  }

  if (typeof window.renderMathInElement !== "function") {
    return;
  }

  try {
    window.renderMathInElement(root_element, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  } catch (error) {
    console.error("Failed to render KaTeX:", error);
  }
}

// Attach once
document.addEventListener("click", window.onAccordionClick);

// If the page is restored from the browser's back/forward cache (bfcache),
// scripts don't re-run, but delegated listeners remain. This is here mainly
// for debugging visibility.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) console.log("pageshow: restored from bfcache");
});
