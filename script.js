const MASCOT_IMAGE = FLOAT_CONFIG.images.mascot;
const MEME_IMAGES = FLOAT_CONFIG.images.memes;
const FEATURE_IMAGES = FLOAT_CONFIG.images.features;
const HERO_SIDE_IMAGE = FLOAT_CONFIG.images.hero;

document.querySelectorAll("[data-link]").forEach((link) => {
  const href = FLOAT_CONFIG.links[link.dataset.link];
  if (href) link.href = href;
});

const featureImages = [...document.querySelectorAll("[data-feature-index]")];
featureImages.forEach((image) => {
  image.loading = "lazy";
  image.src = FEATURE_IMAGES[Number(image.dataset.featureIndex)];
});
const header = document.getElementById("site-header");
const nav = document.getElementById("nav-links");
const menuButton = document.getElementById("menu-button");
const toast = document.getElementById("toast");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
let toastTimer;

const mascotImages = [...document.querySelectorAll("[data-mascot]")];
const loadMascot = (image) => { if (!image.src) { image.loading = "eager"; image.src = MASCOT_IMAGE; } };
const mascotObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) { loadMascot(entry.target); mascotObserver.unobserve(entry.target); } });
}, { rootMargin: "220px" });
mascotImages.forEach((image, index) => {
  image.loading = "lazy";
  if (index < 4) loadMascot(image); else mascotObserver.observe(image);
});
const updateMascots = () => mascotImages.forEach((image) => {
  if (!image.src && image.getBoundingClientRect().top < window.innerHeight + 420) loadMascot(image);
});
window.addEventListener("scroll", updateMascots, { passive: true });
updateMascots();
document.querySelectorAll("[data-hero]").forEach((image) => { image.loading = "eager"; image.src = HERO_SIDE_IMAGE; });
const memeImages = [...document.querySelectorAll("[data-meme-index]")];
const loadMeme = (image) => {
  if (!image.src) { image.decoding = "async"; image.src = MEME_IMAGES[Number(image.dataset.memeIndex)]; }
};
const memeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) { loadMeme(entry.target); memeObserver.unobserve(entry.target); } });
}, { rootMargin: "360px" });
memeImages.forEach((image, index) => {
  image.loading = "lazy";
  image.decoding = "async";
  if (index < 3) loadMeme(image); else memeObserver.observe(image);
});
const updateMemes = () => memeImages.forEach((image) => {
  if (!image.src && image.getBoundingClientRect().top < window.innerHeight + 520) loadMeme(image);
});
window.addEventListener("scroll", updateMemes, { passive: true });
updateMemes();
const ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com";
const FLOATY_ADDRESS = FLOAT_CONFIG.address;

const ERC20_ABI = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

