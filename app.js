window.appLoaded = true;

const invitation = {
  groomName: "Zeyad",
  brideName: "Aya",
  groomNameAr: "زياد",
  brideNameAr: "آية",
  weddingDate: "2026-10-16T20:00:00+03:00",
  venue: "Royal Hall I — Royal Complex, El Dekheila",
  venueAr: "القاعة الملكية ١ — المجمع الملكي في الدخيلة، الإسكندرية",
  mapUrl: "https://maps.app.goo.gl/oWRpGfmfggLGXsb99"
};

const byId = id => document.getElementById(id);
const eventDate = new Date(invitation.weddingDate);
let language = document.documentElement.lang || "ar";

function safeSetText(id, text) {
  const el = byId(id);
  if (el) el.textContent = text;
}

function updateNames() {
  const isAr = language === "ar";
  const g = isAr ? invitation.groomNameAr : invitation.groomName;
  const b = isAr ? invitation.brideNameAr : invitation.brideName;
  const sep = isAr ? " و " : " & ";

  safeSetText("groomName", g);
  safeSetText("brideName", b);
  safeSetText("nameSeparator", isAr ? "و" : "&");
  safeSetText("openingNames", `${g}${sep}${b}`);
  safeSetText("footerNames", `${g}${sep}${b}`);

  document.title = isAr ? `${g} و${b} — حفل زفاف` : `${g} & ${b} — Wedding Celebration`;
}

const guest = new URLSearchParams(location.search).get("guest");
function updateGuest() {
  const el = byId("guestLine");
  if (!el) return;
  if (!guest) {
    el.textContent = "";
    return;
  }
  el.textContent = language === "ar" ? `دعوة خاصة إلى ${guest} ♡` : `A special invitation for ${guest} ♡`;
}

function updateLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.body.dir = document.documentElement.dir;

  const langBtn = byId("langBtn");
  if (langBtn) langBtn.textContent = language === "en" ? "ع" : "EN";

  document.querySelectorAll("[data-en]").forEach(el => {
    if (el.dataset[language]) {
      el.textContent = el.dataset[language];
    }
  });
  document.querySelectorAll("[data-placeholder-en]").forEach(el => {
    if (el.dataset[`placeholder${language === "ar" ? "Ar" : "En"}`]) {
      el.placeholder = el.dataset[`placeholder${language === "ar" ? "Ar" : "En"}`];
    }
  });

  const locale = language === "ar" ? "ar-EG" : "en-US";
  safeSetText("monthText", eventDate.toLocaleDateString(locale, { month: "long" }));
  safeSetText("weekdayText", eventDate.toLocaleDateString(locale, { weekday: "long" }));
  safeSetText("heroVenue", language === "ar" ? "٨:٠٠ مساءً · القاعة الملكية ١، الدخيلة" : "8:00 PM · Royal Hall I, El Dekheila");

  updateNames();
  updateGuest();
}

const langBtn = byId("langBtn");
if (langBtn) {
  langBtn.addEventListener("click", () => {
    language = language === "en" ? "ar" : "en";
    updateLanguage();
    if (byId("wishList")) loadWishes();
  });
}

// Initial setup
updateLanguage();

// Scroll reveal observer
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// Countdown timer
function updateCountdown() {
  const diff = Math.max(0, eventDate - new Date());
  const values = {
    days: Math.floor(diff / 864e5),
    hours: Math.floor(diff / 36e5) % 24,
    minutes: Math.floor(diff / 6e4) % 60,
    seconds: Math.floor(diff / 1e3) % 60
  };
  Object.entries(values).forEach(([id, val]) => safeSetText(id, String(val).padStart(2, "0")));
}
updateCountdown();
setInterval(updateCountdown, 1000);

