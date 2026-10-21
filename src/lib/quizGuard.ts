import { QuizStatusState } from '../types/quiz';

export interface QuizGuardResult {
  isOpen: boolean;
  state: QuizStatusState;
  message: string;
  quizDate: string;
  currentTimeString: string;
}

/**
 * Returns today's quiz date formatted YYYY-MM-DD in Asia/Kolkata (IST).
 */
export function getTodayQuizDate(overrideDate?: Date): string {
  const now = overrideDate || new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Quiz is always available 24/7 without availability window restrictions.
 */
export function getQuizGuardStatus(overrideDate?: Date): QuizGuardResult {
  const quizDate = getTodayQuizDate(overrideDate);
  return {
    isOpen: true,
    state: 'OPEN',
    message: "Today's quiz is available! Good luck!",
    quizDate,
    currentTimeString: '',
  };
}

export async function getDynamicQuizGuardStatus(overrideDate?: Date): Promise<QuizGuardResult> {
  return getQuizGuardStatus(overrideDate);
}

