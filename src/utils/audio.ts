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
 * 美しく澄んだベル音（ハンドベル／クリスタルベル）を再生
 */
export const playChime = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // 基音の周波数 (A5: 880Hz) - 明るく澄んだ音高
    const f0 = 880;

    // ベル音を構成する非調和倍音（Partial）の定義: [周波数比率, 音量比率, 減衰比率]
    // ベルの金属的な響き（不協和音成分）を作るためにわずかに不規則な比率を使用します
    const partials = [
      { ratio: 1.0,   gain: 0.35, decay: 1.8 }, // 基音 (Fundamental)
      { ratio: 1.20,  gain: 0.20, decay: 1.4 }, // 金属質な特徴を出す短三度成分
      { ratio: 1.50,  gain: 0.15, decay: 1.2 }, // 完全五度
      { ratio: 2.00,  gain: 0.10, decay: 0.8 }, // 1オクターブ上
      { ratio: 2.51,  gain: 0.08, decay: 0.5 }, // 非調和高周波
      { ratio: 3.00,  gain: 0.05, decay: 0.3 }  // 高調波
    ];

    // 全体の音量を制御するマスタゲイン（急峻なアタックと滑らかなリリースの全体包絡線）
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.3, now + 0.005); // 0.005秒で最大音量へ（叩くアタック感）
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0); // 2秒かけて自然にフェードアウト
    masterGain.connect(ctx.destination);

    // 各倍音成分の発振器を起動
    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // 基音には少しふくよかさを出すために三角波、高調波には澄んだサイン波を使用
      osc.type = p.ratio === 1.0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f0 * p.ratio, now);

      // 個々の倍音エンベロープ（高音域ほど速く減衰する物理法則を再現）
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(p.gain, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(now);
      // 再生終了後にリソースを解放するため停止時間を設定
      osc.stop(now + p.decay + 0.1);
    });
  } catch (error) {
    console.error('Web Audio API bell chime failed:', error);
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
