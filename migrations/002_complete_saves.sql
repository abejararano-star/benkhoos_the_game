-- Additive migration: preserves all existing partidas and legacy saves.
CREATE TABLE IF NOT EXISTS partida_estados (
    partida_id INT PRIMARY KEY,
    save_version INT NOT NULL,
    saved_at VARCHAR(40) NOT NULL,
    estado_json LONGTEXT NOT NULL,
    CONSTRAINT fk_estado_partida FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
