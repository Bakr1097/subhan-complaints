-- ============================================================
-- Subhan Travels — Sample Complaint Seed Data
-- Run once in the Supabase SQL Editor to populate test data.
-- Safe to re-run: each execution adds a fresh batch.
-- ============================================================

DO $$
DECLARE
  r_lahore    uuid;
  r_karachi   uuid;
  r_islamabad uuid;
  r_multan    uuid;
  r_peshawar  uuid;
  cid         uuid;
BEGIN
  SELECT id INTO r_lahore    FROM routes WHERE name = 'Faisalabad-Lahore'    LIMIT 1;
  SELECT id INTO r_karachi   FROM routes WHERE name = 'Faisalabad-Karachi'   LIMIT 1;
  SELECT id INTO r_islamabad FROM routes WHERE name = 'Faisalabad-Islamabad' LIMIT 1;
  SELECT id INTO r_multan    FROM routes WHERE name = 'Faisalabad-Multan'    LIMIT 1;
  SELECT id INTO r_peshawar  FROM routes WHERE name = 'Faisalabad-Peshawar'  LIMIT 1;

  -- ── 1. OPEN · DRIVER_STEWARD · MEDIUM · PUBLIC_FORM ───────────────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description,
    severity, severity_auto_assigned, status, is_about_steward_head
  ) VALUES (
    'PUBLIC_FORM', 'Ahmed Raza', '+923001234567',
    r_lahore, '2026-05-15', '09:00', 'ST-04',
    'DRIVER_STEWARD',
    'Driver was extremely rude to an elderly passenger and drove dangerously fast on the motorway.',
    'MEDIUM', true, 'OPEN', false
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Submitted via public form');

  -- ── 2. INVESTIGATING · BUS_CONDITION · MEDIUM · PUBLIC_FORM · AC ──────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description, bus_condition_subcategory, is_maintenance_required,
    severity, severity_auto_assigned, status, investigating_at
  ) VALUES (
    'PUBLIC_FORM', 'Fatima Malik', '+923451234567',
    r_karachi, '2026-05-14', '18:00', 'ST-07',
    'BUS_CONDITION',
    'AC was not working for the entire 12-hour journey to Karachi. Extremely uncomfortable.',
    'AC_HEATING', true,
    'MEDIUM', true, 'INVESTIGATING', now() - interval '2 days'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Submitted via public form');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'OPEN', 'INVESTIGATING', now() - interval '1 day');

  -- ── 3. RESOLVED · DELAY_TIMING · HIGH · WHATSAPP · SATISFIED ─────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description, delay_subcategory,
    severity, severity_auto_assigned, status,
    resolution_notes, csat_response,
    investigating_at, resolved_at
  ) VALUES (
    'WHATSAPP', 'Muhammad Ali', '+923211234567',
    r_islamabad, '2026-05-12', '06:00', 'ST-02',
    'DELAY_TIMING',
    'Bus departed 3 hours late with no announcement. Missed an important meeting in Islamabad.',
    'LATE_DEPARTURE',
    'HIGH', true, 'RESOLVED',
    'We sincerely apologize for the delay caused by an urgent mechanical issue. A partial refund has been processed.',
    'SATISFIED',
    now() - interval '4 days', now() - interval '2 days'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Received via WhatsApp');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'OPEN', 'INVESTIGATING', now() - interval '4 days');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'INVESTIGATING', 'RESOLVED', now() - interval '2 days');
  INSERT INTO complaint_history (complaint_id, action_type, new_value, created_at)
  VALUES (cid, 'CSAT_LOGGED', 'SATISFIED', now() - interval '1 day');

  -- ── 4. CLOSED · SUGGESTION_FEEDBACK · LOW · PUBLIC_FORM · SATISFIED ──────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time,
    category, description,
    severity, severity_auto_assigned, status,
    resolution_notes, csat_response,
    investigating_at, resolved_at, closed_at
  ) VALUES (
    'PUBLIC_FORM', 'Ayesha Siddiqui', '+923331234567',
    r_multan, '2026-05-10', '12:00',
    'SUGGESTION_FEEDBACK',
    'It would be great if you could provide WiFi on long routes. The journey to Multan takes hours and internet access would help passengers.',
    'LOW', true, 'CLOSED',
    'Thank you for your valuable suggestion. We are actively exploring WiFi as part of our future service improvements.',
    'SATISFIED',
    now() - interval '6 days', now() - interval '5 days', now() - interval '4 days'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Submitted via public form');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'OPEN', 'INVESTIGATING', now() - interval '6 days');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'INVESTIGATING', 'RESOLVED', now() - interval '5 days');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'RESOLVED', 'CLOSED', now() - interval '4 days');

  -- ── 5. OPEN · FOOD_DRINKS · HIGH · IN_PERSON ──────────────────────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description,
    severity, severity_auto_assigned, status
  ) VALUES (
    'IN_PERSON', 'Zara Khan', '+923121234567',
    r_peshawar, '2026-05-16', '09:00', 'ST-11',
    'FOOD_DRINKS',
    'Refreshments provided were of very poor quality. Water bottles were not sealed properly and snacks appeared expired.',
    'HIGH', true, 'OPEN'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Reported in person at counter');

  -- ── 6. OPEN · TICKET_REFUND · HIGH · PHONE ────────────────────────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time,
    category, description,
    severity, severity_auto_assigned, status
  ) VALUES (
    'PHONE', 'Omar Sheikh', '+923401234567',
    r_lahore, '2026-05-01', '15:00',
    'TICKET_REFUND',
    'I cancelled my ticket 5 days in advance but have not received my refund after 3 weeks. Very disappointing.',
    'MEDIUM', true, 'OPEN'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Received via phone call');

  -- ── 7. INVESTIGATING · DRIVER_STEWARD · MEDIUM · PUBLIC_FORM ─────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description,
    severity, severity_auto_assigned, status, investigating_at, is_about_steward_head
  ) VALUES (
    'PUBLIC_FORM', 'Bilal Hassan', '+923501234567',
    r_karachi, '2026-05-13', '23:00', 'ST-03',
    'DRIVER_STEWARD',
    'The steward was sleeping throughout the night journey and did not respond when passengers needed assistance.',
    'MEDIUM', true, 'INVESTIGATING', now() - interval '1 day', false
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Submitted via public form');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'OPEN', 'INVESTIGATING', now() - interval '1 day');

  -- ── 8. OPEN · BUS_CONDITION · MEDIUM · PUBLIC_FORM · SEAT ────────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description, bus_condition_subcategory, is_maintenance_required,
    severity, severity_auto_assigned, status
  ) VALUES (
    'PUBLIC_FORM', 'Sara Mirza', '+923611234567',
    r_islamabad, '2026-05-16', '18:00', 'ST-09',
    'BUS_CONDITION',
    'My seat was broken and would not recline at all. Very uncomfortable for the long journey.',
    'SEAT', true,
    'MEDIUM', true, 'OPEN'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Submitted via public form');

  -- ── 9. RESOLVED · OTHER_SERIOUS · HIGH · EMAIL · UNSATISFIED ─────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description,
    severity, severity_auto_assigned, status,
    resolution_notes, csat_response,
    investigating_at, resolved_at
  ) VALUES (
    'EMAIL', 'Hassan Nawaz', '+923711234567',
    r_multan, '2026-05-08', '06:00', 'ST-01',
    'OTHER_SERIOUS',
    'My laptop bag went missing during the journey. It was in the overhead compartment and was gone on arrival.',
    'HIGH', true, 'RESOLVED',
    'We investigated thoroughly but were unable to locate the missing bag. We sincerely apologize for this incident and have escalated to management.',
    'UNSATISFIED',
    now() - interval '7 days', now() - interval '5 days'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Received via email');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'OPEN', 'INVESTIGATING', now() - interval '7 days');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'INVESTIGATING', 'RESOLVED', now() - interval '5 days');
  INSERT INTO complaint_history (complaint_id, action_type, new_value, created_at)
  VALUES (cid, 'CSAT_LOGGED', 'UNSATISFIED', now() - interval '4 days');

  -- ── 10. OPEN · DELAY_TIMING · MEDIUM · PUBLIC_FORM · today ───────────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description, delay_subcategory,
    severity, severity_auto_assigned, status
  ) VALUES (
    'PUBLIC_FORM', 'Nadia Qureshi', '+923811234567',
    r_peshawar, '2026-05-17', '09:00', 'ST-05',
    'DELAY_TIMING',
    'Bus arrived 2 hours late at the destination. No updates or announcements were made during the journey.',
    'LATE_ARRIVAL',
    'MEDIUM', true, 'OPEN'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Submitted via public form');

  -- ── 11. OPEN · BUS_CONDITION · HIGH · PUBLIC_FORM · CLEANLINESS ──────────
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time,
    category, description, bus_condition_subcategory, is_maintenance_required,
    severity, severity_auto_assigned, status
  ) VALUES (
    'PUBLIC_FORM', NULL, '+923911234567',
    r_lahore, '2026-05-17', '06:00',
    'BUS_CONDITION',
    'The bus was very dirty. Seat covers had stains and the floor had not been cleaned.',
    'CLEANLINESS', false,
    'HIGH', true, 'OPEN'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Submitted via public form');

  -- ── 12. INVESTIGATING · DELAY_TIMING · HIGH · WHATSAPP · EXCESSIVE_STOPS ─
  INSERT INTO complaints (
    source, passenger_name, passenger_phone,
    route_id, travel_date, departure_time, bus_number,
    category, description, delay_subcategory,
    severity, severity_auto_assigned, status, investigating_at
  ) VALUES (
    'WHATSAPP', 'Usman Tariq', '+923021234567',
    r_karachi, '2026-05-11', '21:00', 'ST-06',
    'DELAY_TIMING',
    'Bus stopped excessively at unauthorized points. A 12-hour journey took over 16 hours with no explanation.',
    'EXCESSIVE_STOPS',
    'HIGH', true, 'INVESTIGATING', now() - interval '3 days'
  ) RETURNING id INTO cid;
  INSERT INTO complaint_history (complaint_id, action_type, new_value, notes)
  VALUES (cid, 'CREATED', 'OPEN', 'Received via WhatsApp');
  INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_at)
  VALUES (cid, 'STATUS_CHANGED', 'OPEN', 'INVESTIGATING', now() - interval '3 days');

END $$;
