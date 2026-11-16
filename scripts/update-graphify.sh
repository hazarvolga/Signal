#!/bin/bash

# Helper to trigger AST+Semantic map update safely.

echo "🚀 Updating Graphify Map..."
uv run --python 3.11 --with graphifyy python -c "
import sys, json
from pathlib import Path
from graphify.extract import collect_files, extract
# 1. Detect & Extract structural code AST
detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text())
code_files = []
for f in detect.get('files', {}).get('code', []):
    p = Path(f)
    code_files.extend(collect_files(p) if p.is_dir() else [p])
if code_files:
    result = extract(code_files, cache_root=Path('.'))
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps(result, indent=2))
else:
    print('No code files found.')
    sys.exit(0)
"

# 2. Merge Structural (AST) + Semantic (Manual) & Build HTML
uv run --python 3.11 --with graphifyy python graphify-out/merge_and_build.py
uv run --python 3.11 --with graphifyy python graphify-out/step6.py

echo "✅ Graphify Map update complete!"

