/**
 * Web Speech API (speechSynthesis) を使用した音声読み上げサービス
 */

// 発話キューを管理するための簡易ロック
let isSpeaking = false;
const speechQueue: string[] = [];

const processQueue = () => {
  if (isSpeaking || speechQueue.length === 0) return;

  const nextText = speechQueue.shift();
  if (!nextText) return;

  isSpeaking = true;
  const utterance = new SpeechSynthesisUtterance(nextText);
  utterance.lang = 'ja-JP';

  // 日本語の音声を探す
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang.startsWith('ja'));
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
  }

  utterance.onend = () => {
    isSpeaking = false;
    processQueue();
  };

  utterance.onerror = (e) => {
    console.error('Speech synthesis error:', e);
    isSpeaking = false;
    processQueue();
  };

  window.speechSynthesis.speak(utterance);
};

export const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis is not supported in this browser.');
    return;
  }

  speechQueue.push(text);
  processQueue();
};

// ページのロードなどで音声リストが非同期に更新された場合のイベントハンドリング
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    // 日本語の音声が利用可能になったらキューを再開可能にする
    processQueue();
  };
}
