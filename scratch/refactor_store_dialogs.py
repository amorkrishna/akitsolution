import re

with open("src/pages/Store.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
imports = """import { StoreCartDrawer } from '@/components/store/StoreCartDrawer';
import { StoreCheckoutDialog } from '@/components/store/StoreCheckoutDialog';
"""

# Insert imports after import { StoreSearchDialog }
content = content.replace("import { StoreSearchDialog } from '@/components/store/StoreSearchDialog';", 
                          "import { StoreSearchDialog } from '@/components/store/StoreSearchDialog';\n" + imports)

# Remove the paymentMethods definition (lines 470-477)
content = re.sub(r'  const paymentMethods = \[\n.*?  \];\n', '', content, flags=re.DOTALL)

# Replace Cart Drawer
cart_pattern = r'      \{\/\* Cart Drawer \*\/}.*?      </Dialog>'
cart_replacement = """      {/* Cart Drawer */}
      <StoreCartDrawer
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        setCheckoutOpen={setCheckoutOpen}
        isDark={isDark}
        lang={lang}
      />"""
content = re.sub(cart_pattern, cart_replacement, content, count=1, flags=re.DOTALL)

# Replace Checkout Dialog
checkout_pattern = r'      \{\/\* Checkout Dialog \*\/}.*?      </Dialog>'
checkout_replacement = """      {/* Checkout Dialog */}
      <StoreCheckoutDialog
        checkoutOpen={checkoutOpen}
        setCheckoutOpen={setCheckoutOpen}
        checkoutForm={checkoutForm}
        setCheckoutForm={setCheckoutForm}
        checkoutMutation={checkoutMutation}
        isDark={isDark}
        lang={lang}
        settings={settings}
      />"""
content = re.sub(checkout_pattern, checkout_replacement, content, count=1, flags=re.DOTALL)

with open("src/pages/Store.tsx", "w", encoding="utf-8") as f:
    f.write(content)
