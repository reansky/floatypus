# FLOATYPUS ($FLOATY)

The complete FLOATYPUS community website source. This is a static HTML, CSS, and vanilla JavaScript site with editable token settings, links, and image files.

## Requirements

- No software is required when deploying directly to GitHub Pages.
- Node.js 18 or newer and npm are optional for local preview/build commands.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

The local site will be served from the project root.

## Build

```bash
npm run build
```

This creates a deployable `dist/` directory containing `index.html` and `assets/`.

## Change CA, Links, Or Images

Open `config.js`. This is the only file you need to edit for normal updates:

- `address` - replace the placeholder with the real contract address.
- `links.x` - replace the X profile URL.
- `links.buy` - replace the buy button destination with the official DEX URL.
- `chain`, `supply`, `liquidity`, and `tax` - update official token details.
- `images.hero` - replace the hero image path.
- `images.mascot` - replace the mascot image path.
- `images.features` - replace the three feature image paths.
- `images.memes` - replace the ten meme image paths.

Put all replacement images directly inside `assets/`. Use lowercase filenames without spaces, for example `assets/hero-right.jpg`. The path in `config.js` must match the file path exactly, including uppercase and lowercase letters.

The page currently loads Bungee, DM Sans, and Space Grotesk from Google Fonts. The site remains a single static page and does not require a framework, API, database, or Browser Use Cloud runtime.

## Preview The Build

```bash
npm run preview
```

## Deployment

### GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this folder with `index.html` at the repository root.
3. Open the repository's Settings, then Pages.
4. Select Deploy from branch, choose the main branch and the root folder, then save.
5. Edit `config.js` whenever you need to change the CA, links, or image paths, then commit the change.

GitHub Pages can serve this project directly. A build is not required.

### Other Static Hosts

Deploy the contents of `dist/` to any static hosting provider, or configure that provider to run:

```bash
npm run build
```

No environment variables are required. `.env.example` is included for documentation.

## Source Layout

- `index.html` - page content and layout.
- `config.js` - CA, token details, links, and image paths.
- `styles.css` - all visual styling and responsive rules.
- `script.js` - image loading, menu, copy buttons, lightbox, and animations.
- `assets/` - one folder containing all hero, mascot, feature, and meme images.
- `scripts/build.mjs` - copies all required files into `dist/`.
- `package.json` - local development and build commands.

There are no `src/`, `app/`, `components/`, Tailwind, Next.js, or Vite directories. The project is intentionally simple so it can be uploaded directly to GitHub Pages or any static host.
