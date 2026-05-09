#!/usr/bin/env python3
"""Wrap ASCII diagrams as comment-ready text while preserving alignment."""

from __future__ import annotations

import argparse
import sys


def trim_trailing_blank_lines(lines: list[str]) -> list[str]:
    while lines and lines[-1] == "":
        lines.pop()
    return lines


def normalize_input(text: str) -> list[str]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return trim_trailing_blank_lines(lines)


def wrap_block(lines: list[str]) -> str:
    body = "\n".join(lines)
    if body:
        return f"/*\n{body}\n*/\n"
    return "/*\n*/\n"


def wrap_line(lines: list[str], prefix: str) -> str:
    return "".join(f"{prefix}{line}\n" for line in lines)


def wrap_markdown(lines: list[str]) -> str:
    body = "\n".join(lines)
    return f"```text\n{body}\n```\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Wrap ASCII diagrams for code comments or Markdown."
    )
    parser.add_argument(
        "--style",
        choices=("block", "line", "markdown"),
        default="block",
        help="Output wrapper style.",
    )
    parser.add_argument(
        "--prefix",
        default="# ",
        help="Prefix for --style line. Default: '# '.",
    )
    args = parser.parse_args()

    lines = normalize_input(sys.stdin.read())

    if args.style == "block":
        sys.stdout.write(wrap_block(lines))
    elif args.style == "line":
        sys.stdout.write(wrap_line(lines, args.prefix))
    else:
        sys.stdout.write(wrap_markdown(lines))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
