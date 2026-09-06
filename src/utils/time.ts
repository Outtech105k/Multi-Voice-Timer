/**
 * 時・分・秒を受け取り、60秒→1分、60分→1時間の自動繰り上がりを行った値を返します。
 * @param hours 時
 * @param minutes 分
 * @param seconds 秒
 * @returns 繰り上がり後の { hours, minutes, seconds }
 */
export const normalizeTimeInputs = (
  hours: number,
  minutes: number,
  seconds: number
): { hours: number; minutes: number; seconds: number } => {
  const safeHours = Math.max(0, Math.floor(hours || 0));
  const safeMinutes = Math.max(0, Math.floor(minutes || 0));
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));

  const totalSeconds = safeHours * 3600 + safeMinutes * 60 + safeSeconds;

  const newHours = Math.floor(totalSeconds / 3600);
  const newMinutes = Math.floor((totalSeconds % 3600) / 60);
  const newSeconds = totalSeconds % 60;

  return {
    hours: newHours,
    minutes: newMinutes,
    seconds: newSeconds,
  };
};
