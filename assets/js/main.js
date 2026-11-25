"use strict";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const desktop = matchMedia("(min-width: 73rem)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const wholeNumber = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const rubles = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const header = document.querySelector(".site-header");
const menu = document.querySelector(".mobile-menu");
const menuButton = document.querySelector(".menu-open");

function updateHeader() {
  header.classList.toggle("is-scrolled", scrollY > 46);
}

updateHeader();
addEventListener("scroll", updateHeader, { passive: true });
menuButton.addEventListener("click", () => {
  menu.showModal();
  menuButton.setAttribute("aria-expanded", "true");
});
menu.querySelector("[data-menu-close]").addEventListener("click", () => menu.close());
menu.addEventListener("close", () => menuButton.setAttribute("aria-expanded", "false"));
desktop.addEventListener("change", () => {
  if (desktop.matches && menu.open) {
    menu.close();
    header.querySelector(".desktop-nav a").focus();
  }
});
menu.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const section = document.querySelector(link.hash);
    menu.close();
    if (location.hash !== link.hash) history.pushState(null, "", link.hash);
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
    section.scrollIntoView();
  });
});
menuButton.hidden = false;

function animateNumber(element, initial, format, duration) {
  let frame;
  let current = initial;
  let destination = initial;

  function draw(value) {
    current = value;
    element.textContent = format(value);
  }

  reduceMotion.addEventListener("change", () => {
    if (!reduceMotion.matches) return;
    cancelAnimationFrame(frame);
    draw(destination);
  });

  return (target, from = current) => {
    cancelAnimationFrame(frame);
    destination = target;
    if (reduceMotion.matches || from === target) {
      draw(target);
      return;
    }

    const startTime = performance.now();
    draw(from);
    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      draw(progress === 1 ? target : from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  };
}

if ("IntersectionObserver" in window && !reduceMotion.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add("reveal-ready");
      target.classList.remove("reveal-pending");
      revealObserver.unobserve(target);
    });
  }, { rootMargin: "0px 0px -18px 0px" });

  const step = getComputedStyle(document.documentElement).getPropertyValue("--stagger").trim();
  document.querySelectorAll("[data-stagger]").forEach((row) => {
    Array.from(row.children).forEach((card, index) => {
      card.style.transitionDelay = "calc(" + (index % 4) + " * " + step + ")";
    });
  });
  document.querySelectorAll("[data-reveal]").forEach((element) => {
    if (element.getBoundingClientRect().top < innerHeight) return;
    element.classList.add("reveal-pending");
    revealObserver.observe(element);
  });

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      const total = Number(target.dataset.counter);
      animateNumber(target, total, wholeNumber.format, 900)(total, 0);
      counterObserver.unobserve(target);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll("[data-counter]").forEach((counter) => counterObserver.observe(counter));
}

const showcase = document.querySelector(".hero-showcase");
const slides = Array.from(showcase.querySelectorAll("[data-slide]"));
const dots = Array.from(showcase.querySelectorAll(".slide-dots button"));
const heroPause = showcase.querySelector(".hero-pause");
let activeSlide = 0;
let carouselTimer;
let heroInView = true;

function showSlide(index) {
  activeSlide = index;
  slides.forEach((slide, position) => {
    const active = index === position;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    dots[position].setAttribute("aria-pressed", String(active));
  });
}

function scheduleSlides() {
  clearInterval(carouselTimer);
  if (reduceMotion.matches || !heroInView || document.hidden ||
      showcase.classList.contains("is-paused") || showcase.matches(":focus-within") ||
      (finePointer.matches && showcase.matches(":hover"))) return;
  carouselTimer = setInterval(() => showSlide((activeSlide + 1) % slides.length), 3000);
}

function setupMotionToggle(button, region, motionLabel, update = () => {}) {
  function updateAvailability() {
    button.hidden = reduceMotion.matches;
    region.classList.toggle("has-motion", !reduceMotion.matches);
    update();
  }

  button.addEventListener("click", () => {
    const paused = region.classList.toggle("is-paused");
    button.classList.toggle("is-paused", paused);
    button.setAttribute("aria-label", (paused ? "Возобновить " : "Приостановить ") + motionLabel);
    update();
  });
  reduceMotion.addEventListener("change", updateAvailability);
  updateAvailability();
}

