
/*
# Claim Status Transition Guard

Found during manual verification: a claim could be PATCHed straight from
'draft'/'needs_review' to 'submitted' via the REST API, completely
skipping the validate-claim rule engine — the "human approval on
financial actions" gate only existed in the React UI, not the database.

This trigger makes the required sequence (validated -> submitted ->
approved/denied) a hard DB constraint, enforced for every writer
(app, RLS-authorized API calls, future code), not just the current UI.
*/

CREATE OR REPLACE FUNCTION enforce_claim_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'validated' THEN
      RAISE EXCEPTION 'Claim must be validated before it can be submitted (current status: %)', OLD.status;
    END IF;

    IF NEW.status IN ('approved', 'denied') AND OLD.status IS DISTINCT FROM 'submitted' THEN
      RAISE EXCEPTION 'Claim must be submitted before it can be approved or denied (current status: %)', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS claims_status_guard ON claims;
CREATE TRIGGER claims_status_guard
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION enforce_claim_status_transitions();