async function rpcCall(method, params = []) {
  const response = await fetch(ROBINHOOD_RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result;
}

async function readERC20Data() {
  try {
    const calls = await Promise.all([
      rpcCall("eth_call", [{ to: FLOATY_ADDRESS, data: ERC20_ABI.name }, "latest"]),
      rpcCall("eth_call", [{ to: FLOATY_ADDRESS, data: ERC20_ABI.symbol }, "latest"]),
      rpcCall("eth_call", [{ to: FLOATY_ADDRESS, data: ERC20_ABI.decimals }, "latest"]),
      rpcCall("eth_call", [{ to: FLOATY_ADDRESS, data: ERC20_ABI.totalSupply }, "latest"])
    ]);

    const decodeString = (hex) => {
      const clean = hex.replace(/^0x/, "");

      // Standard ABI dynamic string
      if (clean.length >= 128) {
        const offset = parseInt(clean.slice(0, 64), 16) * 2;
        const length = parseInt(clean.slice(offset, offset + 64), 16);
        const bytes = clean.slice(offset + 64, offset + 64 + length * 2);

        return decodeURIComponent(
          bytes.replace(/(..)/g, "%$1")
        );
      }

      // bytes32 fallback
      return clean
        .match(/.{2}/g)
        ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
        .join("")
        .replace(/\0/g, "")
        .trim() || "";
    };

    const name = decodeString(calls[0]);
    const symbol = decodeString(calls[1]);

    const decimals = parseInt(calls[2], 16);
    const totalSupplyRaw = BigInt(calls[3]);

    const divisor = 10n ** BigInt(decimals);
    const whole = totalSupplyRaw / divisor;
    const fraction = totalSupplyRaw % divisor;

    let supply = whole.toString();

    if (fraction > 0n) {
      const fractionText = fraction
        .toString()
        .padStart(decimals, "0")
        .replace(/0+$/, "");

      supply += "." + fractionText;
    }

    // Format large numbers
    const supplyNumber = Number(supply);

    let formattedSupply;

    if (Number.isFinite(supplyNumber)) {
      if (supplyNumber >= 1_000_000_000) {
        formattedSupply = `${(supplyNumber / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}B`;
      } else if (supplyNumber >= 1_000_000) {
        formattedSupply = `${(supplyNumber / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
      } else if (supplyNumber >= 1_000) {
        formattedSupply = `${(supplyNumber / 1_000).toFixed(2).replace(/\.00$/, "")}K`;
      } else {
        formattedSupply = supply;
      }
    } else {
      formattedSupply = supply;
    }

    document.querySelectorAll("[data-config]").forEach((element) => {
      const key = element.dataset.config;

      if (key === "name") {
        element.textContent = name || FLOAT_CONFIG.name;
      } else if (key === "ticker") {
        element.textContent = symbol ? `$${symbol.replace(/^\$/, "")}` : FLOAT_CONFIG.ticker;
      } else if (key === "supply") {
        element.textContent = formattedSupply;
      } else if (key === "chain") {
        element.textContent = "Robinhood Chain";
      } else {
        element.textContent = FLOAT_CONFIG[key] ?? element.textContent;
      }
    });

    console.log("FLOATY on-chain data:", {
      name,
      symbol,
      decimals,
      supply
    });

  } catch (error) {
    console.error("Failed to read FLOATY from Robinhood Chain:", error);

    // Fallback ke config.js jika RPC gagal
    document.querySelectorAll("[data-config]").forEach((element) => {
      element.textContent =
        FLOAT_CONFIG[element.dataset.config] ?? element.textContent;
    });
  }
}

readERC20Data();// ============================================================
// SUSHISWAP V3 LIQUIDITY - FLOATY
// ============================================================

const FLOATY_POOL = FLOAT_CONFIG.pool;

const V3_SELECTORS = {
  token0: "0x0dfe1681",
  token1: "0xd21220a7",
  balanceOf: "0x70a08231"
};

function decodeAddressResult(hex) {
  return "0x" + hex.replace(/^0x/, "").slice(-40);
}

function decodeUintResult(hex) {
  return BigInt(hex);
}

function formatPoolAmount(raw, decimals) {
  const value = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);

  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  return (
    whole.toString() +
    "." +
    fraction
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "")
  );
}

function formatLiquidityNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return value;

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}B`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(2).replace(/\.00$/, "")}K`;
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 4
  });
}

async function readLiquidity() {
  if (!FLOATY_POOL) {
    console.warn("FLOATY pool address is missing.");
    return;
  }

  try {
    // Get pool token0 and token1
    const [token0Raw, token1Raw] = await Promise.all([
      rpcCall("eth_call", [
        {
          to: FLOATY_POOL,
          data: V3_SELECTORS.token0
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: FLOATY_POOL,
          data: V3_SELECTORS.token1
        },
        "latest"
      ])
    ]);

    const token0 = decodeAddressResult(token0Raw);
    const token1 = decodeAddressResult(token1Raw);

    // Read decimals + symbol for both tokens
    const [
      token0DecimalsRaw,
      token1DecimalsRaw,
      token0SymbolRaw,
      token1SymbolRaw
    ] = await Promise.all([
      rpcCall("eth_call", [
        {
          to: token0,
          data: ERC20_ABI.decimals
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: token1,
          data: ERC20_ABI.decimals
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: token0,
          data: ERC20_ABI.symbol
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: token1,
          data: ERC20_ABI.symbol
        },
        "latest"
      ])
    ]);

    const token0Decimals = Number(
      decodeUintResult(token0DecimalsRaw)
    );

    const token1Decimals = Number(
      decodeUintResult(token1DecimalsRaw)
    );

    const decodeSymbol = (hex) => {
      const clean = hex.replace(/^0x/, "");

      try {
        if (clean.length >= 128) {
          const offset =
            parseInt(clean.slice(0, 64), 16) * 2;

          const length =
            parseInt(
              clean.slice(offset, offset + 64),
              16
            );

          const bytes =
            clean.slice(
              offset + 64,
              offset + 64 + length * 2
            );

          return decodeURIComponent(
            bytes.replace(/(..)/g, "%$1")
          ).replace(/\0/g, "").trim();
        }

        return clean
          .match(/.{2}/g)
          ?.map((byte) =>
            String.fromCharCode(
              parseInt(byte, 16)
            )
          )
          .join("")
          .replace(/\0/g, "")
          .trim() || "";
      } catch {
        return "";
      }
    };

    const symbol0 = decodeSymbol(token0SymbolRaw) || "TOKEN";
    const symbol1 = decodeSymbol(token1SymbolRaw) || "TOKEN";

    // Pool address padded for balanceOf(address)
    const poolArgument = FLOATY_POOL
      .toLowerCase()
      .replace(/^0x/, "")
      .padStart(64, "0");

    // Read actual ERC-20 balances held by the SushiSwap V3 pool
    const [balance0Raw, balance1Raw] = await Promise.all([
      rpcCall("eth_call", [
        {
          to: token0,
          data: V3_SELECTORS.balanceOf + poolArgument
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: token1,
          data: V3_SELECTORS.balanceOf + poolArgument
        },
        "latest"
      ])
    ]);

    const balance0 = formatPoolAmount(
      balance0Raw,
      token0Decimals
    );

    const balance1 = formatPoolAmount(
      balance1Raw,
      token1Decimals
    );

    // Put FLOATY first
    let liquidityText;

    if (
      token0.toLowerCase() ===
      FLOATY_ADDRESS.toLowerCase()
    ) {
      liquidityText =
        `${formatLiquidityNumber(balance0)} ${symbol0} / ${formatLiquidityNumber(balance1)} ${symbol1}`;
    } else if (
      token1.toLowerCase() ===
      FLOATY_ADDRESS.toLowerCase()
    ) {
      liquidityText =
        `${formatLiquidityNumber(balance1)} ${symbol1} / ${formatLiquidityNumber(balance0)} ${symbol0}`;
    } else {
      liquidityText =
        `${formatLiquidityNumber(balance0)} ${symbol0} / ${formatLiquidityNumber(balance1)} ${symbol1}`;
    }

    // Update ONLY the Liquidity card
    document
      .querySelectorAll('[data-config="liquidity"]')
      .forEach((element) => {
        element.textContent = liquidityText;
      });

    console.log("FLOATY SushiSwap V3 pool:", {
      pool: FLOATY_POOL,
      token0,
      token1,
      balance0,
      balance1,
      liquidityText
    });

  } catch (error) {
    console.error(
      "Failed to read FLOATY SushiSwap V3 liquidity:",
      error
    );

    // Do NOT break the website if liquidity fails.
  }
}

readLiquidity();

// Refresh liquidity every 60 seconds
setInterval(readLiquidity, 60_000);
document.querySelectorAll("[data-social='x'], [data-social-link='x']").forEach((link) => { link.href = FLOAT_CONFIG.links.x; });

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
};
const copyText = async (value) => {
  try { await navigator.clipboard.writeText(value); } catch { const input = document.createElement("textarea"); input.value = value; input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove(); }
  showToast("Copied to clipboard");
};

const setMenuState = (open) => {
  header.classList.toggle("menu-open", open);
  nav.classList.toggle("open", open);
  menuButton.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
};
const closeMenu = () => setMenuState(false);
menuButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setMenuState(!header.classList.contains("menu-open"));
});
document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener("click", (event) => {
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) {
    const target = document.querySelector(href);
    if (target) {
      event.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
      return;
    }
  }
  closeMenu();
}));
document.addEventListener("click", (event) => {
  if (header.classList.contains("menu-open") && !header.contains(event.target)) closeMenu();
});
window.addEventListener("resize", () => { if (window.innerWidth > 850) closeMenu(); }, { passive: true });

window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 24), { passive: true });
document.querySelector("[data-copy-address]").addEventListener("click", () => copyText(FLOAT_CONFIG.address));
document.querySelectorAll("[data-copy-quote]").forEach((button) => button.addEventListener("click", () => copyText(button.closest(".quote-card").querySelector("p").textContent.trim())));
document.querySelectorAll("[data-post-quote]").forEach((link) => {
  const quote = link.closest(".quote-card").querySelector("p").textContent.trim();
  link.href = `${FLOAT_CONFIG.links.x}/intent/post?text=${encodeURIComponent(`${quote}\n\n${FLOAT_CONFIG.ticker} · FLOAT. EARN. CHILL.`)}`;
});

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); revealObserver.unobserve(entry.target); } });
    }, { threshold: .12 });
    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
    requestAnimationFrame(() => document.querySelectorAll(".reveal").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight * 1.12) element.classList.add("visible");
    }));

    document.querySelectorAll(".tilt-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        if (window.matchMedia("(max-width: 850px)").matches) return;
        const box = card.getBoundingClientRect();
        const rotateX = ((event.clientY - box.top) / box.height - .5) * -4;
        const rotateY = ((event.clientX - box.left) / box.width - .5) * 4;
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });

    document.querySelectorAll("[data-lightbox]").forEach((tile) => tile.addEventListener("click", () => {
      const image = tile.querySelector("img");
      const source = image.dataset.memeIndex !== undefined ? MEME_IMAGES[Number(image.dataset.memeIndex)] : MASCOT_IMAGE;
      lightboxImage.alt = image.alt;
      lightbox.classList.add("open");
      document.body.classList.add("no-scroll");
      requestAnimationFrame(() => {
        lightboxImage.src = source;
        if (image.dataset.memeIndex !== undefined) loadMeme(image); else loadMascot(image);
      });
    }));
    const closeLightbox = () => { lightbox.classList.remove("open"); document.body.classList.remove("no-scroll"); };
    document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeLightbox(); closeMenu(); } });

    window.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const sun = document.querySelector(".sun-orb");
      if (!sun) return;
      const x = (event.clientX / window.innerWidth - .5) * 14;
      const y = (event.clientY / window.innerHeight - .5) * 8;
      sun.style.transform = `translate(${x}px, ${y}px)`;
    }, { passive: true });
