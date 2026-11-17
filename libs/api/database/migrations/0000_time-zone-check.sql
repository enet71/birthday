-- Used by the check on notification_settings.time_zone, so it exists before the tables.
CREATE FUNCTION public.is_valid_time_zone(time_zone text) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = time_zone);
$$;
