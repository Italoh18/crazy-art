
import React, { useEffect, useRef, useState } from 'react';
import { X, Trophy, Play, RotateCcw } from 'lucide-react';

interface GameProps {
  onClose: () => void;
}

export const GalaxyGame: React.FC<GameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Refs para estado mutável dentro do requestAnimationFrame
  const gameState = useRef({
    playerX: window.innerWidth / 2,
    projectiles: [] as { x: number; y: number; speed: number; id: number }[],
    enemies: [] as { x: number; y: number; size: number; speed: number; id: number; hp: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    lastShotTime: 0,
    lastEnemyTime: 0,
    score: 0,
    isRunning: false,
    frameCount: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize Handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 0.8; // Ocupa 80% da altura (area da hero section)
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Input Handlers
    const updatePlayerPosition = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      // Clamp values
      gameState.current.playerX = Math.max(20, Math.min(canvas.width - 20, x));
    };

    const handleMouseMove = (e: MouseEvent) => updatePlayerPosition(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Evita scroll
      updatePlayerPosition(e.touches[0].clientX);
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Game Loop
    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      if (!gameState.current.isRunning) return;

      // Limpar tela
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const state = gameState.current;
      state.frameCount++;

      // 1. Player (Cannon)
      ctx.fillStyle = '#fff';
      // Base
      ctx.beginPath();
      ctx.moveTo(state.playerX, canvas.height - 10);
      ctx.lineTo(state.playerX - 15, canvas.height + 10);
      ctx.lineTo(state.playerX + 15, canvas.height + 10);
      ctx.fill();
      // Turret
      ctx.fillStyle = '#F59E0B'; // Primary Color
      ctx.fillRect(state.playerX - 4, canvas.height - 30, 8, 20);

      // 2. Auto Shoot (Every 200ms)
      if (timestamp - state.lastShotTime > 200) {
        state.projectiles.push({
          x: state.playerX,
          y: canvas.height - 30,
          speed: 10,
          id: Math.random()
        });
        state.lastShotTime = timestamp;
      }

      // 3. Spawn Enemies (Difficulty increases with score)
      const spawnRate = Math.max(500, 2000 - (state.score * 10));
      if (timestamp - state.lastEnemyTime > spawnRate) {
        const size = Math.random() * 20 + 15;
        state.enemies.push({
          x: Math.random() * (canvas.width - size * 2) + size,
          y: -size,
          size: size,
          speed: Math.random() * 2 + 1 + (state.score * 0.01),
          id: Math.random(),
          hp: Math.floor(size / 10) // Inimigos maiores tem mais vida
        });
        state.lastEnemyTime = timestamp;
      }

      // 4. Update & Draw Projectiles
      ctx.fillStyle = '#F59E0B';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#F59E0B';
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.y -= p.speed;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (p.y < 0) state.projectiles.splice(i, 1);
      }
      ctx.shadowBlur = 0;

      // 5. Update & Draw Enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        e.y += e.speed;

        // Draw Meteor
        const gradient = ctx.createRadialGradient(e.x, e.y, e.size * 0.2, e.x, e.y, e.size);
        gradient.addColorStop(0, '#DC2626'); // Secondary
        gradient.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();

        // Collision Check (Projectile vs Enemy)
        for (let j = state.projectiles.length - 1; j >= 0; j--) {
          const p = state.projectiles[j];
          const dist = Math.hypot(p.x - e.x, p.y - e.y);
          
          if (dist < e.size) {
            // Hit!
            state.projectiles.splice(j, 1);
            e.hp--;
            
            // Create mini particles on hit
            for(let k=0; k<3; k++) {
                 state.particles.push({
                    x: p.x,
                    y: p.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 1.0,
                    color: '#F59E0B'
                 });
            }

            if (e.hp <= 0) {
              // Destroyed
              state.enemies.splice(i, 1);
              state.score += 10;
              setScore(state.score);

              // Explosion Particles
              for (let k = 0; k < 10; k++) {
                state.particles.push({
                  x: e.x,
                  y: e.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  life: 1.0,
                  color: '#DC2626'
                });
              }
            }
            break; // Break projectile loop
          }
        }

        // Game Over Check (Enemy hits player line)
        if (e.y + e.size > canvas.height - 20) {
           // Simple collision with player x range
           if (Math.abs(e.x - state.playerX) < e.size + 15) {
               gameOverRoutine();
           } else if (e.y > canvas.height) {
               // Missed enemy (optional: penalty?)
               state.enemies.splice(i, 1);
           }
        }
      }

      // 6. Update & Draw Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (p.life <= 0) state.particles.splice(i, 1);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const gameOverRoutine = () => {
      gameState.current.isRunning = false;
      setGameOver(true);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    if (gameStarted && !gameOver) {
      gameState.current.isRunning = true;
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [gameStarted, gameOver]);

  const startGame = () => {
    // Reset State
    gameState.current = {
      ...gameState.current,
      projectiles: [],
      enemies: [],
      particles: [],
      score: 0,
      isRunning: true
    };
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-end animate-fade-in bg-black/40 backdrop-blur-[2px]">
      
      {/* HUD */}
      <div className="absolute top-4 left-0 w-full flex justify-between px-8 z-50">
         <div className="bg-black/60 border border-primary/30 px-4 py-2 rounded-xl text-primary font-bold font-mono text-xl flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Trophy size={20} />
            {score.toString().padStart(6, '0')}
         </div>
         <button 
            onClick={onClose}
            className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-full transition border border-red-500/30"
         >
            <X size={24} />
         </button>
      </div>

      {/* Start Screen */}
      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
            <div className="text-center animate-scale-in">
                <h2 className="text-4xl md:text-6xl font-black text-white font-heading tracking-widest mb-2 text-glow">GALAXY DEFENDER</h2>
                <p className="text-zinc-400 mb-8 font-mono">Controle o canhão. Destrua os meteoros.</p>
                <button 
                    onClick={startGame}
                    className="bg-crazy-gradient text-white px-8 py-4 rounded-full font-bold text-xl hover:scale-110 transition duration-300 shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center gap-3 mx-auto"
                >
                    <Play fill="currentColor" /> INICIAR MISSÃO
                </button>
            </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-red-900/20 backdrop-blur-sm">
            <div className="text-center animate-scale-in bg-black/80 p-10 rounded-3xl border border-red-500/30 shadow-2xl">
                <h2 className="text-4xl font-black text-red-500 font-heading mb-2">GAME OVER</h2>
                <p className="text-white text-xl mb-6 font-mono">Score Final: <span className="text-primary font-bold">{score}</span></p>
                <button 
                    onClick={startGame}
                    className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition flex items-center gap-2 mx-auto"
                >
                    <RotateCcw size={18} /> Tentar Novamente
                </button>
            </div>
        </div>
      )}

      {/* Game Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-[80vh] cursor-crosshair touch-none"
        style={{ pointerEvents: gameStarted && !gameOver ? 'auto' : 'none' }}
      />
      
      {/* Controls Hint */}
      {gameStarted && !gameOver && (
         <div className="absolute bottom-4 text-zinc-500 text-xs font-mono opacity-50 pointer-events-none">
            Mova o mouse ou toque para mirar • Tiro automático
         </div>
      )}
    </div>
  );
};
