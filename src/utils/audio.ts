/**
 * Web Audio API を用いた自作チャイム音再生・ループ管理サービス
 * 外部音声ファイル (.mp3) なしで動作するためオフラインでも安定して再生可能
 */

let audioCtx: AudioContext | null = null;
let alarmIntervalId: number | null = null;
const activeAlarms = new Set<string>();

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

/**
 * Safari等ブラウザの自動再生制限を解除するために、ユーザー操作イベント内で呼び出す
 */
export const unlockAudioContext = (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume()
          .then(() => {
            // iOS/Safari対策: 空のバッファを再生して完全にアクティブにする
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            resolve();
          })
          .catch((err) => {
            console.warn('AudioContext resume failed in unlock:', err);
            resolve();
          });
      } else {
        // すでに running の場合も、念のため空バッファを再生して再生能力を担保する
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        resolve();
      }
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
      resolve();
    }
  });
};


/**
 * 澄んだベルの倍音成分（ハンドベル）をシミュレートして単音を再生
 */
const playBellNote = (
  ctx: AudioContext,
  f0: number,
  startTime: number,
  masterDecay: number,
  maxVolume: number
) => {
  const now = startTime;

  // 各ノートの音量を制御するゲインノード
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(maxVolume, now + 0.005); // 鋭いアタック
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + masterDecay);
  masterGain.connect(ctx.destination);

  // ベルの金属的な響きを作るための非調和倍音成分
  const partials = [
    { ratio: 1.0,   gain: 0.35, decay: masterDecay },
    { ratio: 1.20,  gain: 0.20, decay: masterDecay * 0.77 },
    { ratio: 1.50,  gain: 0.15, decay: masterDecay * 0.66 },
    { ratio: 2.00,  gain: 0.10, decay: masterDecay * 0.44 },
    { ratio: 2.51,  gain: 0.08, decay: masterDecay * 0.27 },
    { ratio: 3.00,  gain: 0.05, decay: masterDecay * 0.16 }
  ];

  partials.forEach((p) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // 基音にはふくよかな三角波、高倍音にはクリアなサイン波を使用
    osc.type = p.ratio === 1.0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f0 * p.ratio, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(p.gain, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(now);
    osc.stop(now + p.decay + 0.1);
  });
};

/**
 * 2音の連続するベル音（キンコン）を再生
 */
export const playChime = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch((err) => {
        console.warn('AudioContext resume failed in playChime:', err);
      });
    }

    const now = ctx.currentTime;

    // 1音目:「キン」- 高音で非常に澄んだ響き (E6: 1318.51Hz)
    playBellNote(ctx, 1318.51, now, 1.5, 0.25);

    // 2音目:「コン」- 響きのある中高音 (C6: 1046.50Hz)
    // 0.45秒ずらして再生を開始する
    playBellNote(ctx, 1046.50, now + 0.45, 1.8, 0.25);
  } catch (error) {
    console.error('Web Audio API double bell chime failed:', error);
  }
};

/**
 * 特定のタイマーの完了アラーム（チャイムのループ再生）を開始する
 */
export const startAlarm = (timerId: string) => {
  activeAlarms.add(timerId);

  if (!alarmIntervalId) {
    // 初回は即座に鳴らす
    playChime();

    // 2.5秒おきに「キンコン」を繰り返し再生するループを設定
    alarmIntervalId = window.setInterval(() => {
      if (activeAlarms.size > 0) {
        playChime();
      } else {
        stopAllAlarms();
      }
    }, 2500);
  }
};

/**
 * 特定のタイマーのアラームを停止する
 */
export const stopAlarm = (timerId: string) => {
  activeAlarms.delete(timerId);
  if (activeAlarms.size === 0) {
    stopAllAlarms();
  }
};

/**
 * すべてのアラームを停止する
 */
const stopAllAlarms = () => {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
};