// Add to calendar
const stamp = date => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const calendarBtn = byId("calendarBtn");
if (calendarBtn) {
  calendarBtn.addEventListener("click", () => {
    const end = new Date(+eventDate + 144e5);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${stamp(eventDate)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:Wedding of ${invitation.groomName} & ${invitation.brideName}`,
      `LOCATION:${invitation.venue}`,
      `DESCRIPTION:${invitation.mapUrl}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    link.download = "zeyad-aya-wedding.ics";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function showStatus(text) {
  const el = byId("status");
  if (!el) return;
  el.textContent = text;
  setTimeout(() => { el.textContent = ""; }, 2600);
}

async function shareInvitation() {
  try {
    if (navigator.share) {
      await navigator.share({
        title: document.title,
        text: language === "ar" ? `دعوة زفاف — ${invitation.groomNameAr} & ${invitation.brideNameAr}` : `Wedding invitation — ${invitation.groomName} & ${invitation.brideName}`,
        url: location.href
      });
    } else {
      await navigator.clipboard.writeText(location.href);
      showStatus(language === "ar" ? "تم نسخ الرابط ✓" : "Link copied ✓");
    }
  } catch (err) {}
}

const shareBtn = byId("shareBtn");
const shareTop = byId("shareTop");
const copyBtn = byId("copyBtn");
if (shareBtn) shareBtn.addEventListener("click", shareInvitation);
if (shareTop) shareTop.addEventListener("click", shareInvitation);
if (copyBtn) copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showStatus(language === "ar" ? "تم نسخ الرابط ✓" : "Link copied ✓");
  } catch (err) {}
});

// Saved guest wishes
const wishForm = byId("wishForm");
const wishBtn = byId("wishBtn");
const wishPreview = byId("wishPreview");
const wishList = byId("wishList");

function wishDate(value) {
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
      day: "numeric", month: "short", year: "numeric"
    }).format(new Date(value));
  } catch (_) {
    return "";
  }
}

function renderWishes(wishes = []) {
  if (!wishList) return;
  wishList.replaceChildren();
  if (!wishes.length) {
    const empty = document.createElement("p");
    empty.className = "wish-empty";
    empty.textContent = language === "ar" ? "كونوا أول من يترك تهنئة جميلة للعروسين." : "Be the first to leave the couple a lovely wish.";
    wishList.append(empty);
    return;
  }
  wishes.forEach(wish => {
    const article = document.createElement("blockquote");
    article.className = "wish-item";
    const message = document.createElement("p");
    message.textContent = wish.message;
    const meta = document.createElement("footer");
    const name = document.createElement("strong");
    name.textContent = wish.name;
    const date = document.createElement("time");
    date.dateTime = wish.createdAt;
    date.textContent = wishDate(wish.createdAt);
    meta.append(name, date);
    article.append(message, meta);
    wishList.append(article);
  });
}

async function loadWishes() {
  if (!wishList) return;
  try {
    const response = await fetch("/api/wishes", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("unavailable");
    const data = await response.json();
    renderWishes(data.wishes);
  } catch (_) {
    wishList.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "wish-empty";
    empty.textContent = language === "ar" ? "تعذّر تحميل التهاني الآن. حاولوا مرة أخرى بعد قليل." : "Wishes are unavailable right now. Please try again shortly.";
    wishList.append(empty);
  }
}

if (wishForm && wishBtn) {
  wishForm.addEventListener("submit", async event => {
    event.preventDefault();
    const name = byId("guestName").value.trim();
    const message = byId("guestWish").value.trim();
    const company = byId("company").value;
    if (!name || !message) return;

    wishBtn.disabled = true;
    wishBtn.textContent = language === "ar" ? "جارٍ حفظ تهنئتكم…" : "Saving your wish…";
    wishPreview.className = "wish-preview";
    try {
      const response = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, message, company })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "save_failed");
      wishPreview.textContent = language === "ar" ? "وصلت تهنئتكم الجميلة، شكرًا لمشاركتنا الفرحة ♡" : "Your lovely wish has been saved. Thank you for celebrating with us ♡";
      wishPreview.className = "wish-preview show";
      wishForm.reset();
      await loadWishes();
    } catch (error) {
      wishPreview.textContent = error.message === "rate_limited"
        ? (language === "ar" ? "تم إرسال تهنئة منذ لحظات. حاولوا مرة أخرى بعد قليل." : "A wish was just sent. Please wait a moment and try again.")
        : (language === "ar" ? "لم نتمكن من حفظ التهنئة الآن. ستظل رسالتكم هنا لتعيدوا المحاولة." : "We could not save your wish yet. Your message is still here so you can retry.");
      wishPreview.className = "wish-preview error";
    } finally {
      wishBtn.disabled = false;
      wishBtn.textContent = wishBtn.dataset[language] || (language === "ar" ? "أرسل تهنئتي للعروسين" : "Save my wish");
    }
  });
  loadWishes();
}

