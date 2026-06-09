import os

store_path = "src/pages/Store.tsx"
features_path = "src/components/store/StoreFeatures.tsx"

with open(store_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

why_choose_us_start = -1
how_it_works_end = -1

for i, line in enumerate(lines):
    if "{/* WHY CHOOSE US — Premium card design */}" in line:
        why_choose_us_start = i
    if "{/* Portfolio / Our Projects Section */}" in line:
        how_it_works_end = i
        break

if why_choose_us_start != -1 and how_it_works_end != -1:
    feature_lines = "".join(lines[why_choose_us_start:how_it_works_end])
    
    with open(features_path, "w", encoding="utf-8") as f:
        f.write("import { ShieldCheck, Headphones, Truck, Award, Zap, Search, ShoppingCart, Wrench } from 'lucide-react';\n\n")
        f.write("export function StoreFeatures({\n")
        f.write("  isDark, t, lang, textPrimary, textSecondary, textMuted, sectionBg, featureCardBg\n")
        f.write("}: any) {\n")
        f.write("  return (\n    <>\n")
        f.write(feature_lines)
        f.write("    </>\n  );\n")
        f.write("}\n")
    
    new_store_lines = (
        lines[0:why_choose_us_start] +
        ["      <StoreFeatures isDark={isDark} t={t} lang={lang} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} sectionBg={sectionBg} featureCardBg={featureCardBg} />\n"] +
        lines[how_it_works_end:]
    )
    
    for i, line in enumerate(new_store_lines):
        if line.startswith("import { StoreFooter"):
            new_store_lines.insert(i+1, "import { StoreFeatures } from '@/components/store/StoreFeatures';\n")
            break
            
    with open(store_path, "w", encoding="utf-8") as f:
        f.writelines(new_store_lines)
        
    print("Features extraction successful!")
else:
    print("Could not find Features boundaries.")
