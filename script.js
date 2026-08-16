const MASCOT_IMAGE = FLOAT_CONFIG.images.mascot;
const MEME_IMAGES = FLOAT_CONFIG.images.memes;
const FEATURE_IMAGES = FLOAT_CONFIG.images.features;
const HERO_SIDE_IMAGE = FLOAT_CONFIG.images.hero;

const ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com";

const FLOATY_ADDRESS = FLOAT_CONFIG.address;
const POOL_ADDRESS = FLOAT_CONFIG.pool;

/*
 * ------------------------------------------------------------
 * BASIC PAGE CONFIG
 * ------------------------------------------------------------
 */

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

/*
 * ------------------------------------------------------------
 * ROBINHOOD CHAIN RPC
 * ------------------------------------------------------------
 */

async function rpcCall(method, params = []) {
  const response = await fetch(ROBINHOOD_RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }

  return data.result;
}

/*
 * ------------------------------------------------------------
 * ERC-20 ABI SELECTORS
 * ------------------------------------------------------------
 */

const ERC20 = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

/*
 * SushiSwap V3 pool selectors
 */

const V3_POOL = {
  token0: "0x0dfe1681",
  token1: "0xd21220a7",
  liquidity: "0x1a686502",
  slot0: "0x3850c7bd"
};

/*
 * ------------------------------------------------------------
 * ABI DECODERS
 * ------------------------------------------------------------
 */

function strip0x(value) {
  return value ? value.replace(/^0x/, "") : "";
}

function decodeUint256(value) {
  return BigInt(value);
}

function decodeAddress(value) {
  const clean = strip0x(value);
  return "0x" + clean.slice(-40);
}

function decodeAbiString(value) {
  const clean = strip0x(value);

  if (!clean) return "";

  /*
   * Dynamic string:
   *
   * offset
   * length
   * bytes
   */

  try {
    const offset = Number(BigInt("0x" + clean.slice(0, 64))) * 2;
    const length = Number(
      BigInt("0x" + clean.slice(offset, offset + 64))
    );

    const bytes = clean.slice(
      offset + 64,
      offset + 64 + length * 2
    );

    const decoded = new TextDecoder().decode(
      new Uint8Array(
        bytes.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
      )
    );

    if (decoded) return decoded;
  } catch (_) {}

  /*
   * bytes32 fallback
   */

  try {
    const bytes = clean.match(/.{1,2}/g) || [];

    return bytes
      .map((byte) => String.fromCharCode(parseInt(byte, 16)))
      .join("")
      .replace(/\0/g, "")
      .trim();
  } catch (_) {
    return "";
  }
}

function formatTokenAmount(raw, decimals) {
  const value = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);

  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${whole}.${fractionText}`;
}

function formatLargeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000)
      .toFixed(2)
      .replace(/\.00$/, "")}B`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000)
      .toFixed(2)
      .replace(/\.00$/, "")}M`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000)
      .toFixed(2)
      .replace(/\.00$/, "")}K`;
  }

  if (number >= 1) {
    return number.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  }

  return value;
}

/*
 * ------------------------------------------------------------
 * ERC-20 DATA
 * ------------------------------------------------------------
 */

async function getERC20Data() {
  const [nameRaw, symbolRaw, decimalsRaw, supplyRaw] =
    await Promise.all([
      rpcCall("eth_call", [
        {
          to: FLOATY_ADDRESS,
          data: ERC20.name
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: FLOATY_ADDRESS,
          data: ERC20.symbol
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: FLOATY_ADDRESS,
          data: ERC20.decimals
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: FLOATY_ADDRESS,
          data: ERC20.totalSupply
        },
        "latest"
      ])
    ]);

  const name = decodeAbiString(nameRaw);
  const symbol = decodeAbiString(symbolRaw);
  const decimals = Number(decodeUint256(decimalsRaw));
  const supply = formatTokenAmount(supplyRaw, decimals);

  return {
    name,
    symbol,
    decimals,
    supply
  };
}

/*
 * ------------------------------------------------------------
 * SUSHISWAP V3 POOL DATA
 * ------------------------------------------------------------
 */