/* ==============================================================
   PETALS, GOLDEN DUST & FIREWORKS CANVAS ENGINE
   ============================================================== */
const canvas = byId("fireworks");
const context = canvas.getContext("2d");
let particles = [];
let running = false;

const goldPalettes = [
  ["#fceabb", "#d4a24c", "#fff"],
  ["#dfc491", "#b38a4a", "#fef8ea"],
  ["#ffd787", "#e0b45c", "#eed3a5"]
];

function sizeCanvas() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function burst(x, y) {
  const palette = goldPalettes[Math.floor(Math.random() * goldPalettes.length)];
  const spin = Math.random() * Math.PI * 2;

  // 1. Fireworks sparks
  for (let i = 0; i < 54; i++) {
    const angle = spin + i * (Math.PI / 27);
    const speed = i % 2 ? 3 : 5.5;
    particles.push({
      type: "spark",
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.965,
      friction: 0.97,
      gravity: 0.05,
      radius: Math.random() * 2 + 1.2,
      color: palette[i % palette.length]
    });
  }

  // 2. Center bright flash
  particles.push({
    type: "spark",
    x, y,
    vx: 0, vy: 0,
    life: 1,
    decay: 0.8,
    friction: 1,
    gravity: 0,
    radius: 12,
    color: "#fff7df"
  });

  // 3. Romantic falling petals
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.5 + 1;
    particles.push({
      type: "petal",
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      life: 1,
      decay: 0.988,
      friction: 0.985,
      gravity: 0.045,
      width: Math.random() * 5 + 6,
      height: Math.random() * 3 + 4,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 6,
      oscillation: Math.random() * 10,
      color: Math.random() > 0.45 ? "#faf2e6" : "#f5e4dd"
    });
  }

  if (particles.length > 1500) {
    particles.splice(0, particles.length - 1500);
  }

  if (!running) {
    running = true;
    requestAnimationFrame(renderParticles);
  }
}

function renderParticles() {
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "rgba(0, 0, 0, 0.22)";
  context.fillRect(0, 0, innerWidth, innerHeight);
  context.globalCompositeOperation = "source-over";

  particles = particles.filter(p => p.life > 0.03);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.life *= p.decay;

    if (p.type === "petal") {
      p.rotation += p.rotSpeed;
      p.oscillation += 0.05;
      p.vx += Math.sin(p.oscillation) * 0.06;

      context.save();
      context.translate(p.x, p.y);
      context.rotate((p.rotation * Math.PI) / 180);
      context.globalAlpha = Math.min(1, p.life * 1.2);
      context.fillStyle = p.color;
      context.shadowColor = "rgba(215, 188, 136, 0.35)";
      context.shadowBlur = 4;

      context.beginPath();
      context.ellipse(0, 0, p.width * Math.max(0.3, p.life), p.height, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      // Sparks & Gold Dust
      context.globalAlpha = p.twinkle ? p.life * (0.35 + Math.random() * 0.65) : p.life;
      context.shadowColor = p.color;
      context.shadowBlur = p.radius > 4 ? 20 : 6;
      context.fillStyle = p.color;

      context.beginPath();
      context.arc(p.x, p.y, Math.max(0.4, p.radius * p.life), 0, Math.PI * 2);
      context.fill();
    }
  }

  context.globalAlpha = 1;
  context.shadowBlur = 0;

  if (particles.length > 0) {
    requestAnimationFrame(renderParticles);
  } else {
    running = false;
    context.clearRect(0, 0, innerWidth, innerHeight);
  }
}

