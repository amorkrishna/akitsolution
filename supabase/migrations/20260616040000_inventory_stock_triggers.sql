-- 1. Trigger function for purchase_items
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity - OLD.quantity
        WHERE id = OLD.product_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.product_id != OLD.product_id THEN
            -- Decrement old product
            UPDATE public.products
            SET stock_quantity = stock_quantity - OLD.quantity
            WHERE id = OLD.product_id;
            -- Increment new product
            UPDATE public.products
            SET stock_quantity = stock_quantity + NEW.quantity
            WHERE id = NEW.product_id;
        ELSE
            -- Same product, just adjust difference
            UPDATE public.products
            SET stock_quantity = stock_quantity - OLD.quantity + NEW.quantity
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_purchase ON public.purchase_items;
CREATE TRIGGER trigger_update_stock_on_purchase
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
FOR EACH ROW EXECUTE FUNCTION update_stock_on_purchase();


-- 2. Trigger function for sales
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity - NEW.quantity
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity + OLD.quantity
            WHERE id = OLD.product_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert old quantity if there was an old product
        IF OLD.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity + OLD.quantity
            WHERE id = OLD.product_id;
        END IF;
        -- Apply new quantity if there is a new product
        IF NEW.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity - NEW.quantity
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON public.sales;
CREATE TRIGGER trigger_update_stock_on_sale
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();


-- 3. Trigger function for invoice_items
CREATE OR REPLACE FUNCTION update_stock_on_invoice_item()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity - NEW.quantity
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity + OLD.quantity
            WHERE id = OLD.product_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert old quantity
        IF OLD.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity + OLD.quantity
            WHERE id = OLD.product_id;
        END IF;
        -- Apply new quantity
        IF NEW.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity - NEW.quantity
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_invoice_item ON public.invoice_items;
CREATE TRIGGER trigger_update_stock_on_invoice_item
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION update_stock_on_invoice_item();