async function getPoolData() {
  if (!POOL_ADDRESS) {
    throw new Error("Pool address missing from FLOAT_CONFIG");
  }

  const [token0Raw, token1Raw, liquidityRaw, slot0Raw] =
    await Promise.all([
      rpcCall("eth_call", [
        {
          to: POOL_ADDRESS,
          data: V3_POOL.token0
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: POOL_ADDRESS,
          data: V3_POOL.token1
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: POOL_ADDRESS,
          data: V3_POOL.liquidity
        },
        "latest"
      ]),

      rpcCall("eth_call", [
        {
          to: POOL_ADDRESS,
          data: V3_POOL.slot0
        },
        "latest"
      ])
    ]);

  const token0 = decodeAddress(token0Raw);
  const token1 = decodeAddress(token1Raw);

  const liquidity = BigInt(liquidityRaw);

  /*
   * slot0 first value = sqrtPriceX96
   */

  const sqrtPriceX96 = BigInt(
    "0x" + strip0x(slot0Raw).slice(0, 64)
  );

  return {
    token0,
    token1,
    liquidity,
    sqrtPriceX96
  };
}

/*
 * ------------------------------------------------------------
 * POOL TOKEN BALANCES
 *
 * This reads actual ERC-20 balances held by the V3 pool.
 * It is useful as an on-chain liquidity indicator.
 * ------------------------------------------------------------
 */

async function getPoolBalances(poolData) {
  const token0DecimalsRaw = await rpcCall("eth_call", [
    {
      to: poolData.token0,
      data: ERC20.decimals
    },
    "latest"
  ]);

  const token1DecimalsRaw = await rpcCall("eth_call", [
    {
      to: poolData.token1,
      data: ERC20.decimals
    },
    "latest"
  ]);

  const token0Decimals = Number(
    decodeUint256(token0DecimalsRaw)
  );

  const token1Decimals = Number(
    decodeUint256(token1DecimalsRaw)
  );

  const balanceOfSelector = "0x70a08231";

  const poolWithout0x = POOL_ADDRESS
    .toLowerCase()
    .replace(/^0x/, "")
    .padStart(64, "0");

  const token0BalanceRaw = await rpcCall("eth_call", [
    {
      to: poolData.token0,
      data: balanceOfSelector + poolWithout0x
    },
    "latest"
  ]);

  const token1BalanceRaw = await rpcCall("eth_call", [
    {
      to: poolData.token1,
      data: balanceOfSelector + poolWithout0x
    },
    "latest"
  ]);

  const token0Balance = formatTokenAmount(
    token0BalanceRaw,
    token0Decimals
  );

  const token1Balance = formatTokenAmount(
    token1BalanceRaw,
    token1Decimals
  );

  return {
    token0Balance,
    token1Balance,
    token0Decimals,
    token1Decimals
  };
}

/*
 * ------------------------------------------------------------
 * UPDATE FLOATOMICS
 * ------------------------------------------------------------
 */

async function updateFloatomics() {
  try {
    /*
     * Read FLOATY directly from its contract
     */

    const token = await getERC20Data();

    /*
     * Read SushiSwap V3 pool
     */

    const pool = await getPoolData();

    /*
     * Read actual ERC-20 balances held by pool
     */

    const balances = await getPoolBalances(pool);

    /*
     * Detect which side is FLOATY
     */

    const isToken0Floaty =
      pool.token0.toLowerCase() === FLOATY_ADDRESS.toLowerCase();

    const floatyLiquidity = isToken0Floaty
      ? balances.token0Balance
      : balances.token1Balance;

    const wethLiquidity = isToken0Floaty
      ? balances.token1Balance
      : balances.token0Balance;

    /*
     * Update all data-config elements
     */

    document
      .querySelectorAll("[data-config]")
      .forEach((element) => {
        const key = element.dataset.config;

        switch (key) {
          case "name":
            element.textContent =
              token.name || FLOAT_CONFIG.name;
            break;

          case "ticker":
            element.textContent = token.symbol
              ? `$${token.symbol.replace(/^\$/, "")}`
              : FLOAT_CONFIG.ticker;
            break;

          case "supply":
            element.textContent =
              formatLargeNumber(token.supply);
            break;

          case "chain":
            element.textContent = "Robinhood Chain";
            break;

          case "liquidity":
            /*
             * V3 does not expose a direct USD TVL value.
             *
             * Instead, show the actual token amounts
             * held by the SushiSwap V3 pool.
             */

            element.textContent =
              `${formatLargeNumber(floatyLiquidity)} FLOATY / ${formatLargeNumber(wethLiquidity)} WETH`;
            break;

          case "tax":
            element.textContent = FLOAT_CONFIG.tax;
            break;

          default:
            element.textContent =
              FLOAT_CONFIG[key] ?? element.textContent;
        }
      });

    console.log("FLOATY on-chain:", token);
    console.log("SushiSwap V3 pool:", pool);
    console.log("Pool balances:", balances);

  } catch (error) {
    console.error(
      "Failed to load FLOATY on-chain data:",
      error
    );

    /*
     * Fallback to config.js
     */

    document
      .querySelectorAll("[data-config]")
      .forEach((element) => {
        element.textContent =
          FLOAT_CONFIG[element.dataset.config] ??
          element.textContent;
      });
  }
}

