-- =====================================================================
-- BASE DE DATOS: benkhoos_the_game (XAMPP / MariaDB / MySQL)
-- PROYECTO: Benkos Biohó - El Palenque de la Matuna (1599-1621)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `benkhoos_the_game` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `benkhoos_the_game`;

-- 1. Tabla de Jugadores / Perfiles
CREATE TABLE IF NOT EXISTS `jugadores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(50) NOT NULL UNIQUE,
    `creado_en` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `ultima_partida` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Catálogo Oficial de Tropas y Roles Cimarrones
CREATE TABLE IF NOT EXISTS `catalogo_unidades` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `clave_unidad` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,
    `rama` ENUM('civil', 'lanza', 'arqueria', 'caza', 'espada', 'caballeria', 'mineria', 'agricultura', 'campeon') NOT NULL,
    `tier` TINYINT NOT NULL DEFAULT 1,
    `coste_monedas` INT NOT NULL DEFAULT 1,
    `salud_max` INT NOT NULL,
    `dano_ataque` INT NOT NULL,
    `armadura` INT NOT NULL DEFAULT 0,
    `velocidad` FLOAT NOT NULL DEFAULT 1.0,
    `descripcion` TEXT,
    `laminas_origen` VARCHAR(100),
    UNIQUE KEY `uk_clave_tier` (`clave_unidad`, `tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Catálogo de Construcciones y Fortificaciones
