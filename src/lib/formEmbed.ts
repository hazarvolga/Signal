function escapeHtmlAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function buildFormEmbedCode(input: { id: string; name: string; origin: string }): string {
  const origin = new URL(input.origin).origin;
  const publicUrl = `${origin}/f/${encodeURIComponent(input.id)}`;
  const title = escapeHtmlAttribute(input.name.trim() || "Embedded form");

  return `<iframe src="${publicUrl}" title="${title}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-forms allow-scripts allow-same-origin" style="width:100%;min-height:540px;border:0;"></iframe>`;
}

export function buildExitIntentPopupEmbedCode(input: {
  id: string;
  name: string;
  origin: string;
  daysDismissed?: number;
}): string {
  const origin = new URL(input.origin).origin;
  const publicUrl = `${origin}/f/${encodeURIComponent(input.id)}`;
  const title = escapeHtmlAttribute(input.name.trim() || "Signal Pop-up");
  const days = input.daysDismissed ?? 7;
  const storageKey = `signal_popup_${input.id}`;

  return `<!-- Signal Smart Exit-Intent Pop-up (${days}-Day Frequency Capped) -->
<script>
(function() {
  var key = "${storageKey}";
  var expiry = localStorage.getItem(key);
  if (expiry && Date.now() < Number(expiry)) return;

  var shown = false;
  function triggerPopup() {
    if (shown) return;
    shown = true;

    var overlay = document.createElement("div");
    overlay.id = "signal-popup-modal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px);";

    var box = document.createElement("div");
    box.style.cssText = "position:relative;width:100%;max-width:440px;background:#ffffff;border-radius:8px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);overflow:hidden;";

    var close = document.createElement("button");
    close.innerHTML = "&times;";
    close.setAttribute("aria-label", "Close");
    close.style.cssText = "position:absolute;top:10px;right:14px;background:none;border:none;font-size:24px;cursor:pointer;color:#555;z-index:10;line-height:1;";

    function dismiss() {
      // Frequency capping rule: do not re-trigger for specified days
      localStorage.setItem(key, (Date.now() + (${days} * 24 * 60 * 60 * 1000)).toString());
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    close.onclick = dismiss;
    overlay.onclick = function(e) { if (e.target === overlay) dismiss(); };

    var frame = document.createElement("iframe");
    frame.src = "${publicUrl}";
    frame.title = "${title}";
    frame.style.cssText = "width:100%;height:520px;border:none;display:block;";
    frame.sandbox = "allow-forms allow-scripts allow-same-origin";

    box.appendChild(close);
    box.appendChild(frame);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  document.addEventListener("mouseleave", function(e) {
    if (e.clientY <= 0) triggerPopup();
  });
})();
</script>`;
}

export function buildTimedPopupEmbedCode(input: {
  id: string;
  name: string;
  origin: string;
  delaySeconds?: number;
  daysDismissed?: number;
}): string {
  const origin = new URL(input.origin).origin;
  const publicUrl = `${origin}/f/${encodeURIComponent(input.id)}`;
  const title = escapeHtmlAttribute(input.name.trim() || "Signal Pop-up");
  const delaySec = input.delaySeconds ?? 5;
  const days = input.daysDismissed ?? 7;
  const storageKey = `signal_popup_${input.id}`;

  return `<!-- Signal Timed & Scroll Pop-up (${delaySec}s / 50% Scroll) -->
<script>
(function() {
  var key = "${storageKey}";
  var expiry = localStorage.getItem(key);
  if (expiry && Date.now() < Number(expiry)) return;

  var shown = false;
  function triggerPopup() {
    if (shown) return;
    shown = true;

    var overlay = document.createElement("div");
    overlay.id = "signal-popup-modal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px);";

    var box = document.createElement("div");
    box.style.cssText = "position:relative;width:100%;max-width:440px;background:#ffffff;border-radius:8px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);overflow:hidden;";

    var close = document.createElement("button");
    close.innerHTML = "&times;";
    close.setAttribute("aria-label", "Close");
    close.style.cssText = "position:absolute;top:10px;right:14px;background:none;border:none;font-size:24px;cursor:pointer;color:#555;z-index:10;line-height:1;";

    function dismiss() {
      // Frequency capping rule: do not re-trigger for specified days
      localStorage.setItem(key, (Date.now() + (${days} * 24 * 60 * 60 * 1000)).toString());
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    close.onclick = dismiss;
    overlay.onclick = function(e) { if (e.target === overlay) dismiss(); };

    var frame = document.createElement("iframe");
    frame.src = "${publicUrl}";
    frame.title = "${title}";
    frame.style.cssText = "width:100%;height:520px;border:none;display:block;";
    frame.sandbox = "allow-forms allow-scripts allow-same-origin";

    box.appendChild(close);
    box.appendChild(frame);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // 1. Timer (${delaySec} seconds after load)
  setTimeout(triggerPopup, ${delaySec * 1000});

  // 2. Trigger on 50% scroll depth
  window.addEventListener("scroll", function() {
    var h = document.documentElement, b = document.body;
    var st = "scrollTop", sh = "scrollHeight";
    var percent = (h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight) * 100;
    if (percent > 50) triggerPopup();
  });
})();
</script>`;
}
