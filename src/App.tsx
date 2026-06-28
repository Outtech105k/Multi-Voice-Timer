import { useState, useEffect, useRef } from 'react';
import type { Timer } from './types/timer';
import { TimerForm } from './components/TimerForm';
import { TimerCard } from './components/TimerCard';
import { speak } from './utils/speech';
import './App.css';

function App() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const timersRef = useRef<Timer[]>(timers);

  // タイマーの最新参照を常に保持
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  // マウント時にLocalStorageから復元
  useEffect(() => {
    const saved = localStorage.getItem('agy_timers');
    const savedTimeStr = localStorage.getItem('agy_timers_saved_at');
    
    if (saved && savedTimeStr) {
      try {
        const parsedTimers = JSON.parse(saved) as Timer[];
        const savedTime = parseInt(savedTimeStr, 10);
        const elapsedSinceSave = Math.floor((Date.now() - savedTime) / 1000);

        const restoredTimers = parsedTimers.map((timer) => {
          if (timer.status !== 'running' || !timer.startedAt) {
            return timer;
          }

          // 保存されてから経過した総時間
          const totalElapsed = (timer.accumulatedElapsed || 0) + elapsedSinceSave + Math.floor((Date.now() - timer.startedAt) / 1000);
          
          let nextStatus: Timer['status'] = timer.status;
          let remaining = timer.duration - totalElapsed;
          let accumulatedElapsed = totalElapsed;
          let startedAt: number | undefined = Date.now();
          let voiced30Min = timer.voiced30Min;
          let voiced10Min = timer.voiced10Min;
          let voicedEnd = timer.voicedEnd;

          if (remaining <= 0) {
            remaining = 0;
            nextStatus = 'completed';
            startedAt = undefined;
            accumulatedElapsed = timer.duration;
            // バックグラウンドで完了した場合、自動で発話させない（ユーザーが再度タブを開いた時に突然喋りだすのを防ぐ、または喋らせるか判断）
            // ここではフラグだけ立てておく
            voicedEnd = true;
          } else {
            // バックグラウンド経過中に予告タイミングを過ぎていたらフラグを更新
            if (timer.duration > 3600 && remaining <= 1800) {
              voiced30Min = true;
            }
            if (remaining <= 600) {
              voiced10Min = true;
            }
          }

          return {
            ...timer,
            remaining,
            status: nextStatus,
            startedAt,
            accumulatedElapsed,
            voiced30Min,
            voiced10Min,
            voicedEnd,
          };
        });

        setTimers(restoredTimers);
      } catch (e) {
        console.error('Failed to parse timers from localStorage', e);
      }
    }
  }, []);

  // タイマー状態変更時にLocalStorageに保存
  useEffect(() => {
    localStorage.setItem('agy_timers', JSON.stringify(timers));
    localStorage.setItem('agy_timers_saved_at', Date.now().toString());
  }, [timers]);

  // 高精度インターバルタイマー (200ms周期)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const activeTimers = timersRef.current.filter((t) => t.status === 'running');
      if (activeTimers.length === 0) return;

      setTimers((prevTimers) => {
        let changed = false;

        const nextTimers = prevTimers.map((timer) => {
          if (timer.status !== 'running' || !timer.startedAt) {
            return timer;
          }

          const elapsedSeconds = Math.floor((Date.now() - timer.startedAt) / 1000);
          const currentRemaining = Math.max(0, timer.duration - (timer.accumulatedElapsed + elapsedSeconds));

          // 状態変更がない場合はオブジェクト参照を維持する
          if (
            currentRemaining === timer.remaining &&
            timer.status === 'running'
          ) {
            return timer;
          }

          changed = true;

          let nextStatus: Timer['status'] = timer.status;
          let voiced30Min = timer.voiced30Min;
          let voiced10Min = timer.voiced10Min;
          let voicedEnd = timer.voicedEnd;
          let nextStartedAt: number | undefined = timer.startedAt;
          let nextAccumulatedElapsed = timer.accumulatedElapsed;

          if (currentRemaining <= 0) {
            nextStatus = 'completed';
            nextStartedAt = undefined;
            nextAccumulatedElapsed = timer.duration;

            if (!voicedEnd) {
              speak(`${timer.label}が終了しました。`);
              voicedEnd = true;
            }
          } else {
            // 60分(3600秒)を超える場合のみ30分(1800秒)予告
            if (timer.duration > 3600) {
              if (currentRemaining <= 1800 && !voiced30Min) {
                speak(`${timer.label}、残り30分前。`);
                voiced30Min = true;
              }
            }

            // 10分(600秒)予告
            if (currentRemaining <= 600 && !voiced10Min) {
              speak(`${timer.label}、残り10分前。`);
              voiced10Min = true;
            }
          }

          return {
            ...timer,
            remaining: currentRemaining,
            status: nextStatus,
            startedAt: nextStartedAt,
            accumulatedElapsed: nextAccumulatedElapsed,
            voiced30Min,
            voiced10Min,
            voicedEnd,
          };
        });

        return changed ? nextTimers : prevTimers;
      });
    }, 200);

    return () => clearInterval(intervalId);
  }, []);

  // 音声の事前アンロック（ブラウザの自動再生ポリシー対策）
  const unlockAudio = () => {
    if (!audioUnlocked) {
      speak('音声読み上げ機能を有効化しました。');
      setAudioUnlocked(true);
    }
  };

  // テスト発話
  const handleTestSpeech = () => {
    speak('テストタイマー、残り10分前。');
    setAudioUnlocked(true);
  };

  // 新規タイマー追加
  const handleAddTimer = (label: string, hours: number, minutes: number, seconds: number) => {
    unlockAudio();
    const duration = hours * 3600 + minutes * 60 + seconds;
    const now = Date.now();
    const newTimer: Timer = {
      id: Math.random().toString(36).substring(2, 11),
      label,
      duration,
      remaining: duration,
      status: 'running',
      createdAt: now,
      startedAt: now,
      accumulatedElapsed: 0,
      voiced30Min: false,
      voiced10Min: false,
      voicedEnd: false,
    };
    setTimers((prev) => [newTimer, ...prev]);
  };

  // 一時停止
  const handlePause = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.status !== 'running') return t;
        const elapsedSinceLastStart = t.startedAt ? Math.floor((Date.now() - t.startedAt) / 1000) : 0;
        return {
          ...t,
          status: 'paused',
          startedAt: undefined,
          accumulatedElapsed: t.accumulatedElapsed + elapsedSinceLastStart,
        };
      })
    );
  };

  // 再開
  const handleResume = (id: string) => {
    unlockAudio();
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.status !== 'paused') return t;
        return {
          ...t,
          status: 'running',
          startedAt: Date.now(),
        };
      })
    );
  };

  // リセット
  const handleReset = (id: string) => {
    unlockAudio();
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          remaining: t.duration,
          status: 'running',
          startedAt: Date.now(),
          accumulatedElapsed: 0,
          voiced30Min: false,
          voiced10Min: false,
          voicedEnd: false,
        };
      })
    );
  };

  // 削除
  const handleDelete = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  // 全て一時停止
  const handlePauseAll = () => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.status !== 'running') return t;
        const elapsedSinceLastStart = t.startedAt ? Math.floor((Date.now() - t.startedAt) / 1000) : 0;
        return {
          ...t,
          status: 'paused',
          startedAt: undefined,
          accumulatedElapsed: t.accumulatedElapsed + elapsedSinceLastStart,
        };
      })
    );
  };

  // 全て再開
  const handleResumeAll = () => {
    unlockAudio();
    setTimers((prev) =>
      prev.map((t) => {
        if (t.status !== 'paused') return t;
        return {
          ...t,
          status: 'running',
          startedAt: Date.now(),
        };
      })
    );
  };

  // 全て削除
  const handleClearAll = () => {
    if (window.confirm('すべてのタイマーを削除しますか？')) {
      setTimers([]);
    }
  };

  const activeCount = timers.filter((t) => t.status === 'running').length;
  const pausedCount = timers.filter((t) => t.status === 'paused').length;
  const completedCount = timers.filter((t) => t.status === 'completed').length;

  return (
    <div className="app-container" onClick={unlockAudio}>
      <header className="app-header glass">
        <div className="header-brand">
          <div className="logo-icon">⏱️</div>
          <div>
            <h1>Multi-Voice Timer</h1>
            <p className="subtitle">予告・読み上げ機能付きマルチタイマー</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`btn btn-speech-status ${audioUnlocked ? 'unlocked' : 'locked'}`}
            onClick={handleTestSpeech}
            title={audioUnlocked ? 'クリックしてテスト発話' : 'クリックして音声を有効化'}
          >
            <span className="indicator-dot"></span>
            {audioUnlocked ? '音声読み上げ: 有効' : '音声読み上げ: ロック中（クリックで有効化）'}
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="control-sidebar">
          <TimerForm onAddTimer={handleAddTimer} />

          <div className="dashboard-stats glass">
            <h3>ステータス</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-val text-running">{activeCount}</span>
                <span className="stat-label">実行中</span>
              </div>
              <div className="stat-item">
                <span className="stat-val text-paused">{pausedCount}</span>
                <span className="stat-label">一時停止</span>
              </div>
              <div className="stat-item">
                <span className="stat-val text-completed">{completedCount}</span>
                <span className="stat-label">完了</span>
              </div>
            </div>
            
            {timers.length > 0 && (
              <div className="bulk-actions">
                {activeCount > 0 && (
                  <button onClick={handlePauseAll} className="btn btn-secondary">
                    すべて一時停止
                  </button>
                )}
                {pausedCount > 0 && (
                  <button onClick={handleResumeAll} className="btn btn-primary">
                    すべて再開
                  </button>
                )}
                <button onClick={handleClearAll} className="btn btn-danger">
                  すべてクリア
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="timers-display-section">
          {timers.length === 0 ? (
            <div className="empty-state glass">
              <div className="empty-icon">⏳</div>
              <h2>タイマーが登録されていません</h2>
              <p>左側のフォームからタイマーを追加して、マルチタスクを開始しましょう。</p>
              <p className="hint">※バックグラウンドでブラウザタブを開いていても、タイマーは正確に動作し、音声で予告・通知します。</p>
            </div>
          ) : (
            <div className="timers-grid">
              {timers.map((timer) => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  onPause={handlePause}
                  onResume={handleResume}
                  onReset={handleReset}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>© 2026 Multi-Voice Timer. Deployable on Cloudflare Pages.</p>
      </footer>
    </div>
  );
}

export default App;
