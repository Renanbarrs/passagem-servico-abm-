CREATE TABLE service_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_start date NOT NULL,
  time_start time without time zone NOT NULL,
  date_end date NOT NULL,
  time_end time without time zone NOT NULL,
  officer_name_snapshot text NOT NULL
    CHECK (length(trim(officer_name_snapshot)) > 0),
  auxiliary_name_snapshot text NOT NULL
    CHECK (length(trim(auxiliary_name_snapshot)) > 0),
  driver_name_snapshot text NOT NULL
    CHECK (length(trim(driver_name_snapshot)) > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  CONSTRAINT service_passages_period_check CHECK (
    date_end > date_start
    OR (date_end = date_start AND time_end >= time_start)
  ),
  CONSTRAINT service_passages_finalized_at_check CHECK (
    (status = 'draft' AND finalized_at IS NULL)
    OR (status = 'finalized' AND finalized_at IS NOT NULL)
  )
);

CREATE INDEX service_passages_date_start_idx
  ON service_passages (date_start DESC, id);

CREATE TABLE service_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_passage_id uuid NOT NULL
    REFERENCES service_passages (id) ON DELETE CASCADE,
  vehicle_id text NOT NULL
    CHECK (vehicle_id IN ('APS-112', 'AR-99')),
  model_snapshot text NOT NULL
    CHECK (length(trim(model_snapshot)) > 0),
  fuel_type_snapshot text NOT NULL
    CHECK (length(trim(fuel_type_snapshot)) > 0),
  status text NOT NULL CHECK (status IN ('operational', 'down')),
  odometer_initial bigint CHECK (odometer_initial >= 0),
  odometer_final bigint CHECK (odometer_final >= 0),
  tank_level text CHECK (
    tank_level IN ('CHEIO', '↑ 3/4', '3/4', '↓ 3/4', '2/4 (meio)', '1/4')
  ),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_vehicles_passage_vehicle_unique
    UNIQUE (service_passage_id, vehicle_id),
  CONSTRAINT service_vehicles_odometer_order_check CHECK (
    odometer_initial IS NULL
    OR odometer_final IS NULL
    OR odometer_final >= odometer_initial
  ),
  CONSTRAINT service_vehicles_status_fields_check CHECK (
    (
      status = 'operational'
      AND odometer_initial IS NOT NULL
      AND odometer_final IS NOT NULL
      AND tank_level IS NOT NULL
    )
    OR
    (
      status = 'down'
      AND length(trim(notes)) > 0
    )
  )
);

CREATE TABLE fuelings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_passage_id uuid NOT NULL,
  vehicle_id text NOT NULL,
  date date NOT NULL,
  time time without time zone NOT NULL,
  responsible_name_snapshot text NOT NULL
    CHECK (length(trim(responsible_name_snapshot)) > 0),
  odometer bigint NOT NULL CHECK (odometer >= 0),
  liters numeric(12, 3) NOT NULL CHECK (liters >= 0),
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  balance numeric(12, 2) NOT NULL CHECK (balance >= 0),
  receipt_storage_path text,
  receipt_original_name text,
  receipt_mime_type text,
  receipt_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fuelings_vehicle_passage_fk
    FOREIGN KEY (service_passage_id, vehicle_id)
    REFERENCES service_vehicles (service_passage_id, vehicle_id)
    ON DELETE CASCADE,
  CONSTRAINT fuelings_receipt_metadata_check CHECK (
    (
      receipt_storage_path IS NULL
      AND receipt_original_name IS NULL
      AND receipt_mime_type IS NULL
      AND receipt_size_bytes IS NULL
    )
    OR
    (
      receipt_storage_path IS NOT NULL
      AND receipt_original_name IS NOT NULL
      AND receipt_mime_type IS NOT NULL
      AND receipt_size_bytes IS NOT NULL
      AND length(trim(receipt_storage_path)) > 0
      AND length(trim(receipt_original_name)) > 0
      AND receipt_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
      AND receipt_size_bytes > 0
    )
  )
);

CREATE INDEX fuelings_passage_date_idx
  ON fuelings (service_passage_id, date, time);

CREATE TABLE occurrence_categories (
  code text PRIMARY KEY,
  name text NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  is_no_change boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT occurrence_categories_no_change_name_check CHECK (
    NOT is_no_change OR name = 'Sem alteração'
  )
);

CREATE UNIQUE INDEX occurrence_categories_single_no_change_idx
  ON occurrence_categories (is_no_change)
  WHERE is_no_change;

