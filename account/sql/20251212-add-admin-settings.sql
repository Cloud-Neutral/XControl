-- +migrate Up
CREATE TABLE IF NOT EXISTS admin_setting_versions (
    id BIGSERIAL PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_setting_versions (id, version)
    VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_settings (
    id BIGSERIAL PRIMARY KEY,
    module_key VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_settings_module_role UNIQUE (module_key, role)
);

CREATE INDEX IF NOT EXISTS idx_admin_settings_version ON admin_settings (version);

-- +migrate Down
DROP TABLE IF EXISTS admin_settings;
DROP TABLE IF EXISTS admin_setting_versions;
