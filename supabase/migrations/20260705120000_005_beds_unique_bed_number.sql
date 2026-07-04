
/*
# Fix: beds.bed_number missing UNIQUE constraint

`rooms.room_number` and `operation_theatres.ot_number` were both created
UNIQUE in the original schema, but `beds.bed_number` was not — a hospital
could create two beds with the same number, and any ON CONFLICT (bed_number)
upsert (like the demo seed) fails with 42P10 because there's nothing for it
to match against. This adds the missing constraint.
*/

ALTER TABLE beds ADD CONSTRAINT beds_bed_number_key UNIQUE (bed_number);
