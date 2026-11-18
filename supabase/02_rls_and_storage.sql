-- ============================================================================
-- 02_rls_and_storage.sql – Row Level Security politiky a Supabase Storage
-- Spusťte v Supabase SQL Editoru ihned po 01_schema.sql.
-- ============================================================================

-- Pomocné bezpečnostní funkce (SECURITY DEFINER zamezuje rekurzi v RLS)
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_broadcast(target_broadcast_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.broadcasts b
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE b.id = target_broadcast_id
          AND p.is_active = true
          AND (
              p.role = 'admin'
              OR b.is_restricted = false
              OR EXISTS (
                  SELECT 1 FROM public.broadcast_journalists bj
                  WHERE bj.broadcast_id = b.id AND bj.user_id = p.id
              )
          )
    );
$$;

-- ============================================================================
-- ZAPNUTÍ RLS NA VŠECH TABULKÁCH
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_journalists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIKY: public.profiles
-- ============================================================================
-- Veřejnost i redakce mohou číst jméno autora pro zobrazení u příspěvků
CREATE POLICY "profiles_select_all"
    ON public.profiles FOR SELECT
    USING (true);

-- Vlastní jméno si může upravit uživatel sám, vše ostatní jen admin
CREATE POLICY "profiles_update_self_or_admin"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- ============================================================================
-- POLITIKY: public.broadcasts
-- ============================================================================
-- Veřejnost vidí nearchivované přenosy; redakce vidí všechny včetně archivovaných
CREATE POLICY "broadcasts_select_public_or_staff"
    ON public.broadcasts FOR SELECT
    USING (is_archived = false OR public.is_active_staff());

-- Pouze administrátor zakládá, upravuje a maže přenosy
CREATE POLICY "broadcasts_insert_admin"
    ON public.broadcasts FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "broadcasts_update_admin"
    ON public.broadcasts FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "broadcasts_delete_admin"
    ON public.broadcasts FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- POLITIKY: public.broadcast_journalists
-- ============================================================================
CREATE POLICY "bj_select_staff"
    ON public.broadcast_journalists FOR SELECT
    USING (public.is_active_staff());

CREATE POLICY "bj_manage_admin"
    ON public.broadcast_journalists FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- POLITIKY: public.posts
-- ============================================================================
-- 1. Čtení: veřejnost čte jen publikované nesmazané příspěvky; redakce vidí i koncepty a stažené
CREATE POLICY "posts_select_published_or_staff"
    ON public.posts FOR SELECT
    USING (
        (
            status = 'published'
            AND deleted_at IS NULL
            AND EXISTS (
                SELECT 1 FROM public.broadcasts b
                WHERE b.id = posts.broadcast_id AND b.is_archived = false
            )
        )
        OR (
            deleted_at IS NULL
            AND public.can_edit_broadcast(broadcast_id)
        )
        OR public.is_admin()
    );

-- 2. Vkládání: pouze aktivní člen redakce s přístupem k přenosu, author_id musí odpovídat přihlášenému
CREATE POLICY "posts_insert_staff"
    ON public.posts FOR INSERT
    WITH CHECK (
        author_id = auth.uid()
        AND public.can_edit_broadcast(broadcast_id)
    );

-- 3. Úpravy (včetně soft-delete): admin může upravit vše, novinář pouze vlastní příspěvky
CREATE POLICY "posts_update_owner_or_admin"
    ON public.posts FOR UPDATE
    USING (
        public.is_admin()
        OR (author_id = auth.uid() AND public.can_edit_broadcast(broadcast_id))
    )
    WITH CHECK (
        public.is_admin()
        OR (author_id = auth.uid() AND public.can_edit_broadcast(broadcast_id))
    );

-- 4. Fyzické smazání (DELETE) zakázáno pro novináře – používá se soft delete (deleted_at)
CREATE POLICY "posts_delete_admin_only"
    ON public.posts FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- POLITIKY: public.post_media
-- ============================================================================
CREATE POLICY "post_media_select_public_or_staff"
    ON public.post_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_media.post_id
              AND (
                  (p.status = 'published' AND p.deleted_at IS NULL)
                  OR public.can_edit_broadcast(p.broadcast_id)
              )
        )
    );

CREATE POLICY "post_media_insert_staff"
    ON public.post_media FOR INSERT
    WITH CHECK (public.can_edit_broadcast(broadcast_id));

CREATE POLICY "post_media_update_staff"
    ON public.post_media FOR UPDATE
    USING (public.can_edit_broadcast(broadcast_id))
    WITH CHECK (public.can_edit_broadcast(broadcast_id));

CREATE POLICY "post_media_delete_staff"
    ON public.post_media FOR DELETE
    USING (public.can_edit_broadcast(broadcast_id));

-- ============================================================================
-- POLITIKY: public.post_revisions
-- ============================================================================
CREATE POLICY "post_revisions_select_staff"
    ON public.post_revisions FOR SELECT
    USING (public.is_admin() OR public.can_edit_broadcast(broadcast_id));

-- ============================================================================
-- SUPABASE STORAGE: BUCKET 'broadcast-media' A JEHO POLITIKY
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'broadcast-media',
    'broadcast-media',
    true,
    10485760, -- 10 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Veřejné čtení obrázků
CREATE POLICY "storage_media_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'broadcast-media');

-- Nahrávání pouze aktivním novinářům a administrátorům
CREATE POLICY "storage_media_staff_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'broadcast-media'
        AND public.is_active_staff()
    );

-- Mazání souborů pouze aktivním novinářům a administrátorům
CREATE POLICY "storage_media_staff_delete"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'broadcast-media'
        AND public.is_active_staff()
    );
