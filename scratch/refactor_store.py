import os

store_path = "src/pages/Store.tsx"
constants_path = "src/components/store/StoreConstants.ts"
helpers_path = "src/components/store/StoreHelpers.tsx"

with open(store_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

constants_start = -1
helpers_start = -1
store_start = -1

for i, line in enumerate(lines):
    if line.startswith("const categoryNav"):
        constants_start = i
    if line.startswith("function AutoSlidingTabs"):
        helpers_start = i
    if line.startswith("export default function Store"):
        store_start = i
        break

if constants_start != -1 and helpers_start != -1 and store_start != -1:
    imports = "".join(lines[0:constants_start])
    constants = "".join(lines[constants_start:helpers_start])
    helpers = "".join(lines[helpers_start:store_start])
    
    # StoreConstants.ts
    with open(constants_path, "w", encoding="utf-8") as f:
        f.write("import { Package, Camera, HardDrive, Monitor, Laptop, Cpu, Router, Cable, Printer, Keyboard, Server, CheckCheck, Zap, Headphones, Globe, Boxes, Sparkles, Wrench } from 'lucide-react';\n\n")
        f.write(constants.replace("const categoryNav", "export const categoryNav")
                .replace("const translations", "export const translations")
                .replace("const sectionCards", "export const sectionCards")
                .replace("const serviceSubcategories", "export const serviceSubcategories"))
        
    # StoreHelpers.tsx
    with open(helpers_path, "w", encoding="utf-8") as f:
        f.write("import { useState } from 'react';\n")
        f.write("import { Input } from '@/components/ui/input';\n")
        f.write("import { Button } from '@/components/ui/button';\n")
        f.write("import { Label } from '@/components/ui/label';\n")
        f.write("import { toast } from 'sonner';\n")
        f.write("import { supabase } from '@/integrations/supabase/client';\n")
        f.write("import { ArrowRightLeft, Camera, Cpu, Globe, HardDrive, Headphones, Keyboard, Laptop, Monitor, Printer, Router, Server, Zap, Wrench } from 'lucide-react';\n\n")
        f.write(helpers.replace("function AutoSlidingTabs", "export function AutoSlidingTabs")
                .replace("function PortfolioGallery", "export function PortfolioGallery")
                .replace("function UnifiedRequestForm", "export function UnifiedRequestForm"))
    
    # Update Store.tsx
    new_store_lines = (
        lines[0:constants_start] +
        ["import { categoryNav, translations, sectionCards, serviceSubcategories } from '@/components/store/StoreConstants';\n"] +
        ["import { AutoSlidingTabs, PortfolioGallery, UnifiedRequestForm } from '@/components/store/StoreHelpers';\n"] +
        lines[store_start:]
    )
    
    with open(store_path, "w", encoding="utf-8") as f:
        f.writelines(new_store_lines)
    
    print("Extraction successful!")
else:
    print(f"Could not find boundaries. constants:{constants_start}, helpers:{helpers_start}, store:{store_start}")
