export default function LobbyScreen({ username, onCreateGame, onShowLeaderboard }) {
  return (
    <div className="screen lobby-screen">
      <h1>Panel de Control</h1>
      <p>Bienvenido, <strong>{username}</strong></p>
      
      <div className="lobby-actions">
        <button className="btn btn-main" onClick={onCreateGame}>
          Crear Partida
        </button>
        <button className="btn btn-secondary" onClick={onShowLeaderboard}>
          Ver Clasificaciones
        </button>
      </div>
    </div>
  );
}
