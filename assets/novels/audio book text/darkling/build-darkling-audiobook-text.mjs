import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(outputDir, "..", "..", "..", "..");
const sourceDir = path.join(repoRoot, "read", "darkling");
const pronunciationPath = path.join(outputDir, "pronunciations.json");

const chapters = [
  { source: "prologue.html", output: "01-prologue.txt", title: "Prologue" },
  {
    source: "chapter-1-the-fire.html",
    output: "02-chapter-1-the-fire.txt",
    title: "Chapter One. The Fire.",
  },
  {
    source: "chapter-2-the-passage.html",
    output: "03-chapter-2-the-passage.txt",
    title: "Chapter Two. The Passage.",
  },
  {
    source: "chapter-3-the-cavern.html",
    output: "04-chapter-3-the-cavern.txt",
    title: "Chapter Three. The Cavern.",
  },
  {
    source: "chapter-4-the-darkwood.html",
    output: "05-chapter-4-the-darkwood.txt",
    title: "Chapter Four. The Darkwood.",
  },
  {
    source: "chapter-5-idlewood.html",
    output: "06-chapter-5-idlewood.txt",
    title: "Chapter Five. Idlewood.",
  },
  {
    source: "chapter-6-the-reckoning.html",
    output: "07-chapter-6-the-reckoning.txt",
    title: "Chapter Six. The Reckoning.",
  },
  {
    source: "chapter-7-the-charge.html",
    output: "08-chapter-7-the-charge.txt",
    title: "Chapter Seven. The Charge.",
  },
  {
    source: "chapter-8-after.html",
    output: "09-chapter-8-after.txt",
    title: "Chapter Eight. After.",
  },
];

