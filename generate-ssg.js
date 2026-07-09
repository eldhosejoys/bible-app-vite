import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const bibleJsonPath = path.join(__dirname, 'public', 'assets', 'json', 'bible.json');
const titleJsonPath = path.join(__dirname, 'public', 'assets', 'json', 'title.json');

// Ensure dist directory exists
if (!fs.existsSync(distDir) || !fs.existsSync(indexHtmlPath)) {
  console.error('❌ Build output dist/index.html not found! Please run `vite build` first.');
  process.exit(1);
}

console.log('🚀 Starting Static Site Generation (SSG) for Bible chapters...');
const startTime = Date.now();

// Read assets
const template = fs.readFileSync(indexHtmlPath, 'utf-8');
const bibleData = JSON.parse(fs.readFileSync(bibleJsonPath, 'utf-8'));
const titlesData = JSON.parse(fs.readFileSync(titleJsonPath, 'utf-8'));

// Group verses by book and chapter
const bibleGrouped = {};
bibleData.forEach(verse => {
  const b = verse.b.toString();
  const c = verse.c.toString();
  if (!bibleGrouped[b]) {
    bibleGrouped[b] = {};
  }
  if (!bibleGrouped[b][c]) {
    bibleGrouped[b][c] = [];
  }
  bibleGrouped[b][c].push(verse);
});