/*
 * Start blockchain data loading
 */

updateFloatomics();

/*
 * Refresh every 60 seconds
 */

setInterval(updateFloatomics, 60_000);

/*
 * ------------------------------------------------------------
 * MASCOTS
 * ------------------------------------------------------------
 */

const mascotImages = [
  ...document.querySelectorAll("[data-mascot]")
];

const loadMascot = (image) => {
  if (!image.src) {
    image.loading = "eager";
    image.src = MASCOT_IMAGE;
  }
};

const mascotObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadMascot(entry.target);
        mascotObserver.unobserve(entry.target);
      }
    });
  },
  {
    rootMargin: "220px"
  }
);

mascotImages.forEach((image, index) => {
  image.loading = "lazy";

  if (index < 4) {
    loadMascot(image);
  } else {
    mascotObserver.observe(image);
  }
});

const updateMascots = () =>
  mascotImages.forEach((image) => {
    if (
      !image.src &&
      image.getBoundingClientRect().top <
        window.innerHeight + 420
    ) {
      loadMascot(image);
    }
  });

window.addEventListener(
  "scroll",
  updateMascots,
  {
    passive: true
  }
);

updateMascots();

/*
 * ------------------------------------------------------------
 * HERO
 * ------------------------------------------------------------
 */

document
  .querySelectorAll("[data-hero]")
  .forEach((image) => {
    image.loading = "eager";
    image.src = HERO_SIDE_IMAGE;
  });

/*
 * ------------------------------------------------------------
 * MEMES
 * ------------------------------------------------------------
 */

const memeImages = [
  ...document.querySelectorAll("[data-meme-index]")
];

const loadMeme = (image) => {
  if (!image.src) {
    image.decoding = "async";
    image.src =
      MEME_IMAGES[
        Number(image.dataset.memeIndex)
      ];
  }
};

const memeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadMeme(entry.target);
        memeObserver.unobserve(entry.target);
      }
    });
  },
  {
    rootMargin: "360px"
  }
);

memeImages.forEach((image, index) => {
  image.loading = "lazy";
  image.decoding = "async";

  if (index < 3) {
    loadMeme(image);
  } else {
    memeObserver.observe(image);
  }
});

const updateMemes = () =>
  memeImages.forEach((image) => {
    if (
      !image.src &&
      image.getBoundingClientRect().top <
        window.innerHeight + 520
    ) {
      loadMeme(image);
    }
  });

window.addEventListener(
  "scroll",
  updateMemes,
  {
    passive: true
  }
);

updateMemes();

/*
 * ------------------------------------------------------------
 * TOAST + COPY
 * ------------------------------------------------------------
 */

const showToast = (message) => {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => toast.classList.remove("show"),
    2200
  );
};

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input =
      document.createElement("textarea");

    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";

    document.body.appendChild(input);

    input.select();

    document.execCommand("copy");

    input.remove();
  }

  showToast("Copied to clipboard");
};

/*
 * ------------------------------------------------------------
 * MOBILE MENU
 * ------------------------------------------------------------
 */

const setMenuState = (open) => {
  header.classList.toggle(
    "menu-open",
    open
  );

  nav.classList.toggle(
    "open",
    open
  );

  menuButton.classList.toggle(
    "open",
    open
  );

  menuButton.setAttribute(
    "aria-expanded",
    String(open)
  );

  menuButton.setAttribute(
    "aria-label",
    open ? "Close menu" : "Open menu"
  );
};

