-- Add website_url column to dealers
alter table dealers add column website_url text;

-- Unique partial index so no two dealers claim the same domain
create unique index dealers_website_url_unique
  on dealers (website_url)
  where website_url is not null;

-- Update the signup trigger to persist website_url from auth metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.dealers (id, name, email, website_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'website_url'
  );
  return new;
end;
$$ language plpgsql security definer;
