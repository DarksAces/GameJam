import { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/firebase';

export default function Leaderboard({ onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      const data = await getLeaderboard();
      setScores(data);
      setLoading(false);
    };
    fetchScores();
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content leaderboard-modal">
        <h2>Clasificaciones</h2>
        
        {loading ? (
          <p>Cargando ranking...</p>
        ) : (
          <div className="ranking-table">
            <div className="ranking-header">
              <span>Pos</span>
              <span>Nombre</span>
              <span>Puntos</span>
            </div>
            {scores.length === 0 ? (
              <p style={{marginTop: '1rem'}}>No hay puntajes aún</p>
            ) : (
              scores.map((entry, index) => (
                <div key={index} className="ranking-row">
                  <span className="rank">#{index + 1}</span>
                  <span className="name">{entry.name}</span>
                  <span className="score">{entry.score}</span>
                </div>
              ))
            )}
          </div>
        )}

        <button className="btn" style={{marginTop: '2rem'}} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