INSERT INTO occurrence_categories (code, name, is_system, is_no_change)
VALUES
  ('vehicles', 'Viaturas', true, false),
  ('property', 'Patrimônio', true, false),
  ('personnel', 'Pessoal', true, false),
  ('facilities', 'Instalações', true, false),
  ('activities', 'Instruções e atividades', true, false),
  ('other', 'Outros', true, false),
  ('no_change', 'Sem alteração', true, true);

CREATE FUNCTION protect_system_occurrence_categories()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'System occurrence categories cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_system AND (
    NEW.code IS DISTINCT FROM OLD.code
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.is_system IS DISTINCT FROM OLD.is_system
    OR NEW.is_no_change IS DISTINCT FROM OLD.is_no_change
  ) THEN
    RAISE EXCEPTION 'System occurrence category definitions are fixed';
  END IF;

  IF OLD.is_no_change AND NOT NEW.active THEN
    RAISE EXCEPTION 'The no-change category cannot be deactivated';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER occurrence_categories_protect_system_trigger
  BEFORE UPDATE OR DELETE ON occurrence_categories
  FOR EACH ROW
  EXECUTE FUNCTION protect_system_occurrence_categories();

CREATE TABLE occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_passage_id uuid NOT NULL
    REFERENCES service_passages (id) ON DELETE CASCADE,
  category_code text NOT NULL
    REFERENCES occurrence_categories (code) ON DELETE RESTRICT,
  occurred_date date,
  occurred_time time without time zone,
  description text NOT NULL,
  is_no_change boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT occurrences_description_check
    CHECK (length(trim(description)) > 0),
  CONSTRAINT occurrences_no_change_fields_check CHECK (
    NOT is_no_change
    OR (
      category_code = 'no_change'
      AND description = 'O serviço transcorreu sem alterações'
      AND occurred_date IS NULL
      AND occurred_time IS NULL
    )
  ),
  CONSTRAINT occurrences_regular_category_check CHECK (
    is_no_change OR category_code <> 'no_change'
  )
);

CREATE UNIQUE INDEX occurrences_single_no_change_per_passage_idx
  ON occurrences (service_passage_id)
  WHERE is_no_change;

CREATE INDEX occurrences_passage_date_idx
  ON occurrences (service_passage_id, occurred_date, occurred_time);

CREATE FUNCTION enforce_occurrence_exclusivity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_passage_id uuid;
  category_is_no_change boolean;
  category_is_active boolean;
BEGIN
  target_passage_id := NEW.service_passage_id;

  IF TG_OP = 'UPDATE' AND OLD.service_passage_id <> NEW.service_passage_id THEN
    PERFORM id
    FROM service_passages
    WHERE id IN (OLD.service_passage_id, NEW.service_passage_id)
    ORDER BY id
    FOR UPDATE;
  ELSE
    PERFORM id
    FROM service_passages
    WHERE id = target_passage_id
    FOR UPDATE;
  END IF;

  SELECT is_no_change, active
  INTO category_is_no_change, category_is_active
  FROM occurrence_categories
  WHERE code = NEW.category_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Occurrence category does not exist';
  END IF;

  IF NOT category_is_active THEN
    RAISE EXCEPTION 'Inactive occurrence categories cannot be used';
  END IF;

  IF NEW.is_no_change IS DISTINCT FROM category_is_no_change THEN
    RAISE EXCEPTION 'Occurrence type does not match its category';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM occurrences existing
    WHERE existing.service_passage_id = NEW.service_passage_id
      AND existing.id <> NEW.id
      AND existing.is_no_change <> NEW.is_no_change
  ) THEN
    RAISE EXCEPTION
      'A no-change confirmation cannot coexist with real occurrences';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER occurrences_exclusivity_trigger
  BEFORE INSERT OR UPDATE ON occurrences
  FOR EACH ROW
  EXECUTE FUNCTION enforce_occurrence_exclusivity();

CREATE TABLE service_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_passage_id uuid NOT NULL
    REFERENCES service_passages (id) ON DELETE CASCADE,
  sector text NOT NULL CHECK (sector IN ('Frota', 'Patrimônio', 'Pessoal')),
  description text NOT NULL CHECK (length(trim(description)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_actions_passage_sector_unique
    UNIQUE (service_passage_id, sector)
);

CREATE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER service_passages_updated_at_trigger
  BEFORE UPDATE ON service_passages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER service_vehicles_updated_at_trigger
  BEFORE UPDATE ON service_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER service_actions_updated_at_trigger
  BEFORE UPDATE ON service_actions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
