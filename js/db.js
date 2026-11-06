/** Persistence adapter: complete versioned saves, local fallback and bounded requests. */
class BenkosDBClient {
  constructor() {
    this.apiBase = new URL('api/', document.baseURI).href.replace(/\/$/, '');
    this.currentPlayer = 'Benkos_Comandante';
    this.isConnected = false;
    this.listeners = [];
    this.currentSaveId = null;
    this.lastLoadStorage = null;
  }
  onStatusChange(fn) { this.listeners.push(fn); }
  notifyStatus(connected) { this.isConnected = connected; this.listeners.forEach(fn => fn({ connected })); }
  read(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  async request(path, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.apiBase}/${path}`, {
        method: payload === undefined ? 'GET' : 'POST', signal: controller.signal, cache: 'no-store',
        headers: { Accept: 'application/json', ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
      return data;
    } finally { clearTimeout(timer); }
  }
  async checkConnection() {
    try { await this.request('status.php'); this.notifyStatus(true); return true; }
    catch { this.notifyStatus(false); return false; }
  }
  async saveGame(gameState) {
    const payload = { jugador_nombre: this.currentPlayer, ...gameState, ...(this.currentSaveId ? { partida_id: this.currentSaveId } : {}) };
    const local = this.write('benkhoos_save_backup', payload);
    // Retry the server on every explicit save so reconnecting never requires a reload.
    try {
      const data = await this.request('save.php', payload);
      this.currentSaveId = data.partida_id;
      payload.partida_id = this.currentSaveId;
      this.write('benkhoos_save_backup', payload);
      this.notifyStatus(true);
      return { ...data, storage: 'server', localBackup: local };
    } catch (error) {
      this.notifyStatus(false);
      return local ? { success: true, storage: 'local', serverError: error.message }
        : { success: false, storage: null, error: 'No se pudo guardar en el servidor ni en este navegador. Revisa el espacio y la conexión.' };
    }
  }
  async loadGame(partidaId = null) {
    const local = this.read('benkhoos_save_backup');
    let remote = null;
    try {
      const query = `jugador=${encodeURIComponent(this.currentPlayer)}${partidaId ? `&partida_id=${encodeURIComponent(partidaId)}` : ''}`;
      const data = await this.request(`load.php?${query}`);
      remote = data.partida;
      this.notifyStatus(true);
    } catch { this.notifyStatus(false); }
    const validLocal = local && (local.jugador_nombre ?? this.currentPlayer) === this.currentPlayer && (!partidaId || local.partida_id === partidaId) ? local : null;
    // A newer offline save must win over an older server copy.
    const localTime = Date.parse(validLocal?.saved_at ?? '') || 0;
    const remoteTime = Date.parse(remote?.saved_at ?? '') || 0;
    const useLocal = validLocal && (!remote || localTime > remoteTime);
    const chosen = useLocal ? validLocal : remote;
    if (!chosen) return null;
    this.lastLoadStorage = useLocal ? 'local' : 'server';
    this.currentSaveId = chosen.partida_id ?? chosen.id ?? null;
    return chosen;
  }
  async loadConfig() { return this.read('benkhoos_config', {}); }
  async saveConfig(patch) {
    const config = { ...this.read('benkhoos_config', {}), ...patch };
    return { success: this.write('benkhoos_config', config), storage: 'local' };
  }
  async recordVictory(stats) {
    const payload = { jugador_nombre: this.currentPlayer, ...stats };
    const records = this.read('benkhoos_records', []);
    const localRecord = { ...stats, jugador: this.currentPlayer, fecha_registro: new Date().toISOString() };
    try { const result = await this.request('leaderboard.php', payload); return result; }
    catch {
      records.push(localRecord); const stored = this.write('benkhoos_records', records.slice(-50));
      return { success: stored, storage: stored ? 'local' : null };
    }
  }
  async getLeaderboard() {
    let remote = [];
    try { remote = (await this.request('leaderboard.php')).leaderboard ?? []; } catch { /* offline records remain available */ }
    return [...remote, ...this.read('benkhoos_records', [])].sort((a,b) => b.puntuacion_final - a.puntuacion_final).slice(0,15);
  }
}
window.BenkosDB = new BenkosDBClient();