const closeMenu = () =>
  setMenuState(false);

menuButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    setMenuState(
      !header.classList.contains(
        "menu-open"
      )
    );
  }
);

document
  .querySelectorAll('a[href^="#"]')
  .forEach((link) =>
    link.addEventListener(
      "click",
      (event) => {
        const href =
          link.getAttribute("href");

        if (href?.startsWith("#")) {
          const target =
            document.querySelector(href);

          if (target) {
            event.preventDefault();

            closeMenu();

            target.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

            history.replaceState(
              null,
              "",
              href
            );

            return;
          }
        }

        closeMenu();
      }
    )
  );

document.addEventListener(
  "click",
  (event) => {
    if (
      header.classList.contains(
        "menu-open"
      ) &&
      !header.contains(event.target)
    ) {
      closeMenu();
    }
  }
);

window.addEventListener(
  "resize",
  () => {
    if (window.innerWidth > 850) {
      closeMenu();
    }
  },
  {
    passive: true
  }
);

/*
 * ------------------------------------------------------------
 * HEADER SCROLL
 * ------------------------------------------------------------
 */

window.addEventListener(
  "scroll",
  () =>
    header.classList.toggle(
      "scrolled",
      window.scrollY > 24
    ),
  {
    passive: true
  }
);

/*
 * ------------------------------------------------------------
 * COPY CONTRACT
 * ------------------------------------------------------------
 */

const copyAddressButton =
  document.querySelector(
    "[data-copy-address]"
  );

if (copyAddressButton) {
  copyAddressButton.addEventListener(
    "click",
    () => copyText(FLOAT_CONFIG.address)
  );
}

/*
 * ------------------------------------------------------------
 * COPY QUOTES
 * ------------------------------------------------------------
 */

document
  .querySelectorAll("[data-copy-quote]")
  .forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        const card =
          button.closest(".quote-card");

        if (!card) return;

        const text =
          card.querySelector("p");

        if (text) {
          copyText(
            text.textContent.trim()
          );
        }
      }
    )
  );

/*
 * ------------------------------------------------------------
 * X POST LINKS
 * ------------------------------------------------------------
 */

document
  .querySelectorAll("[data-post-quote]")
  .forEach((link) => {
    const card =
      link.closest(".quote-card");

    if (!card) return;

    const paragraph =
      card.querySelector("p");

    if (!paragraph) return;

    const quote =
      paragraph.textContent.trim();

    link.href =
      `${FLOAT_CONFIG.links.x}/intent/post?text=` +
      encodeURIComponent(
        `${quote}\n\n${FLOAT_CONFIG.ticker} · FLOAT. EARN. CHILL.`
      );
  });

/*
 * ------------------------------------------------------------
 * REVEAL ANIMATION
 * ------------------------------------------------------------
 */

const revealObserver =
  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(
            "visible"
          );

          revealObserver.unobserve(
            entry.target
          );
        }
      });
    },
    {
      threshold: 0.12
    }
  );

document
  .querySelectorAll(".reveal")
  .forEach((element) =>
    revealObserver.observe(element)
  );

requestAnimationFrame(() =>
  document
    .querySelectorAll(".reveal")
    .forEach((element) => {
      if (
        element.getBoundingClientRect()
          .top <
        window.innerHeight * 1.12
      ) {
        element.classList.add(
          "visible"
        );
      }
    })
);

/*
 * ------------------------------------------------------------
 * TILT CARDS
 * ------------------------------------------------------------
 */

document
  .querySelectorAll(".tilt-card")
  .forEach((card) => {
    card.addEventListener(
      "pointermove",
      (event) => {
        if (
          window.matchMedia(
            "(max-width: 850px)"
          ).matches
        ) {
          return;
        }

        const box =
          card.getBoundingClientRect();

        const rotateX =
          ((event.clientY - box.top) /
            box.height -
            0.5) *
          -4;

        const rotateY =
          ((event.clientX - box.left) /
            box.width -
            0.5) *
          4;

        card.style.transform =
          `perspective(700px) rotateX(${rotateX}deg) rotateY(${r
