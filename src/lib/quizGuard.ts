import { QuizStatusState } from '../types/quiz';
import { getDynamicGuardMessage } from './groqMessageGenerator';

export interface QuizGuardResult {
  isOpen: boolean;
  state: QuizStatusState;
  message: string;
  quizDate: string;
  currentTimeString: string;
}


export function getQuizGuardStatus(overrideDate?: Date): QuizGuardResult {
  const now = overrideDate || new Date();

  // Target timezone: Strictly Indian Standard Time (Asia/Kolkata)
  const timeZone = 'Asia/Kolkata';

  // Extract year, month, day, hour, minute, and weekday in target local timezone
  let partsMap: Record<string, string> = {};
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    });

    formatter.formatToParts(now).forEach(({ type, value }) => {
      partsMap[type] = value;
    });
  } catch (err) {
    // Fallback to UTC if invalid timezone passed
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    });

    formatter.formatToParts(now).forEach(({ type, value }) => {
      partsMap[type] = value;
    });
  }

  const year = partsMap.year;
  const month = partsMap.month;
  const day = partsMap.day;
  const quizDate = `${year}-${month}-${day}`;

  let currentHour = parseInt(partsMap.hour, 10);
  if (currentHour === 24) currentHour = 0;
  const currentMinute = parseInt(partsMap.minute, 10);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const weekdayStr = partsMap.weekday; // 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
  const isWeekend = weekdayStr === 'Sat' || weekdayStr === 'Sun';

  let currentTimeString = '';
  try {
    const displayTimeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    currentTimeString = displayTimeFormatter.format(now);
  } catch (e) {
    currentTimeString = `${currentHour}:${String(currentMinute).padStart(2, '0')}`;
  }

  // Quiz is ACTIVE ALL TIME for now
  return {
    isOpen: true,
    state: 'OPEN',
    message: "Today's quiz is LIVE! Good luck!",
    quizDate,
    currentTimeString,
  };
}


export async function getDynamicQuizGuardStatus(overrideDate?: Date): Promise<QuizGuardResult> {
  const guard = getQuizGuardStatus(overrideDate);
  if (!guard.isOpen) {
    const dynamicMessage = await getDynamicGuardMessage(guard.state, guard.message);
    return {
      ...guard,
      message: dynamicMessage,
    };
  }
  return guard;
}

