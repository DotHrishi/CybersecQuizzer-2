import { db } from './db';
import { supabase } from './supabase';
import {
  isCollegeNameMatch,
  normalizeCollegeName,
  DUMMY_COLLEGE_NAME,
  DUMMY_COLLEGE_IDENTIFIER,
} from './collegeNormalization';


const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url')
);

export const dataService = {
  async getUserAttemptToday(userName: string, quizDate: string) {
    const cleanName = userName.trim();
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_attempts')
          .select('*')
          .ilike('userName', cleanName)
          .eq('quizDate', quizDate)
          .maybeSingle();

        if (!error) return data; // Returns record if found, or null if not found
        console.error('Supabase fetch attempt error:', error);
      } catch (err) {
        console.warn('Supabase fetch attempt failed:', err);
      }
    }
    
    try {
      const records: any[] = await db.$queryRaw`
        SELECT * FROM user_attempts
        WHERE LOWER(userName) = LOWER(${cleanName}) AND quizDate = ${quizDate}
        LIMIT 1
      `;
      return records.length > 0 ? records[0] : null;
    } catch (dbErr) {
      console.error('Prisma fallback failed:', dbErr);
      return null;
    }
  },


  async getRandomActiveQuestion() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, questionText, optionA, optionB, optionC, optionD, category, difficulty')
          .eq('active', true);

        if (!error && data && data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          return data[randomIndex];
        }
        if (error) console.error('Supabase question fetch error:', error);
      } catch (err) {
        console.warn('Supabase question fetch failed:', err);
      }
    }

    try {
      const questions: any[] = await db.$queryRaw`
        SELECT id, questionText, optionA, optionB, optionC, optionD, category, difficulty
        FROM questions
        WHERE active = 1
        ORDER BY RANDOM()
        LIMIT 1;
      `;
      return questions && questions.length > 0 ? questions[0] : null;
    } catch (dbErr) {
      console.error('Prisma question fallback failed:', dbErr);
      return null;
    }
  },

  async getQuestionById(id: number) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, correctOption, optionA, optionB, optionC, optionD, category')
          .eq('id', id)
          .single();

        if (!error) return data;
        console.error('Supabase getQuestionById error:', error);
      } catch (err) {
        console.warn('Supabase getQuestionById failed:', err);
      }
    }

    try {
      return await db.question.findUnique({
        where: { id },
        select: { id: true, correctOption: true, optionA: true, optionB: true, optionC: true, optionD: true, category: true },
      });
    } catch (dbErr) {
      console.error('Prisma getQuestionById fallback failed:', dbErr);
      return null;
    }
  },


  async createUserAttempt(data: {
    userName: string;
    quizDate: string;
    isCorrect: boolean;
    score: number;
    bonusPoints: number;
    totalPoints: number;
    responseTimeMs: number;
    category?: string;
  }) {
    const payload = {
      ...data,
      category: data.category || 'General Security',
    };

    if (isSupabaseConfigured) {
      const { data: record, error } = await supabase
        .from('user_attempts')
        .insert(payload)
        .select()
        .single();

      // Graceful Fallback: If remote Supabase user_attempts table does not have 'category' column added yet
      if (error && (error.message?.includes('category') || error.message?.includes('schema cache'))) {
        const { category, ...legacyPayload } = payload;
        const retry = await supabase
          .from('user_attempts')
          .insert(legacyPayload)
          .select()
          .single();

        if (!retry.error && retry.data) {
          return retry.data;
        }
      }

      if (error) {
        console.error('Supabase create attempt error:', error);
        throw new Error(error.message);
      }
      return record;
    }

    try {
      return await db.userAttempt.create({ data: payload });
    } catch (dbErr) {
      console.error('Prisma createUserAttempt fallback failed:', dbErr);
      throw dbErr;
    }
  },


  async getQuestionsCategoryCounts() {
    const countsMap: Record<string, number> = {};

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('category')
          .eq('active', true);

        if (!error && data) {
          data.forEach((q: any) => {
            const cat = q.category || 'General Security';
            countsMap[cat] = (countsMap[cat] || 0) + 1;
          });
          return countsMap;
        }
      } catch (err) {
        console.warn('Supabase getQuestionsCategoryCounts failed:', err);
      }
    }

    try {
      const questions = await db.question.findMany({
        where: { active: true },
        select: { category: true },
      });
      questions.forEach((q: any) => {
        const cat = q.category || 'General Security';
        countsMap[cat] = (countsMap[cat] || 0) + 1;
      });
      return countsMap;
    } catch (dbErr) {
      console.error('Prisma getQuestionsCategoryCounts fallback failed:', dbErr);
      return countsMap;
    }
  },

  async getAllAttempts() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('user_attempts').select('*');
        if (!error && data) return data;
        console.error('Supabase getAllAttempts error:', error);
      } catch (err) {
        console.warn('Supabase getAllAttempts failed:', err);
      }
    }

    try {
      return await db.userAttempt.findMany();
    } catch (dbErr) {
      console.error('Prisma getAllAttempts fallback failed:', dbErr);
      return [];
    }
  },

  async getUserAttempts(userName: string) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_attempts')
          .select('*')
          .ilike('userName', userName)   // case-insensitive match
          .order('createdAt', { ascending: false });

        if (!error && data) return data;
        console.error('Supabase getUserAttempts error:', error);
      } catch (err) {
        console.warn('Supabase getUserAttempts failed:', err);
      }
    }

    try {
      // SQLite doesn't support mode:'insensitive' — use raw LOWER() comparison
      const results: any[] = await db.$queryRaw`
        SELECT * FROM user_attempts
        WHERE LOWER(userName) = LOWER(${userName})
        ORDER BY createdAt DESC
      `;
      return results;
    } catch (dbErr) {
      console.error('Prisma getUserAttempts fallback failed:', dbErr);
      return [];
    }
  },

  async getAllQuestions() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('id', { ascending: true });

        if (!error && data) return data;
        console.error('Supabase getAllQuestions error:', error);
      } catch (err) {
        console.warn('Supabase getAllQuestions failed:', err);
      }
    }

    try {
      return await db.question.findMany({ orderBy: { id: 'asc' } });
    } catch (dbErr) {
      console.error('Prisma getAllQuestions fallback failed:', dbErr);
      return [];
    }
  },

  async createQuestion(questionData: any) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();

      if (error) {
        console.error('Supabase createQuestion error:', error);
        throw new Error(error.message);
      }
      return data;
    }

    try {
      return await db.question.create({ data: questionData });
    } catch (dbErr) {
      console.error('Prisma createQuestion fallback failed:', dbErr);
      throw dbErr;
    }
  },

  async updateQuestion(id: number, questionData: any) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('questions')
        .update({
          ...questionData,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateQuestion error:', error);
        throw new Error(error.message);
      }
      return data;
    }

    try {
      return await db.question.update({ where: { id }, data: questionData });
    } catch (dbErr) {
      console.error('Prisma updateQuestion fallback failed:', dbErr);
      throw dbErr;
    }
  },

  async deleteQuestion(id: number) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteQuestion error:', error);
        throw new Error(error.message);
      }
      return true;
    }

    try {
      await db.question.delete({ where: { id } });
      return true;
    } catch (dbErr) {
      console.error('Prisma deleteQuestion fallback failed:', dbErr);
      return false;
    }
  },

  async resetLeaderboard() {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('user_attempts').delete().neq('id', 0);
      if (error) {
        console.error('Supabase resetLeaderboard error:', error);
        throw new Error(error.message);
      }
      return true;
    }

    try {
      await db.userAttempt.deleteMany();
      return true;
    } catch (dbErr) {
      console.error('Prisma resetLeaderboard fallback failed:', dbErr);
      return false;
    }
  },

  /* ─── College Management ────────────────────────────────── */
  async getOrCreateDummyCollege() {
    try {
      let dummy = await db.college.findFirst({
        where: {
          OR: [
            { identifier: DUMMY_COLLEGE_IDENTIFIER },
            { name: DUMMY_COLLEGE_NAME },
          ],
        },
      });

      if (!dummy) {
        dummy = await db.college.create({
          data: {
            name: DUMMY_COLLEGE_NAME,
            identifier: DUMMY_COLLEGE_IDENTIFIER,
          },
        });
      }

      return dummy;
    } catch (dbErr) {
      console.warn('Prisma getOrCreateDummyCollege fallback used:', dbErr);
      return {
        id: 1,
        name: DUMMY_COLLEGE_NAME,
        identifier: DUMMY_COLLEGE_IDENTIFIER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  },

  async getAllColleges() {
    try {
      const colleges = await db.college.findMany({
        include: {
          _count: {
            select: {
              students: true,
              admins: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return colleges.map(c => ({
        id: c.id,
        name: c.name,
        identifier: c.identifier,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        studentCount: c._count.students,
        adminCount: c._count.admins,
      }));
    } catch (dbErr) {
      console.error('Prisma getAllColleges fallback failed:', dbErr);
      return [];
    }
  },

  async getCollegeById(id: number) {
    try {
      return await db.college.findUnique({
        where: { id },
      });
    } catch (dbErr) {
      console.error('Prisma getCollegeById failed:', dbErr);
      return null;
    }
  },

  async getCollegeByIdentifier(identifier: string) {
    const clean = identifier.trim().toUpperCase();
    try {
      return await db.college.findUnique({
        where: { identifier: clean },
      });
    } catch (dbErr) {
      console.error('Prisma getCollegeByIdentifier failed:', dbErr);
      return null;
    }
  },

  async findCollegeByName(name: string) {
    const norm = normalizeCollegeName(name);
    if (!norm) return null;

    try {
      // First try exact case match or lowercase match
      const allColleges = await db.college.findMany();
      const match = allColleges.find(c => isCollegeNameMatch(norm, c.name));
      return match || null;
    } catch (dbErr) {
      console.error('Prisma findCollegeByName failed:', dbErr);
      return null;
    }
  },

  async createCollege(data: { name: string; identifier: string }) {
    const normName = normalizeCollegeName(data.name);
    const cleanIdentifier = data.identifier.trim().toUpperCase();

    try {
      return await db.college.create({
        data: {
          name: normName,
          identifier: cleanIdentifier,
        },
      });
    } catch (dbErr) {
      console.error('Prisma createCollege failed:', dbErr);
      throw dbErr;
    }
  },

  async updateCollege(id: number, data: { name?: string; identifier?: string }) {
    const payload: any = { updatedAt: new Date() };
    if (data.name !== undefined) payload.name = normalizeCollegeName(data.name);
    if (data.identifier !== undefined) payload.identifier = data.identifier.trim().toUpperCase();

    try {
      return await db.college.update({
        where: { id },
        data: payload,
      });
    } catch (dbErr) {
      console.error('Prisma updateCollege failed:', dbErr);
      throw dbErr;
    }
  },

  async deleteCollege(id: number) {
    try {
      // Check if dummy college
      const college = await db.college.findUnique({ where: { id } });
      if (college && (college.identifier === DUMMY_COLLEGE_IDENTIFIER || college.name === DUMMY_COLLEGE_NAME)) {
        throw new Error('System placeholder dummy college cannot be deleted.');
      }

      await db.college.delete({ where: { id } });
      return true;
    } catch (dbErr) {
      console.error('Prisma deleteCollege failed:', dbErr);
      throw dbErr;
    }
  },

  /* ─── Student Profile & College Association ─────────────── */
  async getUserProfile(nickname: string) {
    const cleanNick = nickname.trim();
    try {
      return await db.userProfile.findUnique({
        where: { nickname: cleanNick },
        include: {
          college: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma getUserProfile fallback failed:', dbErr);
      return null;
    }
  },

  async upsertUserProfile(profileData: {
    fullName: string;
    nickname: string;
    isNicknameSame: boolean;
    email: string;
    emailType: 'college' | 'personal';
    collegeId?: number;
    passwordHash?: string;
  }) {
    let resolvedCollegeId = profileData.collegeId;

    if (!resolvedCollegeId) {
      const dummy = await this.getOrCreateDummyCollege();
      resolvedCollegeId = dummy.id;
    }

    const updateData: any = {
      fullName: profileData.fullName.trim(),
      isNicknameSame: profileData.isNicknameSame,
      email: profileData.email.trim().toLowerCase(),
      emailType: profileData.emailType,
      collegeId: resolvedCollegeId,
    };

    if (profileData.passwordHash) {
      updateData.passwordHash = profileData.passwordHash;
    }

    const createData: any = {
      fullName: profileData.fullName.trim(),
      nickname: profileData.nickname.trim(),
      isNicknameSame: profileData.isNicknameSame,
      email: profileData.email.trim().toLowerCase(),
      emailType: profileData.emailType,
      collegeId: resolvedCollegeId,
      passwordHash: profileData.passwordHash || null,
    };

    try {
      return await db.userProfile.upsert({
        where: { nickname: profileData.nickname.trim() },
        update: updateData,
        create: createData,
        include: {
          college: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma upsertUserProfile fallback failed:', dbErr);
      throw dbErr;
    }
  },

  async resetStudentPassword(nickname: string, passwordHash: string) {
    try {
      return await db.userProfile.update({
        where: { nickname: nickname.trim() },
        data: { passwordHash },
      });
    } catch (dbErr) {
      console.error('Prisma resetStudentPassword failed:', dbErr);
      throw dbErr;
    }
  },

  /* ─── College-Scoped Queries for Admins & Reports ────────── */
  async getStudentsByCollege(collegeId?: number | null) {
    try {
      const whereClause = collegeId ? { collegeId } : {};
      return await db.userProfile.findMany({
        where: whereClause,
        include: {
          college: {
            select: { id: true, name: true, identifier: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.error('Prisma getStudentsByCollege failed:', dbErr);
      return [];
    }
  },

  async getAttemptsByCollege(collegeId?: number | null) {
    try {
      if (!collegeId) {
        // Super admin - return all attempts
        return await db.userAttempt.findMany({
          orderBy: { createdAt: 'desc' },
        });
      }

      // Filter attempts belonging only to students of the specified college
      const collegeStudents = await db.userProfile.findMany({
        where: { collegeId },
        select: { nickname: true },
      });

      const nicknames = collegeStudents.map(s => s.nickname.toLowerCase());
      if (nicknames.length === 0) return [];

      const allAttempts = await db.userAttempt.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return allAttempts.filter(a => nicknames.includes(a.userName.trim().toLowerCase()));
    } catch (dbErr) {
      console.error('Prisma getAttemptsByCollege failed:', dbErr);
      return [];
    }
  },

  async getStatsByCollege(collegeId?: number | null) {
    try {
      const questions = await this.getAllQuestions();
      const totalQuestions = questions.length;
      const activeQuestions = questions.filter((q: any) => q.active).length;

      const attempts = await this.getAttemptsByCollege(collegeId);
      const totalAttempts = attempts.length;

      const students = await this.getStudentsByCollege(collegeId);
      const totalUsers = students.length > 0
        ? students.length
        : new Set(attempts.map((a: any) => a.userName.toLowerCase())).size;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayAttempts = attempts.filter((a: any) => a.quizDate === todayStr).length;

      return {
        totalQuestions,
        activeQuestions,
        totalAttempts,
        totalUsers,
        todayAttempts,
      };
    } catch (dbErr) {
      console.error('Prisma getStatsByCollege failed:', dbErr);
      throw dbErr;
    }
  },

  async getLeaderboardByCollege(collegeId?: number | null, period = 'daily') {
    const cleanPeriod = (period || 'daily').toLowerCase().replace('-', '');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    let minDateStr = '';
    if (cleanPeriod === 'daily') {
      minDateStr = todayStr;
    } else if (cleanPeriod === 'weekly') {
      const d = new Date(now);
      const dayIndex = d.getDay();
      const diffToMon = d.getDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diffToMon));
      minDateStr = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
    } else if (cleanPeriod === 'monthly') {
      minDateStr = `${year}-${month}-01`;
    } else {
      minDateStr = '1970-01-01';
    }

    try {
      const attempts = await this.getAttemptsByCollege(collegeId);
      const filtered = attempts.filter((a: any) => {
        if (cleanPeriod === 'daily') return a.quizDate === todayStr;
        if (cleanPeriod === 'alltime') return true;
        return a.quizDate >= minDateStr;
      });

      const userStatsMap = new Map<string, {
        userName: string;
        attempts: number;
        correctAnswers: number;
        totalPoints: number;
        totalResponseTime: number;
        lastAttemptDate: string | Date;
      }>();

      for (const attempt of filtered) {
        const key = attempt.userName.trim().toLowerCase();
        const existing = userStatsMap.get(key) || {
          userName: attempt.userName.trim(),
          attempts: 0,
          correctAnswers: 0,
          totalPoints: 0,
          totalResponseTime: 0,
          lastAttemptDate: attempt.createdAt,
        };

        existing.attempts += 1;
        if (attempt.isCorrect) existing.correctAnswers += 1;
        existing.totalPoints += Number(attempt.totalPoints || 0);
        existing.totalResponseTime += Number(attempt.responseTimeMs || 0);

        if (new Date(attempt.createdAt) > new Date(existing.lastAttemptDate)) {
          existing.lastAttemptDate = attempt.createdAt;
        }

        userStatsMap.set(key, existing);
      }

      const aggregated = Array.from(userStatsMap.values()).map((user) => ({
        userName: user.userName,
        attempts: user.attempts,
        correctAnswers: user.correctAnswers,
        totalPoints: Number(user.totalPoints.toFixed(2)),
        avgResponseTimeMs: Math.round(user.totalResponseTime / user.attempts),
        lastAttemptDate: new Date(user.lastAttemptDate).toISOString(),
      }));

      aggregated.sort((a, b) => {
        if (Math.abs(b.totalPoints - a.totalPoints) > 0.001) {
          return b.totalPoints - a.totalPoints;
        }
        if (b.correctAnswers !== a.correctAnswers) {
          return b.correctAnswers - a.correctAnswers;
        }
        return a.avgResponseTimeMs - b.avgResponseTimeMs;
      });

      return aggregated.slice(0, 100).map((item, index) => ({
        rank: index + 1,
        ...item,
      }));
    } catch (dbErr) {
      console.error('Prisma getLeaderboardByCollege failed:', dbErr);
      return [];
    }
  },

  /* ─── Admin Users Management (Super Admin & Admin Auth) ─── */
  async getAdminByEmail(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    try {
      return await db.adminUser.findFirst({
        where: { email: { equals: cleanEmail } },
        include: {
          college: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma getAdminByEmail fallback failed:', dbErr);
      return null;
    }
  },

  async getAdminById(id: number) {
    try {
      return await db.adminUser.findUnique({
        where: { id },
        include: {
          college: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma getAdminById fallback failed:', dbErr);
      return null;
    }
  },

  async getAllAdmins() {
    try {
      return await db.adminUser.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          collegeId: true,
          college: {
            select: {
              id: true,
              name: true,
              identifier: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.error('Prisma getAllAdmins fallback failed:', dbErr);
      return [];
    }
  },

  async createAdmin(data: { email: string; passwordHash: string; name?: string; active?: boolean; collegeId?: number }) {
    const payload: any = {
      email: data.email.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name?.trim() || null,
      active: data.active ?? true,
      collegeId: data.collegeId || null,
    };

    try {
      return await db.adminUser.create({
        data: payload,
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          collegeId: true,
          college: {
            select: { id: true, name: true, identifier: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma createAdmin fallback failed:', dbErr);
      throw dbErr;
    }
  },

  async updateAdmin(id: number, data: { name?: string; active?: boolean; passwordHash?: string; collegeId?: number }) {
    const payload: any = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) payload.name = data.name ? data.name.trim() : null;
    if (data.active !== undefined) payload.active = data.active;
    if (data.passwordHash !== undefined) payload.passwordHash = data.passwordHash;
    if (data.collegeId !== undefined) payload.collegeId = data.collegeId;

    try {
      return await db.adminUser.update({
        where: { id },
        data: payload,
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          collegeId: true,
          college: {
            select: { id: true, name: true, identifier: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma updateAdmin fallback failed:', dbErr);
      throw dbErr;
    }
  },

  async deleteAdmin(id: number) {
    try {
      await db.adminUser.delete({ where: { id } });
      return true;
    } catch (dbErr) {
      console.error('Prisma deleteAdmin fallback failed:', dbErr);
      return false;
    }
  }
};