dots.forEach((dot, index) => dot.addEventListener("click", () => {
  showSlide(index);
  scheduleSlides();
}));
showcase.querySelector(".slide-dots").hidden = false;
showcase.addEventListener("pointerenter", scheduleSlides);
showcase.addEventListener("pointerleave", scheduleSlides);
showcase.addEventListener("focusin", scheduleSlides);
showcase.addEventListener("focusout", () => queueMicrotask(scheduleSlides));
document.addEventListener("visibilitychange", scheduleSlides);

setupMotionToggle(heroPause, showcase, "анимацию первого экрана", scheduleSlides);
setupMotionToggle(document.querySelector(".brand-pause"), document.querySelector(".brands"), "бегущую строку");

if ("IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting;
    showcase.classList.toggle("is-offscreen", !heroInView);
    scheduleSlides();
  }).observe(showcase);
}

document.querySelectorAll(".tile").forEach((tile) => {
  const spotlight = document.createElement("span");
  spotlight.className = "tile-spotlight";
  spotlight.setAttribute("aria-hidden", "true");
  tile.prepend(spotlight);
  tile.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || reduceMotion.matches) return;
    const rect = tile.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    spotlight.style.transform = "translate(" + x + "px, " + y + "px) translate(-50%, -50%)";
  }, { passive: true });
});

// Таблица нужна только для демонстрации калькулятора.
const tradeValues = {
  iphone: { recent: 97000, previous: 50000, older: 16000 },
  samsung: { recent: 62000, previous: 33000, older: 10000 },
  tablet: { recent: 55000, previous: 24000, older: 8000 },
  laptop: { recent: 85000, previous: 42000, older: 15000 },
};
const conditionFactors = { excellent: 1, good: 0.8, worn: 0.5 };
const deviceType = document.querySelector("#device-type");
const deviceAge = document.querySelector("#device-age");
const deviceCondition = document.querySelector("#device-condition");
const tradeResult = document.querySelector("#trade-result");
const showTradeAmount = animateNumber(
  document.querySelector("[data-trade-display]"),
  40000,
  rubles.format,
  350,
);

function updateTrade() {
  const base = tradeValues[deviceType.value][deviceAge.value];
  const estimate = Math.round(base * conditionFactors[deviceCondition.value]);
  showTradeAmount(estimate);
  tradeResult.textContent = "Предварительная скидка до\u00a0" + rubles.format(estimate);
}

[deviceType, deviceAge, deviceCondition].forEach((select) => select.addEventListener("change", updateTrade));
updateTrade();

const price = document.querySelector("#installment-price");
const priceDisplay = document.querySelector("#price-display");
const installmentResult = document.querySelector("#installment-result");
const showInstallmentAmount = animateNumber(
  document.querySelector("[data-installment-display]"),
  5000,
  rubles.format,
  260,
);
let installmentAnnouncement;

function updateInstallment() {
  const duration = Number(document.querySelector('input[name="term"]:checked').value);
  const payment = Math.ceil(price.valueAsNumber / duration);
  const formattedPrice = rubles.format(price.valueAsNumber);
  priceDisplay.textContent = formattedPrice;
  price.setAttribute("aria-valuetext", formattedPrice);
  showInstallmentAmount(payment);
  clearTimeout(installmentAnnouncement);
  installmentAnnouncement = setTimeout(() => {
    installmentResult.textContent = "Ежемесячный платёж " + rubles.format(payment);
  }, 270);
}

price.addEventListener("input", updateInstallment);
document.querySelectorAll('input[name="term"]').forEach((term) => term.addEventListener("change", updateInstallment));
updateInstallment();

const moscowTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const storeStatuses = document.querySelectorAll("[data-closing]");

function updateStores() {
  const [hour, minute] = moscowTime.format(new Date()).split(":").map(Number);
  const minutes = hour * 60 + minute;
  storeStatuses.forEach((status) => {
    const closingHour = Number(status.dataset.closing);
    const open = minutes >= 10 * 60 && minutes < closingHour * 60;
    status.dataset.open = String(open);
    status.textContent = open ? "Открыто до\u00a0" + closingHour + ":00" : "Закрыто, откроется в\u00a010:00";
    status.hidden = false;
  });
}

