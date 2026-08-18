-- 1. Add picture_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS picture_url text;

-- 2. Add secure RPC function for users to update their own profile name and picture URL
CREATE OR REPLACE FUNCTION public.update_user_profile(
  name_input text,
  picture_url_input text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
  trimmed_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  trimmed_name := nullif(trim(name_input), '');
  IF trimmed_name IS NULL THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;

  UPDATE public.profiles
  SET
    full_name = trimmed_name,
    picture_url = nullif(trim(picture_url_input), ''),
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO updated_profile;

  IF updated_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_profile(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_user_profile(text, text) TO authenticated;

-- 3. Re-enable direct RLS update policy for own profile
DROP POLICY IF EXISTS "users can update their own profile" ON public.profiles;
CREATE POLICY "users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
