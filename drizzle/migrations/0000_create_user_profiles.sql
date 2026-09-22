CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  designation text NOT NULL DEFAULT '',
  plant_role text NOT NULL DEFAULT '',
  shift text NOT NULL DEFAULT '',
  theme_preference jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);