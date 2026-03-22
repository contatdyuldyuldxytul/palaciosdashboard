
INSERT INTO public.user_roles (user_id, role) VALUES 
  ('2bab307a-27ca-4122-8051-cc3475c8ccc9', 'fundador'),
  ('0110d78d-768f-40d0-9d02-117407fd538a', 'fundador')
ON CONFLICT (user_id, role) DO NOTHING;