updateStores();
setInterval(updateStores, 1000 * 15);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateStores();
});

const requestForm = document.querySelector("#request-form");
const requestName = document.querySelector("#request-name");
const phoneInput = document.querySelector("#request-phone");
const requestSuccess = document.querySelector("#request-success");

function phonePrefixLength(raw, digits) {
  if (raw.startsWith("+7")) return 1;
  return /^[78]$|^[78]\d{10,}$/.test(digits) ? 1 : 0;
}

function nationalDigits(raw) {
  const digits = raw.replace(/\D/g, "");
  const prefix = phonePrefixLength(raw, digits);
  return digits.slice(prefix, prefix + 10);
}

function formatPhone(digits) {
  if (!digits) return "+7";
  let value = "+7 (" + digits.slice(0, 3);
  if (digits.length >= 3) value += ")";
  if (digits.length > 3) value += " " + digits.slice(3, 6);
  if (digits.length > 6) value += "-" + digits.slice(6, 8);
  if (digits.length > 8) value += "-" + digits.slice(8, 10);
  return value;
}

function positionAfterDigits(value, count) {
  const positions = Array.from(value.matchAll(/\d/g), (match) => match.index + 1);
  return count >= positions.length - 1 ? value.length : positions[Math.max(0, count)];
}

phoneInput.addEventListener("focus", () => {
  if (phoneInput.value) return;
  phoneInput.value = "+7";
  phoneInput.setSelectionRange(2, 2);
});
phoneInput.addEventListener("blur", () => {
  if (phoneInput.value === "+7") phoneInput.value = "";
});
phoneInput.addEventListener("paste", (event) => {
  const raw = event.clipboardData?.getData("text").trim() ?? "";
  const digits = raw.replace(/\D/g, "");
  if (!/^\d{10}$|^[78]\d{10}$/.test(digits)) return;
  event.preventDefault();
  phoneInput.value = formatPhone(nationalDigits(raw));
  phoneInput.setCustomValidity("");
});
phoneInput.addEventListener("beforeinput", (event) => {
  const caret = phoneInput.selectionStart;
  if (caret !== phoneInput.selectionEnd || !event.cancelable) return;
  const backwards = event.inputType === "deleteContentBackward";
  if (!backwards && event.inputType !== "deleteContentForward") return;

  const before = phoneInput.value.slice(0, caret);
  const after = phoneInput.value.slice(caret);
  const adjacent = backwards ? before.slice(-1) : after[0];
  if (!adjacent || /\d/.test(adjacent)) return;

  const precedingDigits = Math.max(0, before.replace(/\D/g, "").length - 1);
  const index = precedingDigits - Number(backwards);
  const digits = nationalDigits(phoneInput.value);
  if (index < 0 || index >= digits.length) return;
  event.preventDefault();
  phoneInput.value = formatPhone(digits.slice(0, index) + digits.slice(index + 1));
  const position = positionAfterDigits(phoneInput.value, index);
  phoneInput.setSelectionRange(position, position);
  phoneInput.setCustomValidity("");
});
phoneInput.addEventListener("input", (event) => {
  if (event.isComposing) return;
  const raw = phoneInput.value;
  const digits = raw.replace(/\D/g, "");
  const beforeCaret = raw.slice(0, phoneInput.selectionStart);
  const count = beforeCaret.replace(/\D/g, "").length - phonePrefixLength(raw, digits);
  phoneInput.value = raw ? formatPhone(nationalDigits(raw)) : "";
  if (phoneInput.value) {
    const position = positionAfterDigits(phoneInput.value, count);
    phoneInput.setSelectionRange(position, position);
  }
  phoneInput.setCustomValidity("");
});

requestName.addEventListener("input", () => requestName.setCustomValidity(""));
requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  requestName.setCustomValidity(requestName.value.trim() ? "" : "Введите имя.");
  phoneInput.setCustomValidity(nationalDigits(phoneInput.value).length === 10 ? "" : "Введите номер из\u00a010 цифр после +7.");
  if (!requestForm.reportValidity()) return;

  // Демо: проверяем поля и показываем результат локально.
  requestForm.reset();
  requestForm.hidden = true;
  requestSuccess.hidden = false;
  requestSuccess.querySelector("h3").focus();
});
requestForm.hidden = false;
