import React, { useState } from 'react';

interface TimerFormProps {
  onAddTimer: (label: string, hours: number, minutes: number, seconds: number) => void;
}

export const TimerForm: React.FC<TimerFormProps> = ({ onAddTimer }) => {
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      alert('1秒以上の時間を設定してください。');
      return;
    }

    const finalLabel = label.trim() || `タイマー ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    onAddTimer(finalLabel, hours, minutes, seconds);

    // フォームリセット
    setLabel('');
    setHours(0);
    setMinutes(0);
    setSeconds(0);
  };

  const applyPreset = (h: number, m: number, s: number, presetLabel: string) => {
    setHours(h);
    setMinutes(m);
    setSeconds(s);
    if (!label.trim()) {
      setLabel(presetLabel);
    }
  };

  return (
    <form className="timer-form glass" onSubmit={handleSubmit}>
      <h2 className="form-title">新規タイマーの追加</h2>
      
      <div className="form-group">
        <label htmlFor="timer-label">ラベル</label>
        <input
          id="timer-label"
          type="text"
          placeholder="例: パスタを茹でる、ミーティング準備..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={30}
          className="input-text"
        />
      </div>

      <div className="time-inputs-container">
        <div className="form-group time-input-field">
          <label htmlFor="timer-hours">時</label>
          <input
            id="timer-hours"
            type="number"
            min="0"
            max="23"
            value={hours || ''}
            onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
            placeholder="0"
            className="input-number"
          />
        </div>
        <div className="form-group time-input-field">
          <label htmlFor="timer-minutes">分</label>
          <input
            id="timer-minutes"
            type="number"
            min="0"
            max="59"
            value={minutes || ''}
            onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            placeholder="0"
            className="input-number"
          />
        </div>
        <div className="form-group time-input-field">
          <label htmlFor="timer-seconds">秒</label>
          <input
            id="timer-seconds"
            type="number"
            min="0"
            max="59"
            value={seconds || ''}
            onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            placeholder="0"
            className="input-number"
          />
        </div>
      </div>

      <div className="presets-container">
        <span className="presets-title">クイック設定:</span>
        <div className="presets-buttons">
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 3, 0, 'カップラーメン')}
          >
            3分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 5, 0, 'パスタ茹で')}
          >
            5分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 10, 0, '読書時間')}
          >
            10分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 25, 0, 'ポモドーロ')}
          >
            25分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 45, 0, '運動／ヨガ')}
          >
            45分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(1, 15, 0, '長時間タスク')}
          >
            75分
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-submit">
        タイマーを開始する
      </button>
    </form>
  );
};
