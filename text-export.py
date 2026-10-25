#!/usr/bin/env python3
"""Export a project page's text to an editable .txt file.

Each text block is written as `[tag LINE] text`, where LINE is the block's
line in the HTML, so edits can be mapped back to the page. Inline markup is
written as light Markdown: *em*, **strong**, _cite_, [text](url), [^1] for
footnote links, and a line break for <br>. Code blocks, alt text and the
lightbox are skipped.

Usage: python3 text-export.py project-one.html   (writes project-one.txt)
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HEADER = """\
# Text of {name}
#
# Rules:
# - Edit the text freely, but leave the [tag LINE] at the start of each block alone.
# - To add a paragraph, write it with no tag where it should go.
# - To delete a block, delete it entirely (tag included).
# - Inline marks: *em*  **strong**  _title of a work_  [link text](url)  [^1] footnote.
# - Lines starting with # are ignored.

"""

BLOCKS = {"p", "li", "figcaption", "h1", "h2", "h3"}
BR = "\x00"  # <br> marker, kept apart from source newlines
SKIP = {"pre", "script", "style", "title", "head"}


class Exporter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []          # (tag, line, text)
        self.cur = None        # [tag, line, parts]
        self.stack = []        # open elements: (name, attrs)
        self.skip = 0
        self.links = []        # open <a> hrefs
        self.ref_no = None
        self.in_ref_no = False

    def ancestors(self, cls=None, name=None):
        for n, a in self.stack:
            if name and n == name:
                return True
            if cls and cls in (a.get("class") or "").split():
                return True
        return False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("br", "img", "source", "meta", "link"):
            if tag == "br" and self.cur:
                self.cur[2].append(BR)
            return
        self.stack.append((tag, attrs))
        cls = (attrs.get("class") or "").split()
        if tag in SKIP or "lightbox" in cls or "page-nav" in cls:
            self.skip += 1
            return
        if self.skip:
            return
        if tag in BLOCKS and self.ancestors(name="main"):
            self.flush()
            self.cur = [self.kind(tag, cls), self.getpos()[0], []]
            self.ref_no = None
        elif not self.cur:
            return
        elif tag == "span" and "ref-no" in cls:
            self.in_ref_no = True
        elif tag in ("em", "i"):
            self.cur[2].append("*")
        elif tag in ("strong", "b"):
            self.cur[2].append("**")
        elif tag == "cite":
            self.cur[2].append("_")
        elif tag == "a":
            href = attrs.get("href", "")
            self.links.append(href)
            self.cur[2].append("[^" if href.startswith("#") else "[")

    def handle_endtag(self, tag):
        if tag in ("br", "img", "source", "meta", "link"):
            return
        # pop to the matching element
        while self.stack:
            name, attrs = self.stack.pop()
            cls = (attrs.get("class") or "").split()
            if name in SKIP or "lightbox" in cls or "page-nav" in cls:
                self.skip -= 1
            if name == tag:
                break
        if self.skip or not self.cur:
            return
        if tag == "span" and self.in_ref_no:
            self.in_ref_no = False
        elif tag in ("em", "i"):
            self.cur[2].append("*")
        elif tag in ("strong", "b"):
            self.cur[2].append("**")
        elif tag == "cite":
            self.cur[2].append("_")
        elif tag == "a" and self.links:
            href = self.links.pop()
            self.cur[2].append("]" if href.startswith("#") else f"]({href})")
        elif tag in BLOCKS:
            self.flush()

    def handle_data(self, data):
        if self.skip or not self.cur:
            return
        if self.in_ref_no:
            self.ref_no = data.strip()
            return
        self.cur[2].append(data)

    def kind(self, tag, cls):
        if tag == "figcaption":
            return "cap"
        if tag in ("h1", "h2", "h3"):
            return tag
        if self.ancestors(cls="int-bio") or self.ancestors(cls="int-next"):
            return "note" if "int-bio-note" in cls else "side"
        if "int-footnote" in cls:
            return "note"
        if self.ancestors(name="blockquote"):
            return "quote"
        return tag

    def flush(self):
        if not self.cur:
            return
        kind, line, parts = self.cur
        self.cur = None
        text = "".join(parts)
        text = "\n".join(re.sub(r"\s+", " ", seg).strip()
                         for seg in text.split(BR))
        text = text.strip()
        if kind == "cap" and self.ref_no:
            line = self.ref_no      # captions are keyed by their ref number
        if not text:
            return                  # empty block, or a ref-number-only caption/tile
        self.out.append((kind, line, text))


def main():
    args = [a for a in sys.argv[1:] if a != "--force"]
    src = Path(args[0] if args else "project-one.html")
    p = Exporter()
    p.feed(src.read_text(encoding="utf-8"))
    p.flush()
    lines = [HEADER.format(name=src.name)]
    for kind, line, text in p.out:
        if kind == "h2":
            lines.append("\n# ======================================================\n")
        prefix = {"h1": "# ", "h2": "# ", "h3": "## "}.get(kind, "")
        lines.append(f"[{kind} {line}] {prefix}{text}\n")
    dest = src.with_suffix(".txt")
    if dest.exists() and "--force" not in sys.argv:
        sys.exit(f"{dest} exists (it may hold unapplied edits); pass --force to overwrite")
    dest.write_text("\n".join(lines), encoding="utf-8")
    print(f"{len(p.out)} blocks → {dest}")


if __name__ == "__main__":
    main()
