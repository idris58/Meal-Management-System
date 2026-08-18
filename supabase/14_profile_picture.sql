-- Add picture_url to profiles table for profile picture support (URL-based, no upload needed).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS picture_url text;
