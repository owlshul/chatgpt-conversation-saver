(() => {
  // ---------- utils ----------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const once = (sel) => document.querySelector(sel);

  const sanitizeFilename = (s) =>
    (s || "")
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "ChatGPT Conversation";

  const getChatTitle = () => {
    // Reliable across chatgpt.com: "<title>My Chat - ChatGPT</title>"
    const raw = document.title || "ChatGPT Conversation";
    const title = raw.replace(/\s*-\s*ChatGPT.*$/i, "").trim();
    // Fallback to URL id (/c/<uuid>) if needed
    if (!title || /^ChatGPT$/i.test(title)) {
      const m = location.pathname.match(/\/c\/([^/?#]+)/);
      if (m) return sanitizeFilename(m[1]);
    }
    return sanitizeFilename(title);
  };

  // Scroll to force lazy-load of all messages
  async function loadAllMessages() {
    const scroller =
      document.querySelector("main") ||
      document.scrollingElement ||
      document.body;

    if (!scroller) return;

    // Scroll up until height stabilizes
    let lastH = 0, stable = 0;
    for (let i = 0; i < 24 && stable < 3; i++) {
      scroller.scrollTo({ top: 0, behavior: "instant" });
      await sleep(320);
      const h = scroller.scrollHeight;
      if (h === lastH) stable++; else { stable = 0; lastH = h; }
    }
    // Then ensure bottom is fully rendered
    lastH = 0; stable = 0;
    for (let i = 0; i < 12 && stable < 2; i++) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "instant" });
      await sleep(240);
      const h = scroller.scrollHeight;
      if (h === lastH) stable++; else { stable = 0; lastH = h; }
    }
  }

  function extractMessageText(container) {
    // Prefer markdown-like containers to preserve line breaks
    const preferred = container.querySelector(
      '.markdown, [data-testid="markdown"], .prose, .whitespace-pre-wrap, pre, code'
    );
    const text = (preferred?.innerText || container.innerText || "").trim();
    return text;
  }

  function extractConversation() {
    // Be liberal with selectors: chatgpt.com currently has data-message-id and data-message-author-role
    const nodes = Array.from(
      document.querySelectorAll(
        'div[data-message-id], div[data-message-author-role], [data-testid="conversation-turn"], article[data-message-author-role]'
      )
    );
    if (!nodes.length) return "";

    const parts = [];
    for (const node of nodes) {
      // find role from node or descendants
      const role =
        (node.getAttribute("data-message-author-role") ||
          node.querySelector("[data-message-author-role]")?.getAttribute("data-message-author-role") ||
          "").toLowerCase();

      const who =
        role === "user"
          ? "USER"
          : role === "assistant"
          ? "ASSISTANT"
          : "UNKNOWN";

      const text = extractMessageText(node);
      if (!text) continue;

      parts.push(`----- ${who} -----\n${text}\n`);
    }
    return parts.join("\n");
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".txt") ? filename : filename + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openPrintPDF(filename, text) {
  // Escape minimal HTML entities
  const escape = (s) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const safeTitle = filename.endsWith(".pdf") ? filename : filename + ".pdf";

  // Minimal HTML (no inline JS so it won't be blocked by CSP)
  const html = `<!doctype html>
<meta charset="utf-8">
<title>${escape(safeTitle)}</title>
<style>
  body { font: 12pt/1.5 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
  h1 { font-size: 16pt; margin: 0 0 12px; }
</style>
<h1>${escape(safeTitle)}</h1>
<pre>${escape(text)}</pre>`;

  // Create a blob URL so the new page doesn't inherit ChatGPT's CSP
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  // Open the blob in a new tab/window
  const w = window.open(url, "_blank");
  if (!w) {
    alert("Pop-up blocked. Allow pop-ups on chatgpt.com and try again.");
    URL.revokeObjectURL(url);
    return;
  }

  // After it loads, trigger browser's print → Save as PDF
  const tryPrint = () => {
    try {
      if (w.document && w.document.readyState === "complete") {
        w.focus();
        w.print();
      } else {
        setTimeout(tryPrint, 200);
      }
    } catch (e) {
      // If the window isn't ready yet, retry shortly
      setTimeout(tryPrint, 200);
    }
  };
  w.addEventListener("load", () => setTimeout(tryPrint, 100));
  // Revoke the blob URL later to free memory
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}


  // ---------- UI injection ----------
  function injectButton() {
    if (once("#cgpt-save-btn")) return;

    const btn = document.createElement("button");
    btn.id = "cgpt-save-btn";
    btn.title = "Save Conversation";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zM7 5h7v4H7V5zm5 14H7v-6h5v6z"/>
      </svg>
      <span>Save</span>
    `;
    document.body.appendChild(btn);

    // Modal
    const backdrop = document.createElement("div");
    backdrop.id = "cgpt-save-modal-backdrop";
    const modal = document.createElement("div");
    modal.id = "cgpt-save-modal";
    modal.innerHTML = `
      <div id="cgpt-save-card">
        <h3>Save Conversation</h3>
        <div class="row">
          <label>File name</label>
          <input type="text" id="cgpt-file-name" />
        </div>
        <div class="row">
          <label>Format</label>
          <div class="format">
            <label><input type="radio" name="cgpt-format" value="txt" checked> TXT</label>
            <label><input type="radio" name="cgpt-format" value="pdf"> PDF</label>
          </div>
          <div class="note">PDF uses your browser's “Save as PDF” dialog.</div>
        </div>
        <div class="buttons">
          <button id="cgpt-cancel">Cancel</button>
          <button id="cgpt-save" class="primary">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const openModal = () => {
      const input = modal.querySelector("#cgpt-file-name");
      input.value = getChatTitle();
      backdrop.style.display = "block";
      modal.style.display = "grid";
      setTimeout(() => input.focus(), 0);
    };
    const closeModal = () => {
      backdrop.style.display = "none";
      modal.style.display = "none";
    };

    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        btn.style.opacity = "0.6";
        await loadAllMessages();
        openModal();
      } finally {
        btn.disabled = false;
        btn.style.opacity = "";
      }
    });

    modal.querySelector("#cgpt-cancel").addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    modal.querySelector("#cgpt-save").addEventListener("click", async () => {
      const filename = sanitizeFilename(
        modal.querySelector("#cgpt-file-name").value || getChatTitle()
      );
      const fmt = modal.querySelector('input[name="cgpt-format"]:checked').value;

      const text = extractConversation();
      if (!text.trim()) {
        alert("Could not capture conversation. Try scrolling the chat so messages render, then save again.");
        return;
      }

      if (fmt === "txt") {
        downloadText(filename + ".txt", text);
      } else {
        openPrintPDF(filename + ".pdf", text);
      }
      closeModal();
    });
  }

  // Observe SPA updates; reinject if DOM re-renders
  const observer = new MutationObserver(() => injectButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Initial
  injectButton();
})();
