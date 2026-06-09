import os

store_path = "src/pages/Store.tsx"
footer_path = "src/components/store/StoreFooter.tsx"

with open(store_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

footer_start = -1
footer_end = -1

for i, line in enumerate(lines):
    if "<footer id=\"contact-section\"" in line:
        footer_start = i
    if "</footer>" in line:
        footer_end = i + 1
        break

if footer_start != -1 and footer_end != -1:
    footer_lines = "".join(lines[footer_start:footer_end])
    
    with open(footer_path, "w", encoding="utf-8") as f:
        f.write("import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';\n")
        f.write("import { categoryNav } from './StoreConstants';\n\n")
        f.write("export function StoreFooter({\n")
        f.write("  isDark, logoSrc, settings, textPrimary, textMuted, customFooterText, t, socialLinks,\n")
        f.write("  setCategoryFilter, setActiveTab, lang\n")
        f.write("}: any) {\n")
        f.write("  return (\n")
        f.write(footer_lines)
        f.write("  );\n")
        f.write("}\n")
    
    new_store_lines = (
        lines[0:footer_start] +
        ["      <StoreFooter isDark={isDark} logoSrc={logoSrc} settings={settings} textPrimary={textPrimary} textMuted={textMuted} customFooterText={customFooterText} t={t} socialLinks={socialLinks} setCategoryFilter={setCategoryFilter} setActiveTab={setActiveTab} lang={lang} />\n"] +
        lines[footer_end:]
    )
    
    # insert import
    for i, line in enumerate(new_store_lines):
        if line.startswith("import { AutoSlidingTabs"):
            new_store_lines.insert(i+1, "import { StoreFooter } from '@/components/store/StoreFooter';\n")
            break
            
    with open(store_path, "w", encoding="utf-8") as f:
        f.writelines(new_store_lines)
        
    print("Footer extraction successful!")
else:
    print("Could not find Footer boundaries.")
