<?php
function validateSave($data) {
    if (!is_array($data)) return 'Se requiere un objeto JSON.';
    $name = $data['jugador_nombre'] ?? 'Benkos_Comandante';
    if (!is_string($name) || strlen($name) < 1 || strlen($name) > 50) return 'Nombre de jugador inválido.';
    foreach (['tropas', 'construcciones'] as $key) {
        if (isset($data[$key]) && (!is_array($data[$key]) || count($data[$key]) > 5000)) return 'Demasiadas entidades.';
    }
    if (isset($data['save_version'])) {
        if (!in_array($data['save_version'], [2, 3], true) || !isset($data['snapshot']['state'], $data['snapshot']['nextEntityId'])) return 'Versión de guardado no válida.';
        $state = $data['snapshot']['state'];
        if (!is_array($state) || !isset($state['benkos']) || !is_array($state['benkos'])) return 'Estado del jugador no válido.';
        foreach (['units','enemies','walls','farms','mines','trees','skills','toolRacks','haciendas','horses','wildlife','droppedCoins','corpses','projectiles','particles','waterRipples','floatingTexts'] as $key) {
            if (!isset($state[$key]) || !is_array($state[$key]) || count($state[$key]) > 5000) return 'Estado del mundo incompleto.';
        }
        foreach (['day','timeOfDay','coins','treasuryCoins','armyTier'] as $key) if (!isset($state[$key]) || !is_numeric($state[$key])) return 'Recursos no válidos.';
        if ($data['save_version'] === 3 && (!isset($state['messengers'], $state['campaign']) || !is_array($state['messengers']) || !is_array($state['campaign']))) return 'Campaña incompleta.';
        if ($state['armyTier'] < 1 || $state['armyTier'] > 3 || $state['coins'] < 0 || $state['coins'] > 24) return 'Recursos fuera de rango.';
        if (!isset($data['saved_at']) || !is_string($data['saved_at']) || strlen($data['saved_at']) > 40 || strtotime($data['saved_at']) === false) return 'Fecha de guardado no válida.';
    }
    return null;
}
