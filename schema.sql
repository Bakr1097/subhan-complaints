-- ============================================================
-- Subhan Travels Complaint Management App
-- Full Database Schema — run once in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE complaint_source AS ENUM (
  'PUBLIC_FORM', 'PHONE', 'WHATSAPP', 'IN_PERSON', 'EMAIL', 'OTHER'
);

CREATE TYPE complaint_category AS ENUM (
  'DRIVER_STEWARD',
  'BUS_CONDITION',
  'FOOD_DRINKS',
  'DELAY_TIMING',
  'TICKET_REFUND',
  'OTHER_SERIOUS',
  'SUGGESTION_FEEDBACK'
);

CREATE TYPE complaint_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE complaint_status AS ENUM (
  'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'ARCHIVED'
);

CREATE TYPE user_role AS ENUM ('ADMIN', 'STEWARD_HEAD');

CREATE TYPE history_action AS ENUM (
  'CREATED',
  'STATUS_CHANGED',
  'SEVERITY_CHANGED',
  'NOTE_ADDED',
  'WHATSAPP_SENT',
  'CSAT_LOGGED'
);

CREATE TYPE csat_status AS ENUM ('SATISFIED', 'UNSATISFIED', 'NO_RESPONSE');


-- ============================================================
-- TABLES
-- ============================================================

-- Reference number counter (one row per calendar year)
CREATE TABLE complaint_sequences (
  year    int PRIMARY KEY,
  last_number int NOT NULL DEFAULT 0
);

-- Staff profiles — extends Supabase auth.users
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  phone       text,
  role        user_role NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Routes
CREATE TABLE routes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  origin      text NOT NULL,
  destination text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Time slots per route
CREATE TABLE route_time_slots (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id    uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  time_label  text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0
);

-- Main complaints table
CREATE TABLE complaints (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number      text UNIQUE NOT NULL,
  source                complaint_source NOT NULL DEFAULT 'PUBLIC_FORM',
  logged_by_user_id     uuid REFERENCES auth.users(id),
  passenger_name        text,
  passenger_phone       text NOT NULL,
  route_id              uuid NOT NULL REFERENCES routes(id),
  travel_date           date NOT NULL,
  departure_time        text NOT NULL,
  bus_number            text,
  category              complaint_category NOT NULL,
  description           text,
  photo_url             text,
  severity              complaint_severity NOT NULL,
  severity_auto_assigned boolean NOT NULL DEFAULT true,
  status                complaint_status NOT NULL DEFAULT 'OPEN',
  assigned_to_user_id   uuid REFERENCES auth.users(id),
  is_about_steward_head     boolean NOT NULL DEFAULT false,
  bus_condition_subcategory text,
  is_maintenance_required   boolean NOT NULL DEFAULT false,
  delay_subcategory         text,
  resolution_notes          text,
  csat_response         csat_status,
  original_timestamp    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  investigating_at      timestamptz,
  resolved_at           timestamptz,
  closed_at             timestamptz,
  archived_at           timestamptz
);

