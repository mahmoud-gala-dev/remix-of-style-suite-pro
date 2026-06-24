-- Cycle #22 — Marketing Campaigns
-- Builds on notification_jobs queue + Twilio WhatsApp + Resend email already wired.

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','push')),
  segment text NOT NULL CHECK (segment IN ('all','vip','inactive_30d','birthdays_this_month','custom')),
  subject text,
  body text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  recipient_count int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage campaigns in their branches"
ON public.campaigns FOR ALL TO authenticated
USING (public.user_has_branch(auth.uid(), branch_id))
WITH CHECK (public.user_has_branch(auth.uid(), branch_id));

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_campaigns_branch_status ON public.campaigns(branch_id, status, scheduled_at);

CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view recipients of their branch campaigns"
ON public.campaign_recipients FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.campaigns c
               WHERE c.id = campaign_id AND public.user_has_branch(auth.uid(), c.branch_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c
                    WHERE c.id = campaign_id AND public.user_has_branch(auth.uid(), c.branch_id)));

CREATE INDEX idx_campaign_recipients_campaign_status ON public.campaign_recipients(campaign_id, status);