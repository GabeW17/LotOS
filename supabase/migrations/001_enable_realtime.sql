-- Enable Supabase Realtime for leads and conversations tables
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table conversations;
