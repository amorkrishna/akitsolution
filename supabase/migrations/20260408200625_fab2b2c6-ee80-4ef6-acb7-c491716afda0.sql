
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL DEFAULT 'in',
  quantity integer NOT NULL DEFAULT 0,
  reference_type text DEFAULT 'manual',
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inventory_movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inventory_movements" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inventory_movements" ON public.inventory_movements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete inventory_movements" ON public.inventory_movements FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON public.inventory_movements(movement_type);
