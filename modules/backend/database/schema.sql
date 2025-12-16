-- RPI-CNC-proj Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- G-Code files table
CREATE TABLE IF NOT EXISTS gcode_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    folder_id UUID REFERENCES gcode_folders(id) ON DELETE SET NULL,
    version INTEGER DEFAULT 1,
    parent_file_id UUID REFERENCES gcode_files(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- Array of tags
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_gcode_files_user_id ON gcode_files(user_id);
CREATE INDEX idx_gcode_files_folder_id ON gcode_files(folder_id);
CREATE INDEX idx_gcode_files_parent_file_id ON gcode_files(parent_file_id);
CREATE INDEX idx_gcode_files_created_at ON gcode_files(created_at);
CREATE INDEX idx_gcode_files_tags ON gcode_files USING GIN(tags);
CREATE INDEX idx_gcode_files_metadata ON gcode_files USING GIN(metadata);
CREATE INDEX idx_gcode_files_deleted_at ON gcode_files(deleted_at) WHERE deleted_at IS NOT NULL;

-- G-Code folders table
CREATE TABLE IF NOT EXISTS gcode_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES gcode_folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL, -- Computed path for hierarchy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, path)
);

CREATE INDEX idx_gcode_folders_user_id ON gcode_folders(user_id);
CREATE INDEX idx_gcode_folders_parent_folder_id ON gcode_folders(parent_folder_id);
CREATE INDEX idx_gcode_folders_path ON gcode_folders(path);

-- Collaborative sessions table
CREATE TABLE IF NOT EXISTS collaborative_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gcode_content TEXT NOT NULL,
    version INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_collab_sessions_owner_id ON collaborative_sessions(owner_id);
CREATE INDEX idx_collab_sessions_is_active ON collaborative_sessions(is_active);
CREATE INDEX idx_collab_sessions_created_at ON collaborative_sessions(created_at);

-- Session participants table
CREATE TABLE IF NOT EXISTS session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_name VARCHAR(100), -- For anonymous users
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT TRUE,
    cursor_position JSONB, -- {line, column}
    UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_session_participants_is_online ON session_participants(is_online);

-- Operations log for collaborative editing
CREATE TABLE IF NOT EXISTS operations_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('insert', 'delete', 'replace')),
    position INTEGER NOT NULL,
    content TEXT,
    length INTEGER,
    base_version INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_operations_log_session_id ON operations_log(session_id);
CREATE INDEX idx_operations_log_created_at ON operations_log(created_at);
CREATE INDEX idx_operations_log_base_version ON operations_log(base_version);

-- Mesh data table (for auto-leveling)
CREATE TABLE IF NOT EXISTS mesh_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    grid_size_x INTEGER NOT NULL,
    grid_size_y INTEGER NOT NULL,
    probe_points JSONB NOT NULL, -- Array of {x, y, z} points
    workspace_bounds JSONB NOT NULL, -- {minX, maxX, minY, maxY, minZ, maxZ}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mesh_data_user_id ON mesh_data(user_id);
CREATE INDEX idx_mesh_data_created_at ON mesh_data(created_at);

-- User sessions (for authentication)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gcode_files_updated_at BEFORE UPDATE ON gcode_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gcode_folders_updated_at BEFORE UPDATE ON gcode_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborative_sessions_updated_at BEFORE UPDATE ON collaborative_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mesh_data_updated_at BEFORE UPDATE ON mesh_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    cs.*,
    u.username AS owner_username,
    COUNT(sp.id) AS participant_count
FROM collaborative_sessions cs
JOIN users u ON cs.owner_id = u.id
LEFT JOIN session_participants sp ON cs.id = sp.session_id AND sp.is_online = TRUE
WHERE cs.is_active = TRUE
GROUP BY cs.id, u.username;

CREATE OR REPLACE VIEW user_files AS
SELECT 
    gf.*,
    u.username,
    gfolder.name AS folder_name,
    gfolder.path AS folder_path
FROM gcode_files gf
JOIN users u ON gf.user_id = u.id
LEFT JOIN gcode_folders gfolder ON gf.folder_id = gfolder.id
WHERE gf.deleted_at IS NULL;

-- Insert default admin user (password: 'admin123' - CHANGE THIS!)
INSERT INTO users (username, email, password_hash, display_name, role, is_verified)
VALUES (
    'admin',
    'admin@example.com',
    '$2b$10$rKJ5VvJ5BqXqZGqZqGqZqezVqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- bcrypt hash of 'admin123'
    'Administrator',
    'admin',
    TRUE
) ON CONFLICT (username) DO NOTHING;