const pause = (seconds) => `[[pause:${seconds.toFixed(2)}]]`;

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function extractNarrativeBlocks(html, sourceName) {
  const articleStart = html.search(
    /<article\b[^>]*class=["'][^"']*\breader-article\b[^"']*["'][^>]*>/i,
  );
  const navigationStart = html.search(
    /<div\b[^>]*class=["'][^"']*\breader-bottom-nav\b[^"']*["'][^>]*>/i,
  );

  if (articleStart < 0 || navigationStart < 0 || navigationStart <= articleStart) {
    throw new Error(`Could not isolate narrative content in ${sourceName}`);
  }

  const narrative = html.slice(articleStart, navigationStart);
  const tokenPattern =
    /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>|<div\b[^>]*class=["'][^"']*\bscene-break\b[^"']*["'][^>]*><\/div>/gi;
  const blocks = [];

  for (const match of narrative.matchAll(tokenPattern)) {
    if (match[1] !== undefined) {
      const text = decodeHtml(match[1]);
      if (text) {
        blocks.push({ type: "paragraph", text });
      }
    } else {
      blocks.push({ type: "scene-break" });
    }
  }

  if (!blocks.some((block) => block.type === "paragraph")) {
    throw new Error(`No narrative paragraphs found in ${sourceName}`);
  }

  return blocks;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyPronunciations(text, terms) {
  let spoken = text;
  const replacements = [...terms]
    .filter((term) => term.written && term.spoken && term.written !== term.spoken)
    .sort((left, right) => right.written.length - left.written.length);

  for (const term of replacements) {
    const pattern = new RegExp(`\\b${escapeRegex(term.written)}\\b`, "g");
    spoken = spoken.replace(pattern, term.spoken);
  }
  return spoken;
}

function applyTonePacing(text) {
  return text
    .replace(/(…|\.{3})\s+/g, (match, mark) => `${mark} ${pause(0.3)} `)
    .replace(/\s+—\s+/g, ` — ${pause(0.18)} `)
    .replace(/;\s+/g, `; ${pause(0.16)} `)
    .replace(/:\s+(?=[A-Za-z"“])/g, `: ${pause(0.18)} `)
    .replace(
      /([.!?]["”']?)\s+(?=(?:But|Then|Still|Yet|Instead|Now|Not|Only|Except)\b)/g,
      `$1 ${pause(0.22)} `,
    );
}

function paragraphPause(text) {
  const trimmed = text.trim();
  const length = trimmed.length;
  const dialogue = /^["“].*["”]$/.test(trimmed);

  if (length <= 24) return 0.72;
  if (length <= 55) return 0.58;
  if (dialogue) return 0.4;
  if (/[!?]["”']?$/.test(trimmed)) return 0.5;
  if (length <= 110) return 0.46;
  return 0.34;
}

function renderChapter(chapter, blocks, terms) {
  const lines = [chapter.title, pause(1.2), ""];
  let paragraphCount = 0;
  let sceneBreakCount = 0;
  let structuralPauseCount = 1;
  let tonePauseCount = 0;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const next = blocks[index + 1];

    if (block.type === "scene-break") {
      lines.push(pause(1.8), "");
      sceneBreakCount += 1;
      structuralPauseCount += 1;
      continue;
    }

    const pacedText = applyTonePacing(applyPronunciations(block.text, terms));
    lines.push(pacedText, "");
    tonePauseCount += (
      pacedText.match(/\[\[pause:\d+(?:\.\d+)?\]\]/g) ?? []
    ).length;
    paragraphCount += 1;

    if (!next) {
      lines.push(pause(2.5), "");
      structuralPauseCount += 1;
    } else if (next.type !== "scene-break") {
      lines.push(pause(paragraphPause(block.text)), "");
      structuralPauseCount += 1;
    }
  }

  const text = `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
  return {
    text,
    paragraphCount,
    sceneBreakCount,
    structuralPauseCount,
    tonePauseCount,
    pauseCount: structuralPauseCount + tonePauseCount,
  };
}

const pronunciationData = JSON.parse(fs.readFileSync(pronunciationPath, "utf8"));
const terms = pronunciationData.terms ?? [];
const manifestChapters = [];
const renderedChapters = [];

const pronunciationCheck = [
  "Darkling pronunciation check.",
  pause(0.7),
  "",
  ...terms.flatMap((term) => [
    `${term.spoken}.`,
    pause(0.45),
    "",
  ]),
].join("\n");
fs.writeFileSync(
  path.join(outputDir, "pronunciation-check.txt"),
  `${pronunciationCheck.trim()}\n`,
  "utf8",
);

for (const chapter of chapters) {
  const sourcePath = path.join(sourceDir, chapter.source);
  const html = fs.readFileSync(sourcePath, "utf8");
  const blocks = extractNarrativeBlocks(html, chapter.source);
  const rendered = renderChapter(chapter, blocks, terms);
  const outputPath = path.join(outputDir, chapter.output);

  fs.writeFileSync(outputPath, rendered.text, "utf8");
  renderedChapters.push(rendered.text.trim());
  manifestChapters.push({
    source: path.relative(repoRoot, sourcePath).replaceAll("\\", "/"),
    output: chapter.output,
    title: chapter.title,
    paragraphs: rendered.paragraphCount,
    scene_breaks: rendered.sceneBreakCount,
    structural_pauses: rendered.structuralPauseCount,
    tone_pauses: rendered.tonePauseCount,
    pauses: rendered.pauseCount,
    words: rendered.text
      .replace(/\[\[pause:\d+(?:\.\d+)?\]\]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length,
    sha256: crypto.createHash("sha256").update(rendered.text).digest("hex"),
  });
}

const frontMatter = [
  "Darkling.",
  pause(0.9),
  "",
  "Book One: Ever-tare-uh.",
  pause(1.2),
  "",
  "By Elias Marrow.",
  pause(1.8),
  "",
].join("\n");
const completeText = `${frontMatter}${renderedChapters.join("\n\n")}\n`;
const completePath = path.join(outputDir, "darkling-audiobook.txt");
fs.writeFileSync(completePath, completeText, "utf8");

const manifest = {
  schema: "elias-marrow/audiobook-text/v1",
  title: "Darkling — Book I: Everterra",
  spoken_title: "Darkling — Book One: Ever-tare-uh",
  author: "Elias Marrow",
  source_root: "read/darkling",
  pronunciation_file: "pronunciations.json",
  pronunciation_check: "pronunciation-check.txt",
  complete_output: "darkling-audiobook.txt",
  chapters: manifestChapters,
  totals: {
    chapters: manifestChapters.length,
    paragraphs: manifestChapters.reduce((sum, item) => sum + item.paragraphs, 0),
    scene_breaks: manifestChapters.reduce((sum, item) => sum + item.scene_breaks, 0),
    structural_pauses:
      manifestChapters.reduce((sum, item) => sum + item.structural_pauses, 0) + 3,
    tone_pauses: manifestChapters.reduce((sum, item) => sum + item.tone_pauses, 0),
    pauses:
      manifestChapters.reduce((sum, item) => sum + item.pauses, 0) + 3,
    words: manifestChapters.reduce((sum, item) => sum + item.words, 0) + 9,
  },
  sha256: crypto.createHash("sha256").update(completeText).digest("hex"),
};

fs.writeFileSync(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      output: path.relative(repoRoot, completePath).replaceAll("\\", "/"),
      ...manifest.totals,
      pronunciations: terms.length,
      sha256: manifest.sha256,
    },
    null,
    2,
  ),
);
