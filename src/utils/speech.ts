/**
 * Web Speech API (speechSynthesis) を使用した音声読み上げサービス
 * iPad / iOS Safari 特有の自動再生ポリシー・バグ・フリーズ対策に対応
 */

// 発話キューを管理するための簡易ロック
let isSpeaking = false;
const speechQueue: string[] = [];

// SafariのGC（ガベージコレクション）による発話バグを防ぐための参照保持用Set
const activeUtterances = new Set<SpeechSynthesisUtterance>();

// ボイスのキャッシュ
let cachedJaVoice: SpeechSynthesisVoice | null = null;

/**
 * 日本語対応ボイスを取得・キャッシュする
 */
const loadVoices = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const jaVoice = voices.find(
        (v) => v.lang === 'ja-JP' || v.lang.startsWith('ja') || v.lang.toLowerCase().includes('ja')
      );
      if (jaVoice) {
        cachedJaVoice = jaVoice;
        return jaVoice;
      }
    }
  } catch (e) {
    console.warn('Failed to load voices:', e);
  }
  return cachedJaVoice;
};

// ページのロードなどで音声リストが非同期に更新された場合のイベントハンドリング
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
    processQueue();
  };
}

const processQueue = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const synth = window.speechSynthesis;

  // Safariのポーズバグ対策として、再生前にresumeを実行
  if (synth.paused) {
    synth.resume();
  }

  if (isSpeaking || speechQueue.length === 0) return;

  const nextText = speechQueue.shift();
  if (!nextText) return;

  isSpeaking = true;
  const utterance = new SpeechSynthesisUtterance(nextText);
  utterance.lang = 'ja-JP';

  const jaVoice = loadVoices();
  if (jaVoice) {
    utterance.voice = jaVoice;
  }

  // 参照を保持してGCを防ぐ
  activeUtterances.add(utterance);

  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    clearTimeout(timeoutId);
    activeUtterances.delete(utterance);
    isSpeaking = false;
  };

  // Safari等のブラウザで、onendやonerrorが呼ばれずにフリーズするバグに対するセーフティネット
  // 発話文字列の長さに応じてタイムアウト時間を変動させる (1文字あたり350ms, 最低4秒)
  const timeoutDuration = Math.max(4000, nextText.length * 350);

  const timeoutId = setTimeout(() => {
    console.warn('Speech synthesis timed out, resetting queue:', nextText);
    try {
      synth.cancel();
    } catch (e) {
      console.warn('synth.cancel failed during timeout:', e);
    }
    cleanup();
    processQueue();
  }, timeoutDuration);

  utterance.onend = () => {
    cleanup();
    processQueue();
  };

  utterance.onerror = (e) => {
    console.error('Speech synthesis error:', e);
    cleanup();
    processQueue();
  };

  try {
    synth.speak(utterance);
  } catch (err) {
    console.error('synth.speak exception:', err);
    cleanup();
    processQueue();
  }
};

export const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis is not supported in this browser.');
    return;
  }

  speechQueue.push(text);
  processQueue();
};

/**
 * Safari (iOS/iPadOS) などの自動再生ポリシー対策用。
 * ユーザーのタップ/クリック等の直接のジェスチャー（同期コールスタック内）で呼び出す。
 */
export const unlockSpeechSynthesis = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    const synth = window.speechSynthesis;

    loadVoices();

    if (synth.paused) {
      synth.resume();
    }

    // iOS/iPadOS Safari 対策:
    // キューの詰まりをリセットした上で、有効な短文字 ('.') を極小音量 (0.01) かつ超高速 (rate=10) で再生する。
    // ※ iOS Safari では 空文字 (' ') や volume=0 を渡すと Utterance が正常終了せずフリーズの原因となる。
    synth.cancel();

    const dummyUtterance = new SpeechSynthesisUtterance('.');
    dummyUtterance.volume = 0.01;
    dummyUtterance.rate = 10;
    dummyUtterance.lang = 'ja-JP';

    if (cachedJaVoice) {
      dummyUtterance.voice = cachedJaVoice;
    }

    activeUtterances.add(dummyUtterance);

    const removeDummy = () => {
      activeUtterances.delete(dummyUtterance);
    };

    dummyUtterance.onend = removeDummy;
    dummyUtterance.onerror = removeDummy;

    synth.speak(dummyUtterance);
  } catch (e) {
    console.warn('SpeechSynthesis unlock failed:', e);
  }
};
