# Darkling audiobook text

This folder contains a narration-ready copy of **Darkling — Book I: Everterra**.
The published novel and its canonical chapter HTML remain unchanged.

## Files

- `darkling-audiobook.txt` — the complete book in reading order.
- `01-prologue.txt` through `09-chapter-8-after.txt` — chapter-sized narration files.
- `pronunciation-check.txt` — a short listen-through of every name in the lexicon.
- `pronunciations.json` — the spoken forms used for uncommon names and places.
- `manifest.json` — generated chapter, word, pause, and checksum metadata.
- `build-darkling-audiobook-text.mjs` — rebuilds the narration files from the
  canonical HTML in `read/darkling`.

## Narration format

The local VibeVoice Books reader recognizes pause markers in this form:

```text
[[pause:0.65]]
```

The marker becomes exact silence and is not spoken. The generated script uses:

- short pauses after dialogue and ordinary paragraphs;
- longer pauses after short dramatic paragraphs;
- subtle tone-turn pauses inside paragraphs at authored em dashes, semicolons,
  colons, ellipses, and selected sentence pivots such as “But,” “Then,” and “Yet”;
- 1.8-second pauses at authored scene breaks;
- 1.2-second pauses after chapter headings;
- 2.5-second pauses at chapter endings.

The prose itself is preserved. Emotional delivery comes from the original sentence
rhythm, dialogue, punctuation, paragraph structure, and small exact pauses at tonal
turns rather than spoken stage directions.

## Pronunciation

The world name is rendered as `Ever-tare-uh`, following the author’s direction:
**Ever — Tare — Uh** (“tear” as in tearing a shirt). Other uncommon names are converted using
`pronunciations.json`. Change a `spoken` value there and rerun the builder to adjust
future narration copies without editing the novel.

Run `pronunciation-check.txt` before generating the whole book. If any name should
sound different, update its `spoken` value and rebuild.

## Rebuild

From the Elias Marrow repository root:

```powershell
node "assets/novels/audio book text/darkling/build-darkling-audiobook-text.mjs"
```
