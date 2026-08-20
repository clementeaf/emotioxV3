# Agent Rules

Fixes should make the system simpler, not more complex. Prefer removing or consolidating code over adding a new layer, flag, or special case. If a fix grows the system's surface area, look for the version that shrinks it.

Never leave comments in the repo. The standard is zero comments: no explanatory comments or docblocks, TODO/FIXME notes, lint/type suppression directives, or commented-out code. Express intent through names, structure, and tests; put rationale in commit messages or PR descriptions. Interpreter shebangs are executable directives, not comments.
