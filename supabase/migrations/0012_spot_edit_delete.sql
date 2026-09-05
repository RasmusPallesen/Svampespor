-- Redigér/slet egne steder — samme mønster som finds fik i migration 0010.
--
-- `spots_update` fandtes allerede (migration 0001), men uden en WITH CHECK.
-- Uden den kunne en håndlavet PATCH (uden om appens UI) i teorien ændre
-- `source` fra 'user' til 'system' på ens eget sted — `spots_read`s regel
-- ("source <> 'user' OR owner_id = auth.uid()") ville så gøre det privat
-- sted offentligt læsbart for alle. Rettet, samtidig med at delete-politikken
-- tilføjes, siden begge handler om at stramme skrivning til egne steder.
drop policy if exists spots_update on spots;
create policy spots_update on spots for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and source = 'user');

create policy spots_delete on spots for delete
  using (owner_id = auth.uid());
