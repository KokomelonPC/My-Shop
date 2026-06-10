(function () {
  if (document.querySelector(".floating-contact-stack")) return;

  const style = document.createElement("style");
  style.textContent = `
    .kopc-contact-stack {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 9999;
      display: grid;
      gap: 10px;
    }
    .kopc-contact-button {
      display: grid;
      place-items: center;
      width: 50px;
      height: 50px;
      border: 0;
      border-radius: 50%;
      color: #fff;
      text-decoration: none;
      font: 800 20px/1 "Segoe UI", Tahoma, sans-serif;
      box-shadow: 0 12px 26px rgba(15, 23, 42, .2);
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .kopc-contact-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 30px rgba(15, 23, 42, .28);
    }
    .kopc-contact-button.facebook { background: #1877f2; }
    .kopc-contact-button.line { background: #06c755; }
    .kopc-contact-button.chat { background: #3b4ff8; font-size: 18px; }
    @media (max-width: 700px) {
      .kopc-contact-stack { right: 14px; bottom: 14px; gap: 8px; }
      .kopc-contact-button { width: 46px; height: 46px; }
    }
  `;
  document.head.appendChild(style);

  const stack = document.createElement("div");
  stack.className = "kopc-contact-stack";
  stack.setAttribute("aria-label", "ช่องทางติดต่อ KOPC Service");
  stack.innerHTML = `
    <a class="kopc-contact-button facebook"
       href="https://www.facebook.com/profile.php?id=100077422965133"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Facebook Fanpage"
       title="Facebook Fanpage">f</a>
    <a class="kopc-contact-button line"
       href="https://page.line.me/389bbnzc"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="LINE"
       title="LINE">L</a>
    <a class="kopc-contact-button chat"
       href="index.html?openChat=1"
       aria-label="แชทหน้าเว็บ"
       title="แชทหน้าเว็บ">💬</a>
  `;
  document.body.appendChild(stack);
})();
