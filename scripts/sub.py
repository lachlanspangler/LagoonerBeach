"""Exact-substring replace that FAILS LOUDLY if the old text is missing (avoids silent no-op edits).
usage: python3 -I scripts/sub.py <file> <<'X'  then blocks separated by lines '=====' : old \n----- \n new"""
import sys
p = sys.argv[1]; s = open(p).read(); spec = sys.stdin.read()
if spec.endswith('\n'): spec = spec[:-1]  # heredoc's final newline is not part of the last block
for block in spec.split('\n=====\n'):
    if not block.strip(): continue
    old, new = block.split('\n-----\n')
    if old not in s: sys.exit(f'sub.py: NOT FOUND in {p}:\n{old[:200]}')
    s = s.replace(old, new, 1)
open(p, 'w').write(s); print('ok', p)
