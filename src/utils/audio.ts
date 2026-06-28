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
 * 心地よい電子チャイム音（和音のDing-Dong音）を再生
 */
export const playChime = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 音源（Oscillator）の作成
    // 豊かな響きを出すため、周波数の異なる2つのサイン波を合成
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    // 880Hz (A5) から 440Hz (A4) へ滑らかに下降
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 1.2);

    osc2.type = 'sine';
    // 1318.51Hz (E6) から 659.25Hz (E5) へ滑らかに下降
    osc2.frequency.setValueAtTime(1318.51, now);
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 1.2);

    // 音量エンベロープの設定 (アタックが速く、リリースが長い心地よい減衰)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05); // アタック
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2); // リリース

    // 接続
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 再生開始と停止
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  } catch (error) {
    console.error('Web Audio API chime failed:', error);
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

    // 2秒おきにチャイムを繰り返し再生するループを設定
    alarmIntervalId = window.setInterval(() => {
      if (activeAlarms.size > 0) {
        playChime();
      } else {
        stopAllAlarms();
      }
    }, 2000);
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
