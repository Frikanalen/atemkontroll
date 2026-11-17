#!/bin/sh
# Checks that a commit or pull request title follows Conventional Commits:
#   type(optional scope)!: description
# release-please reads these to decide the next version and write the
# changelog: feat gives a minor release, fix a patch, "!" a breaking one.
title="$1"
types='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
if printf '%s\n' "$title" | grep -Eq "^($types)(\([a-z0-9-]+\))?!?: [^ ].*[^.]$"; then
  exit 0
fi
echo "Not a Conventional Commits title: $title" >&2
echo "Write it as type: description, for example \"feat: tide tables page\"." >&2
echo "Types: $(echo "$types" | tr '|' ' ')" >&2
exit 1
