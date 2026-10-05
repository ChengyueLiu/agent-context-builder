# Component writer

## What it can do

Writes one component of the research codebase from the method spec and the code README. It cannot run anything.

## When to hand off

In Implementation's build stage, when the build has many independent components: one helper per component. A small build you write and run yourself.

## Briefing

- The component: its name and the interface `code/README.md` gives it (file, public function or CLI, inputs and outputs).
- What to read: `method/method_spec.md`, `code/README.md`, and any existing files the component depends on.
- The files it may write, and nothing else; project-relative paths only.
- The rules:
  - Implement the spec, not your idea of it. Where the spec is silent, choose the smallest reasonable thing and say so; do not invent behaviour the spec did not ask for.
  - The metrics contract is load-bearing: compute every metric the spec names and write it under exactly the key the spec uses. A renamed metric is a lost result.
  - Keep it runnable end to end: explicit imports, no placeholder bodies, no `TODO` where behaviour is required, no fabricated data paths (take paths as arguments or read them from the config the spec defines).
  - Seed anything random and make the seed a parameter.
  - Start with a short module docstring: what the component does and how it is invoked.
  - You cannot run code; a separate pass runs and tests what you write.

## What it returns

One line: the files written, the entry point (if any), anything the spec left ambiguous and how it was resolved, and anything it could not implement.

## How to check

Run each returned component yourself with `run_code` (an import check, a tiny driver or a unit test) before building on it; check that every metric key it writes matches the README's metrics contract verbatim; treat anything it could not implement as a declared stub until it is fixed.