// Helper: Modify HTML template with title, metadata, and pre-rendered content
function getModifiedHtml(template, title, description, urlPath, contentHtml) {
  let html = template;

  // Replace Title
  const titleRegex = /<title>[^<]*<\/title>/i;
  const pageTitle = `${title} | ജീവന്റെവചനം മലയാളം`;
  if (titleRegex.test(html)) {
    html = html.replace(titleRegex, `<title>${pageTitle}</title>`);
  } else {
    html = html.replace(/<head>/i, `<head>\n  <title>${pageTitle}</title>`);
  }

  // Replace or Insert Description Meta
  const descRegex = /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i;
  const newDescTag = `<meta name="description" content="${description}" />`;
  if (descRegex.test(html)) {
    html = html.replace(descRegex, newDescTag);
  } else {
    html = html.replace(/<\/title>/i, `</title>\n  ${newDescTag}`);
  }

  // Add Open Graph and Twitter Meta Tags
  const canonicalUrl = `https://yehoshua.in${urlPath}`;
  const ogTags = `
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${description}" />
  `;
  html = html.replace(/<\/head>/i, `${ogTags}\n</head>`);

  // Inject pre-rendered content into <div id="root"></div>
  const rootRegex = /(<div\s+id=["']root["']\s*>)(<\/div>)/i;
  if (rootRegex.test(html)) {
    html = html.replace(rootRegex, `$1${contentHtml}$2`);
  }

  return html;
}

// Generate pages
let pageCount = 0;
titlesData.forEach(book => {
  const bookNum = book.n.toString();
  const bookNameML = book.bm;
  const totalChapters = book.c;

  // Ensure book directory exists in dist (e.g. dist/43/)
  const bookDir = path.join(distDir, bookNum);
  if (!fs.existsSync(bookDir)) {
    fs.mkdirSync(bookDir, { recursive: true });
  }

  for (let c = 1; c <= totalChapters; c++) {
    const chapterNum = c.toString();
    const verses = (bibleGrouped[bookNum] && bibleGrouped[bookNum][chapterNum]) || [];
    if (verses.length === 0) continue;

    // Title & Description
    const pageTitle = `${bookNameML} അദ്ധ്യായം ${chapterNum}`;
    const firstVersesText = verses.slice(0, 3).map(v => `${v.v}. ${v.t}`).join(' ');
    const pageDescription = `${bookNameML} അദ്ധ്യായം ${chapterNum} മലയാളം ബൈബിൾ വചനങ്ങൾ: ${firstVersesText.substring(0, 150)}...`;

    // 1. Build Pre-rendered Title Content (Header and Chapter boxes)
    let chapterBoxesHtml = '';
    
    // Add Info/Cross button
    chapterBoxesHtml += `
      <div class="numberbox">
        <a class="link-dark small text-decoration-none" href="/${bookNum}/info">
          <div class="col numberbox">✞</div>
        </a>
      </div>
    `;

    for (let i = 1; i <= totalChapters; i++) {
      const activeStyle = i === c ? 'style="background-color: rgb(141, 158, 255);"' : '';
      chapterBoxesHtml += `
        <div class="numberbox">
          <a class="link-dark small text-decoration-none" href="/${bookNum}/${i}">
            <div class="col numberbox" ${activeStyle}>${i}</div>
          </a>
        </div>
      `;
    }

    const titleContentHtml = `
      <div class="text-center mb-2">
        <div class="d-flex justify-content-center align-items-center">
          ${book.n > 1 ? `<a title="മുൻപത്തെ പുസ്തകം" href="/${book.n - 1}/1"><div class="arrowbutton card rounded-circle btn btn-sm"><img src="/assets/images/arrow-left.svg" alt="prev" /></div></a>` : ''}
          <h3 class="mx-3"><span class="text-primary fw-bold"><a class="text-decoration-none" href="/${bookNum}/1">${bookNameML}</a></span> - അദ്ധ്യായം ${chapterNum}</h3>
          ${book.n < 66 ? `<a title="അടുത്ത പുസ്തകം" href="/${book.n + 1}/1"><div class="arrowbutton card rounded-circle btn btn-sm"><img src="/assets/images/arrow-right.svg" alt="next" /></div></a>` : ''}
        </div>
        <div class="row row-cols-auto mt-3 justify-content-center">
          ${chapterBoxesHtml}
        </div>
      </div>
    `;

    // 2. Build Pre-rendered Verse Cards
    let versesCardsHtml = '';
    verses.forEach(v => {
      versesCardsHtml += `
        <div class="col mb-2 pushdata" id="v-${v.v}">
          <div class="words-text-card shadow-sm card">
            <div class="card-body rounded col-12">
              <div class="d-flex flex-row row-col-3 g-2 text-break">
                <div class="col text-left words-text" style="font-size: 1.25rem; line-height: 1.6;">
                  <strong class="text-primary" style="margin-right: 8px;">${v.v}</strong> ${v.t}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    // 3. Build Pre-rendered Navigation Buttons (Prev/Next Chapter)
    let navigationButtonsHtml = '';
    if (c > 1) {
      navigationButtonsHtml += `
        <div class="col-auto mr-auto">
          <a title="മുൻപത്തെ അദ്ധ്യായം" href="/${bookNum}/${c - 1}">
            <div class="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-left.svg" alt="prev" /></div>
          </a>
        </div>
      `;
    } else if (book.n > 1) {
      navigationButtonsHtml += `
        <div class="col-auto mr-auto">
          <a title="മുൻപത്തെ പുസ്തകം" href="/${book.n - 1}/1">
            <div class="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-left.svg" alt="prev" /></div>
          </a>
        </div>
      `;
    }

    if (c < totalChapters) {
      navigationButtonsHtml += `
        <div class="col-auto">
          <a title="അടുത്ത അദ്ധ്യായം" href="/${bookNum}/${c + 1}">
            <div class="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-right.svg" alt="next" /></div>
          </a>
        </div>
      `;
    } else if (book.n < 66) {
      navigationButtonsHtml += `
        <div class="col-auto">
          <a title="അടുത്ത പുസ്തകം" href="/${book.n + 1}/1">
            <div class="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-right.svg" alt="next" /></div>
          </a>
        </div>
      `;
    }

    const navigationContentHtml = `
      <div class="row row-2 justify-content-center mt-4">
        ${navigationButtonsHtml}
      </div>
    `;

    // Assemble page layout inside React container structure
    const fullPreRenderedHtml = `
      <section class="py-2 mb-5">
        <div class="container-fluid">
          <div class="row">
            <div class="col-lg-12">
              <section id="scroll-target">
                <div class="container my-2">
                  <div class="row row-cols-1 justify-content-center">
                    ${titleContentHtml}
                    ${versesCardsHtml}
                    ${navigationContentHtml}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    `;

    // Generate output HTML content
    const urlPath = `/${bookNum}/${chapterNum}`;
    const chapterHtmlContent = getModifiedHtml(template, pageTitle, pageDescription, urlPath, fullPreRenderedHtml);

    // Save to dist/43/4.html
    const chapterFilePath = path.join(bookDir, `${chapterNum}.html`);
    fs.writeFileSync(chapterFilePath, chapterHtmlContent, 'utf-8');
    pageCount++;

    // For chapter 1, copy to dist/43.html (so visiting /43 serves John 1)
    if (c === 1) {
      const bookFilePath = path.join(distDir, `${bookNum}.html`);
      const bookUrlPath = `/${bookNum}`;
      const bookHtmlContent = getModifiedHtml(template, `${bookNameML} - അദ്ധ്യായം 1`, pageDescription, bookUrlPath, fullPreRenderedHtml);
      fs.writeFileSync(bookFilePath, bookHtmlContent, 'utf-8');
      pageCount++;
    }
  }
});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`✅ SSG generation completed successfully!`);
console.log(`   - Total static pages generated: ${pageCount}`);
console.log(`   - Time elapsed: ${elapsed}s`);
