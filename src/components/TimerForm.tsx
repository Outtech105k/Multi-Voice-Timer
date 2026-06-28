import React, { useState } from 'react';

interface TimerFormProps {
  onAddTimer: (label: string, hours: number, minutes: number, seconds: number) => void;
}

export const TimerForm: React.FC<TimerFormProps> = ({ onAddTimer }) => {
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  const getDefaultLabel = (h: number, m: number, s: number) => {
    const totalSeconds = h * 3600 + m * 60 + s;
    if (totalSeconds % 60 === 0) {
      return `${totalSeconds / 60}分タイマー`;
    } else if (totalSeconds < 60) {
      return `${totalSeconds}秒タイマー`;
    } else {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}分${secs}秒タイマー`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      alert('1秒以上の時間を設定してください。');
      return;
    }

    const finalLabel = label.trim() || getDefaultLabel(hours, minutes, seconds);
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
    if (!label.trim() || label.endsWith('分タイマー') || label.endsWith('秒タイマー')) {
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
            onClick={() => applyPreset(0, 3, 0, '3分タイマー')}
          >
            3分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 5, 0, '5分タイマー')}
          >
            5分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 10, 0, '10分タイマー')}
          >
            10分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 25, 0, '25分タイマー')}
          >
            25分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(0, 45, 0, '45分タイマー')}
          >
            45分
          </button>
          <button
            type="button"
            className="btn btn-preset"
            onClick={() => applyPreset(1, 15, 0, '75分タイマー')}
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
