"""Temporary reference numbers on every image (000, 001, …), for talking about
them in chat. One sequence across the site: pages in index menu order, images
top to bottom. A photo shown twice (the Printmaking strip) keeps one number.
Banners are left out.

Run from the repo root after adding or moving images: python3 ref-numbers.py
It strips the old numbers first, so it can be run any number of times.

Each number goes in two places: a <span class="ref-no"> in the caption (under
each tile in a grid) and a "NNN · " prefix in the button's data-caption, which
the lightbox shows. To remove them for good: python3 ref-numbers.py --remove,
then delete the .ref-no rules in style.css, and this file.
"""
import re
import sys

PAGES = ["project-one", "project-two", "project-three-a", "project-four",
         "project-four-b", "project-five", "project-seven", "project-eight",
         "project-six"]

REF = re.compile(r'<span class="ref-no">\d+</span> ?')
FIGURE = re.compile(r'<figure\b.*?</figure>', re.S)
LI = re.compile(r'<li>.*?</li>', re.S)
MEDIA_SRC = re.compile(r'<(?:img|video)\b[^>]*?\b(?:src|poster)="([^"]+)"')
NUMBERED_CAPTION = re.compile(r'data-caption="\d{3}(?: · )?')


def strip(block):
    """Take out every number this script adds."""
    block = re.sub(r'\n\s*<span class="ref-no">\d+</span>(?=\n)', "", block)   # under a tile
    block = REF.sub("", block)
    block = re.sub(r'\n\s*<figcaption></figcaption>', "", block)
    block = NUMBERED_CAPTION.sub('data-caption="', block)
    return block.replace(' data-caption=""', "")


def caption_attr(block, n):
    """Prefix the button's data-caption with the number, adding it if missing."""
    if 'data-caption="' in block:
        block = block.replace('data-caption="', f'data-caption="{n} · ', 1)
        return block.replace(f'data-caption="{n} · "', f'data-caption="{n}"')
    return re.sub(r'(<button type="button" class="int-shot")',
                  rf'\1 data-caption="{n}"', block, count=1)


def main(remove):
    numbers = {}

    def number(src):
        if src not in numbers:
            numbers[src] = f"{len(numbers):03d}"
        return numbers[src]

    for page in PAGES:
        path = page + ".html"
        html = open(path).read()

        def figure(match):
            fig = strip(match.group(0))
            if 'class="banner"' in fig[:40] or remove:
                return fig
            if "<li>" in fig:                       # a grid: number each tile
                def tile(li):
                    t = li.group(0)
                    src = MEDIA_SRC.search(t)
                    if not src:
                        return t
                    n = number(src.group(1))
                    t = caption_attr(t, n)
                    return re.sub(r'(</button>)', rf'\1\n            <span class="ref-no">{n}</span>', t, count=1)
                return LI.sub(tile, fig)
            src = MEDIA_SRC.search(fig)
            if not src:                             # a quote
                return fig
            n = number(src.group(1))
            if "int-shot" in fig:
                fig = caption_attr(fig, n)
            if "<figcaption>" in fig:
                return fig.replace("<figcaption>", f'<figcaption><span class="ref-no">{n}</span> ', 1)
            indent = re.search(r'\n(\s*)</figure>$', fig).group(1)
            return re.sub(r'\n(\s*)</figure>$',
                          f'\n{indent}  <figcaption><span class="ref-no">{n}</span></figcaption>\n{indent}</figure>', fig)

        out = FIGURE.sub(figure, html)
        if out != html:
            open(path, "w").write(out)

    if not remove:
        print(f"{len(numbers)} images numbered 000–{len(numbers) - 1:03d}")


if __name__ == "__main__":
    main("--remove" in sys.argv)
