-- 1. Add likes_count column to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;

-- 2. Create organization_likes table
CREATE TABLE IF NOT EXISTS public.organization_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- 3. Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_likes_org_id ON public.organization_likes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_likes_user_id ON public.organization_likes(user_id);

-- 4. Enable RLS on organization_likes
ALTER TABLE public.organization_likes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for organization_likes
-- Anyone can see likes
CREATE POLICY "Lectura publica de likes"
ON public.organization_likes FOR SELECT
USING (true);

-- Users can only insert their own likes
CREATE POLICY "Usuarios insertan sus propios likes"
ON public.organization_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Usuarios borran sus propios likes"
ON public.organization_likes FOR DELETE
USING (auth.uid() = user_id);

-- 6. Trigger functionality to auto-update likes_count in organizations
CREATE OR REPLACE FUNCTION sp_update_org_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.organizations
        SET likes_count = likes_count + 1
        WHERE id = NEW.org_id;
        
        -- Si llega a 50 likes, hacerlo publico y verificado automaticamente
        UPDATE public.organizations
        SET is_public = TRUE, status = 'VERIFIED'
        WHERE id = NEW.org_id AND likes_count >= 50 AND is_public = FALSE;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.organizations
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.org_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS trg_update_org_likes_count ON public.organization_likes;

-- Create trigger
CREATE TRIGGER trg_update_org_likes_count
AFTER INSERT OR DELETE ON public.organization_likes
FOR EACH ROW EXECUTE PROCEDURE sp_update_org_likes_count();

-- 7. Grant permissions
GRANT SELECT, INSERT, DELETE ON public.organization_likes TO authenticated;
GRANT SELECT ON public.organization_likes TO anon;