CREATE TABLE IF NOT EXISTS `catalogo_construcciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tipo_estructura` VARCHAR(40) NOT NULL,
    `nivel` TINYINT NOT NULL DEFAULT 1,
    `coste_monedas` INT NOT NULL,
    `salud_max` INT NOT NULL,
    `descripcion` TEXT,
    UNIQUE KEY `uk_tipo_nivel` (`tipo_estructura`, `nivel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Partidas Guardadas
CREATE TABLE IF NOT EXISTS `partidas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `jugador_id` INT NOT NULL,
    `nombre_partida` VARCHAR(60) DEFAULT 'Palenque Libre',
    `dia_actual` INT NOT NULL DEFAULT 1,
    `tiempo_dia` FLOAT NOT NULL DEFAULT 0.0,
    `monedas_bolsa` INT NOT NULL DEFAULT 4,
    `monedas_cofre` INT NOT NULL DEFAULT 0,
    `salud_benkos` INT NOT NULL DEFAULT 100,
    `salud_max_benkos` INT NOT NULL DEFAULT 100,
    `nivel_palenque` INT NOT NULL DEFAULT 1,
    `totem_ascenso_desbloqueado` TINYINT(1) NOT NULL DEFAULT 0,
    `armadura_real_desbloqueada` TINYINT(1) NOT NULL DEFAULT 0,
    `muralla_izq_hp` INT NOT NULL DEFAULT 200,
    `muralla_izq_nivel` INT NOT NULL DEFAULT 1,
    `muralla_der_hp` INT NOT NULL DEFAULT 200,
    `muralla_der_nivel` INT NOT NULL DEFAULT 1,
    `torre_izq_nivel` INT NOT NULL DEFAULT 1,
    `torre_der_nivel` INT NOT NULL DEFAULT 1,
    `posicion_benkos_x` FLOAT NOT NULL DEFAULT 1200.0,
    `fugitivos_liberados` INT NOT NULL DEFAULT 0,
    `enemigos_derrotados` INT NOT NULL DEFAULT 0,
    `puntuacion_total` INT NOT NULL DEFAULT 0,
    `fecha_guardado` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_partida_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tropas Activas en la Partida
CREATE TABLE IF NOT EXISTS `partida_tropas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `partida_id` INT NOT NULL,
    `tipo_unidad` VARCHAR(30) NOT NULL,
    `tier` TINYINT NOT NULL DEFAULT 1,
    `salud_actual` INT NOT NULL,
    `posicion_x` FLOAT NOT NULL,
    `estado_fsm` VARCHAR(30) DEFAULT 'IDLE',
    CONSTRAINT `fk_tropa_partida` FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Construcciones y Nodos Activos en la Partida
CREATE TABLE IF NOT EXISTS `partida_construcciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `partida_id` INT NOT NULL,
    `tipo_nodo` VARCHAR(40) NOT NULL,
    `nivel` INT NOT NULL DEFAULT 1,
    `posicion_x` FLOAT NOT NULL,
    `salud_actual` INT NOT NULL,
    CONSTRAINT `fk_construccion_partida` FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Bitácora de Campañas y Récords (Leaderboard)
CREATE TABLE IF NOT EXISTS `bitacora_victorias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `jugador_id` INT NOT NULL,
    `dias_sobrevividos` INT NOT NULL,
    `tropas_reclutadas` INT NOT NULL,
    `oleadas_repelidas` INT NOT NULL,
    `jefes_derrotados` INT NOT NULL DEFAULT 0,
    `plata_total_acumulada` INT NOT NULL,
    `puntuacion_final` INT NOT NULL,
    `victoria_conseguida` TINYINT(1) NOT NULL DEFAULT 0,
    `fecha_registro` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bitacora_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Configuración Global del Juego
CREATE TABLE IF NOT EXISTS `configuracion_juego` (
    `clave` VARCHAR(50) PRIMARY KEY,
    `valor` TEXT NOT NULL,
    `descripcion` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- POBLAR CATÁLOGOS BASE SEGÚN EL PLAN MAESTRO
-- =====================================================================

INSERT INTO `catalogo_unidades` (`clave_unidad`, `nombre`, `rama`, `tier`, `coste_monedas`, `salud_max`, `dano_ataque`, `armadura`, `velocidad`, `descripcion`, `laminas_origen`) VALUES
('FUGITIVO', 'Esclavizado / Fugitivo', 'civil', 1, 0, 40, 2, 0, 0.8, 'Huye con cadenas arrastradas. Con 1 Real parte los eslabones.', 'Lámina 1 Aliados'),
('ALDEANO', 'Aldeano Libre / Cargador', 'civil', 1, 1, 60, 5, 0, 1.0, 'Transporta cosechas, cajas y plata hacia el Cofre de Wiwa.', 'Lámina 1 Aliados'),
('LANCERO', 'Guerrero Africano', 'lanza', 1, 3, 110, 16, 2, 0.9, 'Faja roja cruzada, lanza y escudo tribal. Primera línea de choque.', 'Lámina 2 Aliados'),
('LANCERO', 'Lancero Élite', 'lanza', 2, 6, 175, 28, 5, 1.0, 'Turbante con joya y cota de escamas dorada. Resiste embestidas.', 'Lámina 4 Izquierda'),
('LANCERO', 'Lancero Real', 'lanza', 3, 8, 260, 44, 9, 1.1, 'Casco dorado con penacho imperial. Refleja 180% daño a caballería.', 'Lámina 4 Derecha'),
('ARQUERO', 'Arquero Africano', 'arqueria', 1, 3, 75, 14, 0, 1.0, 'Cinta amarilla y arco corto de caza. Fuego ágil.', 'Lámina 2 Aliados'),
('ARQUERO', 'Arquero Élite', 'arqueria', 2, 6, 120, 25, 2, 1.0, 'Diadema emplumada y arco largo de precisión. Mayor alcance.', 'Lámina 4 Izquierda'),
('ARQUERO', 'Arquero Real', 'arqueria', 3, 8, 180, 40, 4, 1.05, 'Penacho carmesí y flechas pesadas con punta ígnea dorada.', 'Lámina 4 Derecha'),
('CAZADOR', 'Cazador Africano', 'caza', 1, 4, 90, 15, 1, 1.1, 'Lanza red de caza que inmoviliza al enemigo 3.2s.', 'Lámina 2 Aliados'),
('CAZADOR', 'Cazador Élite', 'caza', 2, 6, 140, 24, 3, 1.15, 'Jabalinas dentadas y red reforzada con pesas de bronce.', 'Lámina 4 Izquierda'),
('CAZADOR', 'Maestro Cazador Real', 'caza', 3, 8, 200, 38, 5, 1.2, 'Red real irrompible. Inmoviliza sub-jefes coloniales.', 'Lámina 4 Derecha'),
('ESPADACHIN', 'Espadachín Élite', 'espada', 2, 6, 150, 32, 4, 1.2, 'Sable curvo africano y tajos de alto DPS ofensivo.', 'Lámina 4 Izquierda'),
('ESPADACHIN', 'Espadachín Real', 'espada', 3, 8, 220, 50, 7, 1.25, 'Maestro del acero cimarrón con ráfaga de tajos dobles.', 'Lámina 4 Derecha'),
('CABALLERIA', 'Caballero Élite', 'caballeria', 2, 8, 210, 36, 6, 1.6, 'Corcel castaño con barda dorada y lanza de choque.', 'Lámina 4 Izquierda'),
('CABALLERIA', 'Caballero Real', 'caballeria', 3, 12, 340, 58, 10, 1.75, 'Testera dorada real y carga arrolladora contra arcabuceros.', 'Lámina 4 Derecha'),
('MINERO', 'Minero Africano', 'mineria', 1, 3, 80, 8, 1, 0.9, 'Extrae Reales de Plata en las vetas de los Montes de María.', 'Lámina 2 Aliados'),
('MINERO', 'Minero Real', 'mineria', 3, 7, 130, 15, 3, 1.0, 'Casco ligero y doble cesto de mineral puro (2x plata).', 'Lámina 4 Derecha'),
('AGRICULTOR', 'Agricultor Africano', 'agricultura', 1, 3, 80, 6, 0, 0.9, 'Cosecha plátano y yuca en las parcelas de regadío.', 'Lámina 2 Aliados'),
('AGRICULTOR', 'Agricultor Real', 'agricultura', 3, 7, 130, 12, 2, 1.0, 'Riego canalizado y cosecha acelerada con doble rendimiento.', 'Lámina 4 Derecha'),
('CAMPEON_REAL', 'Campeón Real / Guardia del Trono', 'campeon', 3, 14, 400, 65, 12, 1.15, 'Coraza de bronce y oro, escudo de diamante y espada real.', 'Lámina 3')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `catalogo_construcciones` (`tipo_estructura`, `nivel`, `coste_monedas`, `salud_max`, `descripcion`) VALUES
('HOGUERA_CENTRAL', 1, 0, 500, 'Campamento inicial del Palenque con antorchas encendidas.'),
('HOGUERA_CENTRAL', 2, 8, 1000, 'Casa comunal de bahareque y techo de palma.'),
('HOGUERA_CENTRAL', 3, 14, 1800, 'Palenque Fortificado con empalizada doble y estandarte.'),
('HOGUERA_CENTRAL', 4, 20, 3000, 'Fortaleza Autónoma del Reino de la Matuna.'),
('MURALLA_MADERA', 1, 2, 250, 'Estacas afiladas y ramas tejidas.'),
('MURALLA_MADERA', 2, 5, 600, 'Empalizada de troncos reforzados con barro y clavos.'),
('MURALLA_MADERA', 3, 9, 1200, 'Muralla mixta de roca de los Montes de María y troncos de roble.'),
('MURALLA_MADERA', 4, 15, 2200, 'Baluarte de Trinchera con defensas de espinas venenosas.'),
('TORRE_VIGIA', 1, 3, 200, 'Plataforma alta para 1 arquero.'),
('TORRE_VIGIA', 2, 6, 450, 'Torre techada para 2 arqueros con mayor visión.'),
('TORRE_VIGIA', 3, 10, 800, 'Bastión de flechas de fuego y almenas reforzadas.')
ON DUPLICATE KEY UPDATE `coste_monedas` = VALUES(`coste_monedas`);

INSERT INTO `configuracion_juego` (`clave`, `valor`, `descripcion`) VALUES
('duracion_dia_segundos', '90', 'Duración del ciclo diurno'),
('duracion_noche_segundos', '60', 'Duración de la oleada nocturna'),
('tasa_spawn_chiguiros', '25', 'Segundos entre apariciones de presas'),
('version_engine', 'Phaser 3.80 + PixiJS v8 Hybrid', 'Kernel y Renderizador del juego')
ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`);

-- Usuario por defecto para partidas locales
INSERT INTO `jugadores` (`id`, `nombre`) VALUES (1, 'Benkos_Comandante')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);
-- Additive migration: preserves all existing partidas and legacy saves.
CREATE TABLE IF NOT EXISTS partida_estados (
    partida_id INT PRIMARY KEY,
    save_version INT NOT NULL,
    saved_at VARCHAR(40) NOT NULL,
    estado_json LONGTEXT NOT NULL,
    CONSTRAINT fk_estado_partida FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
