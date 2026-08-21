import { QuizStatusState } from '../types/quiz';

const FALLBACK_MESSAGES: Record<QuizStatusState, string[]> = {
  BEFORE_WINDOW: [
    "Today's cybersecurity quiz is charging up! System access opens strictly at 10:00 AM IST.",
    "Firewalls are arming... today's quiz will be online at 10:00 AM IST. Get ready!",
    "Early bird? Today's challenge unlocks at 10:00 AM IST. Prepare your defense tactics!",
    "Security check in progress. Quiz window opens at 10:00 AM IST — don't miss the Early Bird bonus!",
    "Systems standing by. The quiz arena launches today at 10:00 AM IST. Stay sharp!",
    "Buffering security questions... check back at 10:00 AM IST for today's live attempt!",
    "Threat detection active! Today's daily quiz officially goes live at 10:00 AM IST.",
    "Gear up defender! Today's session unlocks at 10:00 AM IST. Score early for max points!"
  ],
  AFTER_WINDOW: [
    "Today's quiz window has officially closed. Firewalls reset tomorrow at 10:00 AM IST!",
    "Daily security audit complete! Catch the next quiz window tomorrow between 10 AM & 6 PM IST.",
    "Today's session is sealed. Review your logs and return tomorrow at 10:00 AM IST for fresh questions!",
    "Quiz gates locked for the evening. Join us tomorrow at 10:00 AM IST to conquer the leaderboard!",
    "Time's up for today! Sleep tight and be ready for tomorrow's 10:00 AM IST cyber challenge.",
    "System shutdown for today's window. Tomorrow's challenge opens sharp at 10:00 AM IST!",
    "Shift ended! Today's quiz window is closed. Prepare your credentials for 10:00 AM IST tomorrow.",
    "The daily challenge has concluded. Come back tomorrow at 10:00 AM IST to test your skills!"
  ],
  WEEKEND: [
    "Weekend blackout active! Systems are resting — return Monday at 10:00 AM IST for the next round.",
    "Zero-day weekend pause! Recharge your skills and gear up for Monday's 10:00 AM IST quiz.",
    "Cyber defenders deserve weekend downtime! Leaderboards are live, but quizzes resume Monday at 10:00 AM IST.",
    "Firewalls are in maintenance mode for the weekend. We reopen Monday morning at 10:00 AM IST!",
    "No active breaches on weekends! Enjoy your break and prepare for Monday's 10:00 AM IST launch.",
    "Weekend security protocol: rest up! Check your overall rank on the leaderboard and return Monday at 10:00 AM IST.",
    "The quiz arena is offline for Saturday & Sunday. See you bright and early Monday at 10:00 AM IST!",
    "Patching weekend operational! Re-arm your cyber mind and join us Monday at 10:00 AM IST."
  ],
  ALREADY_ATTEMPTED: [
    "Attempt logged! Your score is locked in for today. Return tomorrow at 10:00 AM IST for a new question!",
    "Daily quota filled! Outstanding effort today. Check back tomorrow at 10:00 AM IST for your next challenge.",
    "Your response has been secured in the vault. Check the leaderboard and prepare for tomorrow's 10 AM IST quiz!",
    "Mission accomplished for today! Return tomorrow at 10:00 AM IST to maintain your streak."
  ],
  REGISTRATION_KEY_REQUIRED: [
    "A valid department registration key is required to proceed. Please enter your college key in your profile.",
    "Your 5-day grace period has ended. Obtain your registration key from your department admin to unlock the quiz.",
    "Registration key required! Connect your account to your institution's department to continue playing."
  ],
  PASSWORD_REQUIRED: [
    "Please set a secure student password in your profile to safeguard your account and continue.",
    "Password required! Add a secure password to your student profile to attempt today's quiz.",
    "Account security check: please configure your student profile password to continue."
  ],
  PROFILE_INCOMPLETE: [
    "Your 5-day grace period has ended. Please complete your profile with your department registration key and password.",
    "Profile completion required! Update your student details to participate in today's daily quiz.",
    "Action required: finalize your college department registration key and password to unlock today's challenge."
  ],
  OPEN: [
    "Today's quiz is LIVE! Good luck defender!",
    "System operational! Answer quickly before 11:00 AM IST for Early Bird bonus points!"
  ]
};

function getRandomFallbackMessage(state: QuizStatusState, defaultMsg: string): string {
  const list = FALLBACK_MESSAGES[state] || [];
  if (list.length === 0) return defaultMsg;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

export async function getDynamicGuardMessage(state: QuizStatusState, defaultMsg: string): Promise<string> {
  // If state is OPEN, return standard live message
  if (state === 'OPEN') return defaultMsg;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return getRandomFallbackMessage(state, defaultMsg);
  }

  let promptContext = '';
  if (state === 'BEFORE_WINDOW') {
    promptContext = "The daily cybersecurity quiz is currently closed because it opens at 10:00 AM IST (Monday-Friday). Write a punchy, creative 1-sentence message (under 25 words) telling the user to return at 10:00 AM IST. Vary tone with cybersecurity themes like firewalls, encrypted vaults, zero-day readiness, or defense skills.";
  } else if (state === 'AFTER_WINDOW') {
    promptContext = "Today's daily cybersecurity quiz window (10:00 AM - 9:00 PM IST) has closed for the day. Write a clever, punchy 1-sentence message (under 25 words) encouraging them and telling them to return tomorrow at 10:00 AM IST for the next challenge.";
  } else if (state === 'WEEKEND') {
    promptContext = "The daily cybersecurity quiz is unavailable because it is the weekend (Saturday/Sunday). Write a fun, witty 1-sentence weekend blackout message (under 25 words) reminding users to rest up their cyber defenses and return on Monday at 10:00 AM IST.";
  } else if (state === 'ALREADY_ATTEMPTED') {
    promptContext = "The user has already completed today's single daily cybersecurity quiz attempt. Write an encouraging 1-sentence message (under 25 words) praising their attempt and reminding them to check back tomorrow at 10:00 AM IST.";
  } else {
    return defaultMsg;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout for rapid response

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an energetic cybersecurity quiz host. Respond ONLY with the requested 1-sentence message. Do NOT use quotation marks, markdown, or introductory text.'
          },
          {
            role: 'user',
            content: promptContext
          }
        ],
        temperature: 0.9,
        max_tokens: 60
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return getRandomFallbackMessage(state, defaultMsg);
    }

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content?.trim();

    if (text) {
      // Clean leading/trailing quotes or whitespace
      text = text.replace(/^["']|["']$/g, '').trim();
      return text;
    }
  } catch (err) {
    // Timeout or network error fallback
  }

  return getRandomFallbackMessage(state, defaultMsg);
}
