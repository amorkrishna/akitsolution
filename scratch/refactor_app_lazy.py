import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace static imports with lazy imports
def replacer(match):
    name = match.group(1)
    path = match.group(2)
    return f"const {name} = lazy(() => import('{path}'));"

new_content = re.sub(r'import (\w+) from "\./pages/(\w+)";', lambda m: f"const {m.group(1)} = lazy(() => import('./pages/{m.group(2)}'));", content)

# Add lazy, Suspense to react import
new_content = new_content.replace('import { useEffect, useState } from "react";', 'import { useEffect, useState, lazy, Suspense } from "react";')

# Wrap Routes with Suspense
suspense_wrapper = """      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
        <Routes>"""
new_content = new_content.replace('<Routes>', suspense_wrapper)
new_content = new_content.replace('</Routes>', '</Routes>\n      </Suspense>')

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)
