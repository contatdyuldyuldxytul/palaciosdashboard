
-- 1. Add columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS colaborador_slug text,
  ADD COLUMN IF NOT EXISTS sub_role text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
  CHECK (status IN ('pending','approved','rejected'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_colab_slug_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_colab_slug_check 
  CHECK (colaborador_slug IS NULL OR colaborador_slug IN ('thiago','aline','milena','felipe'));

-- 2. Auto-approve all existing accounts
UPDATE public.profiles SET status = 'approved';

-- Tag known profiles by email
UPDATE public.profiles SET colaborador_slug = 'thiago', sub_role = 'ceo'
  WHERE email IN ('contato@palacios3dstudio.com','titopalaciosg5@gmail.com');
UPDATE public.profiles SET colaborador_slug = 'aline', sub_role = 'bdr'
  WHERE email = 'aline@palacios3dstudio.com';

-- 3. Allow fundador to view/update all profiles
DROP POLICY IF EXISTS "Fundador can view all profiles" ON public.profiles;
CREATE POLICY "Fundador can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'fundador'));

DROP POLICY IF EXISTS "Fundador can update all profiles" ON public.profiles;
CREATE POLICY "Fundador can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'fundador'));

-- 4. Helper: get my colaborador slug
CREATE OR REPLACE FUNCTION public.get_my_colaborador_slug()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT colaborador_slug FROM public.profiles WHERE id = auth.uid()
$$;

-- 5. Update handle_new_user to default status to pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, 'pending');
  RETURN NEW;
END;
$$;