// Golden Dust following finger / cursor
let lastPointerX = 0;
let lastPointerY = 0;
addEventListener("pointermove", e => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const dx = e.clientX - lastPointerX;
  const dy = e.clientY - lastPointerY;
  if (dx * dx + dy * dy > 120) {
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    particles.push({
      type: "spark",
      x: e.clientX,
      y: e.clientY,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2 - 0.2,
      life: 1,
      decay: 0.94,
      friction: 0.96,
      gravity: -0.015,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? "#fce8c3" : "#d7bc88",
      twinkle: true
    });
    if (!running) {
      running = true;
      requestAnimationFrame(renderParticles);
    }
  }
}, { passive: true });

// Tap anywhere for sparkle burst
addEventListener("pointerdown", e => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // If clicking inside form fields or buttons, don't obstruct UX
  if (e.target.closest("input, textarea, a, button")) return;
  burst(e.clientX, e.clientY);
}, { passive: true });

/* ==============================================================
   MUSIC & ENVELOPE CONTROLS
   ============================================================== */
const music = byId("bgMusic");
const musicBtn = byId("musicBtn");
const TARGET_VOLUME = 0.75;
let userMuted = false;
let fadeTimer;

function musicUI() {
  if (!musicBtn || !music) return;
  const on = !music.paused;
  musicBtn.classList.toggle("off", !on);
  musicBtn.setAttribute("aria-pressed", on);
}

function playMusic() {
  if (!music || userMuted || !music.paused) return;
  music.volume = 0;
  music.play().then(() => {
    clearInterval(fadeTimer);
    fadeTimer = setInterval(() => {
      music.volume = Math.min(TARGET_VOLUME, music.volume + 0.05);
      if (music.volume >= TARGET_VOLUME) clearInterval(fadeTimer);
    }, 100);
    musicUI();
  }).catch(() => {});
}

if (musicBtn && music) {
  musicBtn.addEventListener("click", () => {
    if (music.paused) {
      userMuted = false;
      music.volume = TARGET_VOLUME;
      music.play().then(musicUI).catch(() => {});
    } else {
      userMuted = true;
      music.pause();
      musicUI();
    }
  });

  music.addEventListener("error", () => {
    musicBtn.style.display = "none";
  });
  music.addEventListener("pause", musicUI);
  music.addEventListener("play", musicUI);
}

/* ==============================================================
   OPENING INVITATION LOGIC
   ============================================================== */
let isOpened = false;

function openInvitation() {
  if (isOpened) return;
  isOpened = true;

  playMusic();
  document.body.classList.remove("locked");

  const openingEl = byId("opening");
  if (openingEl) {
    openingEl.classList.add("hide");
  }

  // Celebratory Fireworks and Petals!
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTimeout(() => burst(innerWidth * 0.25, innerHeight * 0.35), 150);
    setTimeout(() => burst(innerWidth * 0.75, innerHeight * 0.3), 500);
    setTimeout(() => burst(innerWidth * 0.5, innerHeight * 0.45), 900);
  }
}

// Envelope click trigger
const envelopeBox = byId("envelopeBtn");
if (envelopeBox) {
  const triggerOpening = function(e) {
    if (envelopeBox.classList.contains("opened")) return;
    
    // Position burst on the wax seal
    const rect = envelopeBox.getBoundingClientRect();
    const sealX = rect.left + rect.width / 2;
    const sealY = rect.top + rect.height * 0.55;
    burst(sealX, sealY);

    // 1. Envelope opens
    envelopeBox.classList.add("opened");

    // 2. Play music immediately on user gesture
    playMusic();

    // 3. Transition to main invite
    setTimeout(openInvitation, 1050);
  };

  envelopeBox.addEventListener("click", triggerOpening);
  envelopeBox.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerOpening(e);
    }
  });
}

sizeCanvas();
addEventListener("resize", sizeCanvas);