-- Audit trail for every complaint action
CREATE TABLE complaint_history (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id          uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  action_type           history_action NOT NULL,
  old_value             text,
  new_value             text,
  notes                 text,
  performed_by_user_id  uuid REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Internal staff notes (never shown to passengers)
CREATE TABLE internal_notes (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id          uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  note                  text NOT NULL,
  created_by_user_id    uuid NOT NULL REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generates SCT-YYYY-NNNN, safe under concurrent inserts
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM NOW())::int;
  v_next int;
BEGIN
  INSERT INTO complaint_sequences (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = complaint_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'SCT-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

-- Trigger function: set reference_number automatically on INSERT
CREATE OR REPLACE FUNCTION set_reference_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := generate_reference_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER complaints_set_reference_number
  BEFORE INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION set_reference_number();

-- Returns the role of the currently logged-in staff member
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true;
$$;

-- Public status lookup: validates reference + phone, returns safe fields only
-- Called from the /status page without exposing all complaint data to anon
CREATE OR REPLACE FUNCTION get_complaint_status(
  p_reference text,
  p_phone     text
)
RETURNS TABLE (
  id                uuid,
  reference_number  text,
  passenger_name    text,
  route_id          uuid,
  travel_date       date,
  departure_time    text,
  bus_number        text,
  category          complaint_category,
  severity          complaint_severity,
  status            complaint_status,
  resolution_notes  text,
  created_at        timestamptz,
  investigating_at  timestamptz,
  resolved_at       timestamptz,
  closed_at         timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    id, reference_number, passenger_name, route_id,
    travel_date, departure_time, bus_number, category,
    severity, status, resolution_notes, created_at,
    investigating_at, resolved_at, closed_at
  FROM complaints
  WHERE reference_number = p_reference
    AND passenger_phone   = p_phone;
$$;

-- Returns status history for the public status page
CREATE OR REPLACE FUNCTION get_complaint_history_public(
  p_reference text,
  p_phone     text
)
RETURNS TABLE (
  action_type  history_action,
  old_value    text,
  new_value    text,
  created_at   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ch.action_type, ch.old_value, ch.new_value, ch.created_at
  FROM complaint_history ch
  JOIN complaints c ON c.id = ch.complaint_id
  WHERE c.reference_number = p_reference
    AND c.passenger_phone   = p_phone
    AND ch.action_type IN ('CREATED', 'STATUS_CHANGED')
  ORDER BY ch.created_at ASC;
$$;


-- Public form submission — SECURITY DEFINER so anon can read back the
-- inserted row's id and reference_number without a separate SELECT (which
-- RLS correctly blocks for the anon role).
CREATE OR REPLACE FUNCTION submit_complaint(
  p_passenger_phone           text,
  p_route_id                  uuid,
  p_travel_date               date,
  p_departure_time            text,
  p_category                  complaint_category,
  p_severity                  complaint_severity,
  p_passenger_name            text    DEFAULT NULL,
  p_bus_number                text    DEFAULT NULL,
  p_description               text    DEFAULT NULL,
  p_photo_url                 text    DEFAULT NULL,
  p_is_about_steward_head     boolean DEFAULT false,
  p_bus_condition_subcategory text    DEFAULT NULL,
  p_is_maintenance_required   boolean DEFAULT false,
  p_delay_subcategory         text    DEFAULT NULL
)
RETURNS TABLE (id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id               uuid;
  v_reference_number text;
BEGIN
  INSERT INTO complaints (
    source,
    passenger_name,
    passenger_phone,
    route_id,
    travel_date,
    departure_time,
    bus_number,
    category,
    description,
    photo_url,
    severity,
    severity_auto_assigned,
    status,
    is_about_steward_head,
    bus_condition_subcategory,
    is_maintenance_required,
    delay_subcategory
  ) VALUES (
    'PUBLIC_FORM',
    p_passenger_name,
    p_passenger_phone,
    p_route_id,
    p_travel_date,
    p_departure_time,
    p_bus_number,
    p_category,
    p_description,
    p_photo_url,
    p_severity,
    true,
    'OPEN',
    p_is_about_steward_head,
    p_bus_condition_subcategory,
    p_is_maintenance_required,
    p_delay_subcategory
  )
  RETURNING complaints.id, complaints.reference_number
  INTO v_id, v_reference_number;

  INSERT INTO complaint_history (
    complaint_id,
    action_type,
    new_value,
    notes
  ) VALUES (
    v_id,
    'CREATED',
    'OPEN',
    'Submitted via public form'
  );

  RETURN QUERY SELECT v_id, v_reference_number;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_complaint TO anon, authenticated;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_time_slots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints         ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_sequences ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "staff can view profiles"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_my_role() = 'ADMIN');

CREATE POLICY "admin can manage profiles"
  ON profiles FOR ALL TO authenticated
  USING (get_my_role() = 'ADMIN')
  WITH CHECK (get_my_role() = 'ADMIN');

-- routes (public form needs to read them)
CREATE POLICY "anyone can view active routes"
  ON routes FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "admin can manage routes"
  ON routes FOR ALL TO authenticated
  USING (get_my_role() = 'ADMIN')
  WITH CHECK (get_my_role() = 'ADMIN');

-- route_time_slots (public form needs to read them)
CREATE POLICY "anyone can view time slots"
  ON route_time_slots FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin can manage time slots"
  ON route_time_slots FOR ALL TO authenticated
  USING (get_my_role() = 'ADMIN')
  WITH CHECK (get_my_role() = 'ADMIN');

-- complaints
CREATE POLICY "anyone can submit a complaint"
  ON complaints FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admin can view all complaints"
  ON complaints FOR SELECT TO authenticated
  USING (get_my_role() = 'ADMIN');

CREATE POLICY "steward head can view non-flagged complaints"
  ON complaints FOR SELECT TO authenticated
  USING (
    get_my_role() = 'STEWARD_HEAD'
    AND is_about_steward_head = false
  );

CREATE POLICY "admin can update all complaints"
  ON complaints FOR UPDATE TO authenticated
  USING (get_my_role() = 'ADMIN')
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "steward head can update non-flagged complaints"
  ON complaints FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'STEWARD_HEAD'
    AND is_about_steward_head = false
  )
  WITH CHECK (
    get_my_role() = 'STEWARD_HEAD'
    AND is_about_steward_head = false
  );

-- complaint_history
CREATE POLICY "staff can view history"
  ON complaint_history FOR SELECT TO authenticated
  USING (get_my_role() = 'ADMIN' OR get_my_role() = 'STEWARD_HEAD');

CREATE POLICY "staff can insert history"
  ON complaint_history FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "anon can insert created history"
  ON complaint_history FOR INSERT TO anon
  WITH CHECK (action_type = 'CREATED');

-- internal_notes
CREATE POLICY "staff can view internal notes"
  ON internal_notes FOR SELECT TO authenticated
  USING (get_my_role() = 'ADMIN' OR get_my_role() = 'STEWARD_HEAD');

CREATE POLICY "staff can add internal notes"
  ON internal_notes FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'ADMIN' OR get_my_role() = 'STEWARD_HEAD');

-- complaint_sequences: no direct access — only via SECURITY DEFINER function
CREATE POLICY "no direct sequence access"
  ON complaint_sequences FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);


-- ============================================================
-- FUNCTION PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION generate_reference_number()          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_role()                        TO authenticated;
GRANT EXECUTE ON FUNCTION get_complaint_status(text, text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_complaint_history_public(text, text) TO anon, authenticated;


-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO routes (name, origin, destination) VALUES
  ('Faisalabad-Lahore',     'Faisalabad', 'Lahore'),
  ('Faisalabad-Karachi',    'Faisalabad', 'Karachi'),
  ('Faisalabad-Islamabad',  'Faisalabad', 'Islamabad'),
  ('Faisalabad-Multan',     'Faisalabad', 'Multan'),
  ('Faisalabad-Peshawar',   'Faisalabad', 'Peshawar');

-- Standard time slots applied to every route
INSERT INTO route_time_slots (route_id, time_label, sort_order)
SELECT r.id, s.time_label, s.sort_order
FROM routes r
CROSS JOIN (VALUES
  ('6 AM',  1),
  ('9 AM',  2),
  ('12 PM', 3),
  ('3 PM',  4),
  ('6 PM',  5),
  ('9 PM',  6),
  ('11 PM', 7)
) AS s(time_label, sort_order);
