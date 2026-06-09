import os

store_path = "src/pages/Store.tsx"
dialog_path = "src/components/store/StoreSearchDialog.tsx"

with open(store_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

dialog_start = -1
dialog_end = -1

for i, line in enumerate(lines):
    if "{/* Search Overlay Dialog */}" in line:
        dialog_start = i
    if "{/* Message Dialog */}" in line:
        dialog_end = i
        break

if dialog_start != -1 and dialog_end != -1:
    dialog_lines = "".join(lines[dialog_start:dialog_end])
    
    with open(dialog_path, "w", encoding="utf-8") as f:
        f.write("import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';\n")
        f.write("import { Input } from '@/components/ui/input';\n")
        f.write("import { Search, Sparkles, Package, Wrench, Boxes, MessageCircle, Heart, FileText, MoveRight } from 'lucide-react';\n")
        f.write("import { openWhatsApp } from '@/lib/whatsapp';\n\n")
        f.write("export function StoreSearchDialog({\n")
        f.write("  searchOpen, setSearchOpen, search, setSearch, searchScope, setSearchScope, activeIndex, setActiveIndex,\n")
        f.write("  lang, isDark, textMuted, inputBg, dialogBg, products, services, packages, settings, textPrimary\n")
        f.write("}: any) {\n")
        f.write("  return (\n    <>\n")
        f.write(dialog_lines)
        f.write("    </>\n  );\n")
        f.write("}\n")
    
    new_store_lines = (
        lines[0:dialog_start] +
        ["      <StoreSearchDialog searchOpen={searchOpen} setSearchOpen={setSearchOpen} search={search} setSearch={setSearch} searchScope={searchScope} setSearchScope={setSearchScope} activeIndex={activeIndex} setActiveIndex={setActiveIndex} lang={lang} isDark={isDark} textMuted={textMuted} inputBg={inputBg} dialogBg={dialogBg} products={products} services={services} packages={packages} settings={settings} textPrimary={textPrimary} />\n"] +
        lines[dialog_end:]
    )
    
    for i, line in enumerate(new_store_lines):
        if line.startswith("import { StoreFeatures"):
            new_store_lines.insert(i+1, "import { StoreSearchDialog } from '@/components/store/StoreSearchDialog';\n")
            break
            
    with open(store_path, "w", encoding="utf-8") as f:
        f.writelines(new_store_lines)
        
    print("SearchDialog extraction successful!")
else:
    print("Could not find SearchDialog boundaries.")
