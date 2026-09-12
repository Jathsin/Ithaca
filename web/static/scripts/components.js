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

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-btn");
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

  document.body.addEventListener("htmx:afterSettle", () => {
    render_katex(document.body);
    build_table_of_contents();
  });

  window.addEventListener("pageshow", (event) => {
    render_katex(document.body);
    build_table_of_contents();
    if (event.persisted) {
      console.log("pageshow: restored from bfcache");
    }
  });

  // Accordion
  document.addEventListener("click", on_accordion_click);

  render_katex(document.body);
  build_table_of_contents();
}

// Use event delegation so the accordion keeps working across HTMX swaps
// and also when the browser restores the page from the back/forward cache.
function on_accordion_click(event) {
  const accordion = event.target.closest(".accordion");
  if (!accordion) return;

  const parent = accordion.parentElement;
  const panel = parent?.querySelector(".panel");
  const icon = accordion.querySelector("svg");

  if (!panel) return;

  const is_open = !!panel.style.maxHeight;

  if (is_open) {
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

function build_table_of_contents() {
  if (window.table_of_contents_scroll_handler) {
    window.removeEventListener(
      "scroll",
      window.table_of_contents_scroll_handler,
    );
  }
  document.querySelector(".table-of-contents")?.remove();

  const supports_table_of_contents =
    window.location.pathname.startsWith("/projects/") ||
    window.location.pathname.startsWith("/articles/");
  if (!supports_table_of_contents) {
    return;
  }

  const content = document.querySelector(".project-content");
  if (!content) {
    return;
  }

  const headings = [...content.querySelectorAll("h2, h3")];
  if (headings.length === 0) {
    return;
  }

  const table_of_contents = document.createElement("nav");
  table_of_contents.className = "table-of-contents";
  table_of_contents.setAttribute("aria-label", "Table of contents");

  const title = document.createElement("div");
  title.className = "table-of-contents-title";
  title.textContent = "Table of contents";
  table_of_contents.append(title);

  const list = document.createElement("ol");
  list.className = "table-of-contents-list";

  for (const heading of headings) {
    const item = document.createElement("li");
    item.className = `table-of-contents-item table-of-contents-${heading.tagName.toLowerCase()}`;

    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    link.dataset.heading_id = heading.id;

    item.append(link);
    list.append(item);
  }

  table_of_contents.append(list);
  content.append(table_of_contents);

  table_of_contents.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) {
      return;
    }

    const heading = document.getElementById(link.dataset.heading_id);
    if (!heading) {
      return;
    }

    event.preventDefault();
    heading.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", link.href);
    set_active_table_of_contents_link(table_of_contents, heading.id);
  });

  let scroll_frame_id = null;
  window.table_of_contents_scroll_handler = () => {
    if (scroll_frame_id !== null) {
      return;
    }

    scroll_frame_id = requestAnimationFrame(() => {
      const reached_page_end =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      let active_heading = headings[0];

      if (reached_page_end) {
        active_heading = headings.at(-1);
      } else {
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top > window.innerHeight * 0.25) {
            break;
          }
          active_heading = heading;
        }
      }

      set_active_table_of_contents_link(
        table_of_contents,
        active_heading.id,
      );
      scroll_frame_id = null;
    });
  };

  window.addEventListener("scroll", window.table_of_contents_scroll_handler, {
    passive: true,
  });
  window.table_of_contents_scroll_handler();
}

function set_active_table_of_contents_link(table_of_contents, heading_id) {
  for (const link of table_of_contents.querySelectorAll("a")) {
    const is_active = link.dataset.heading_id === heading_id;
    link.classList.toggle("is-active", is_active);

    if (is_active) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}
