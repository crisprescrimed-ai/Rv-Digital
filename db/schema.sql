CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL UNIQUE,
  supervisor_id uuid,
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(140) NOT NULL, email varchar(160) NOT NULL UNIQUE,
  password_hash text NOT NULL, role varchar(20) NOT NULL CHECK (role IN ('SUPER_ADMIN','MANAGER','SUPERVISOR','SELLER')),
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','BLOCKED')),
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_supervisor_id_fkey;
ALTER TABLE teams ADD CONSTRAINT teams_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(80) NOT NULL UNIQUE,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12), year int NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  start_date date NOT NULL, end_date date NOT NULL, business_days jsonb NOT NULL DEFAULT '[]',
  status varchar(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT','OPEN','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(100) NOT NULL UNIQUE, code varchar(60) NOT NULL UNIQUE,
  type varchar(16) NOT NULL DEFAULT 'QUANTITY' CHECK (type IN ('QUANTITY','CURRENCY','PERCENTAGE','DECIMAL')),
  direction varchar(20) NOT NULL DEFAULT 'HIGHER_IS_BETTER' CHECK (direction IN ('HIGHER_IS_BETTER','LOWER_IS_BETTER')),
  unit varchar(20) NOT NULL DEFAULT 'un', aggregation_method varchar(24) NOT NULL DEFAULT 'SUM',
  thresholds jsonb NOT NULL DEFAULT '{"excellent":100,"good":80,"warning":60}', active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS aggregation_method varchar(24) NOT NULL DEFAULT 'SUM';
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS thresholds jsonb NOT NULL DEFAULT '{"excellent":100,"good":80,"warning":60}';
ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_type_check;
ALTER TABLE indicators ADD CONSTRAINT indicators_type_check CHECK (type IN ('QUANTITY','CURRENCY','PERCENTAGE','DECIMAL'));

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  indicator_id uuid NOT NULL REFERENCES indicators(id), period_id uuid NOT NULL REFERENCES periods(id), target_value numeric(15,2) NOT NULL,
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, indicator_id, period_id)
);
CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  indicator_id uuid NOT NULL REFERENCES indicators(id), period_id uuid NOT NULL REFERENCES periods(id),
  result_value numeric(15,2) NOT NULL, reference_date date NOT NULL, source varchar(30) NOT NULL DEFAULT 'MANUAL',
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, indicator_id, period_id, reference_date)
);
CREATE TABLE IF NOT EXISTS goal_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id), approved_by uuid REFERENCES users(id), old_value numeric(15,2) NOT NULL, new_value numeric(15,2) NOT NULL,
  reason text NOT NULL, status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','USED')),
  expires_at timestamptz, requested_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz
);
CREATE TABLE IF NOT EXISTS imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), file_name varchar(255) NOT NULL, uploaded_by uuid NOT NULL REFERENCES users(id),
  period_id uuid NOT NULL REFERENCES periods(id), status varchar(20) NOT NULL, total_rows int NOT NULL DEFAULT 0, success_rows int NOT NULL DEFAULT 0,
  error_rows int NOT NULL DEFAULT 0, errors jsonb NOT NULL DEFAULT '[]', mapping jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type varchar(16) NOT NULL CHECK (type IN ('DIRECT','GROUP','ANNOUNCEMENT')),
  name varchar(120), team_id uuid REFERENCES teams(id) ON DELETE SET NULL, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz, PRIMARY KEY(conversation_id, user_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL REFERENCES users(id), conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, title varchar(160) NOT NULL,
  body text, type varchar(30) NOT NULL DEFAULT 'INFO', read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), action varchar(100) NOT NULL, entity varchar(100) NOT NULL,
  entity_id uuid, old_data jsonb, new_data jsonb, ip_address varchar(80), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  key varchar(80) PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(180) NOT NULL, description text,
  type varchar(24) NOT NULL CHECK (type IN ('RECOVERY','ACCELERATION','CORRECTION','OPPORTUNITY','FOLLOW_UP','TRAINING','CAMPAIGN','CHALLENGE')),
  priority varchar(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','CRITICAL')),
  status varchar(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CREATED','DISTRIBUTED','IN_PROGRESS','AT_RISK','COMPLETED','OVERDUE','CANCELLED')),
  indicator_id uuid REFERENCES indicators(id), period_id uuid REFERENCES periods(id), created_by uuid NOT NULL REFERENCES users(id),
  start_date date NOT NULL, end_date date NOT NULL, target_value numeric(15,2) NOT NULL CHECK (target_value >= 0),
  expected_result text, success_indicator text, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE TABLE IF NOT EXISTS action_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_id uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE, supervisor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE, target_value numeric(15,2) NOT NULL DEFAULT 0,
  assigned_value numeric(15,2) NOT NULL DEFAULT 0, progress_value numeric(15,2) NOT NULL DEFAULT 0,
  status varchar(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ASSIGNED','IN_PROGRESS','AT_RISK','COMPLETED','OVERDUE','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (team_id IS NOT NULL OR user_id IS NOT NULL), CHECK (assigned_value >= 0), CHECK (progress_value >= 0)
);
CREATE TABLE IF NOT EXISTS action_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_id uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), comment text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_id uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id), action varchar(80) NOT NULL, old_data jsonb, new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS results_period_user_idx ON results(period_id, user_id);
CREATE INDEX IF NOT EXISTS goals_period_user_idx ON goals(period_id, user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS action_targets_action_idx ON action_targets(action_id);
CREATE INDEX IF NOT EXISTS action_targets_team_idx ON action_targets(team_id);
CREATE INDEX IF NOT EXISTS action_targets_user_idx ON action_targets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS action_target_team_unique ON action_targets(action_id, team_id) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS action_target_user_unique ON action_targets(action_id, user_id) WHERE user_id IS NOT NULL;
