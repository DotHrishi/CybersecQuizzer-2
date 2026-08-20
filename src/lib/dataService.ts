import { db } from './db';
import { supabase } from './supabase';
import {
  isCollegeNameMatch,
  normalizeCollegeName,
  normalizeRegistrationKey,
  DUMMY_COLLEGE_NAME,
  DUMMY_COLLEGE_IDENTIFIER,
} from './collegeNormalization';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url')
);

export const dataService = {
  /* ─── User Attempts ─────────────────────────────────────── */
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

        if (!error) return data || null;
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
          .select('id, scenario, questionText, optionA, optionB, optionC, optionD, category, difficulty')
          .eq('active', true);

        if (!error && data) {
          if (data.length === 0) return null;
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
        SELECT id, scenario, questionText, optionA, optionB, optionC, optionD, category, difficulty
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
          .select('id, scenario, correctOption, optionA, optionB, optionC, optionD, category')
          .eq('id', id)
          .maybeSingle();

        if (!error) return data || null;
        console.error('Supabase getQuestionById error:', error);
      } catch (err) {
        console.warn('Supabase getQuestionById failed:', err);
      }
    }

    try {
      return await db.question.findUnique({
        where: { id },
        select: { id: true, scenario: true, correctOption: true, optionA: true, optionB: true, optionC: true, optionD: true, category: true },
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
          .ilike('userName', userName)
          .order('createdAt', { ascending: false });

        if (!error && data) return data;
        console.error('Supabase getUserAttempts error:', error);
      } catch (err) {
        console.warn('Supabase getUserAttempts failed:', err);
      }
    }

    try {
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
    if (isSupabaseConfigured) {
      try {
        const { data: existing } = await supabase
          .from('colleges')
          .select('*')
          .or(`identifier.eq.${DUMMY_COLLEGE_IDENTIFIER},name.eq.${DUMMY_COLLEGE_NAME}`)
          .maybeSingle();

        if (existing) return existing;

        const { data: created, error } = await supabase
          .from('colleges')
          .insert({
            name: DUMMY_COLLEGE_NAME,
            identifier: DUMMY_COLLEGE_IDENTIFIER,
          })
          .select()
          .single();

        if (!error && created) return created;
      } catch (err) {
        console.warn('Supabase getOrCreateDummyCollege error:', err);
      }
    }

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
    if (isSupabaseConfigured) {
      try {
        const { data: cols, error: colErr } = await supabase
          .from('colleges')
          .select('*')
          .order('name', { ascending: true });

        if (!colErr && cols) {
          const { data: depts } = await supabase
            .from('college_departments')
            .select('id, collegeId, departmentName, registrationKey');
          const { data: students } = await supabase
            .from('user_profiles')
            .select('id, collegeId');
          const { data: admins } = await supabase
            .from('admin_users')
            .select('id, collegeId');

          return cols.map((c: any) => {
            const matchedDepts = depts ? depts.filter((d: any) => Number(d.collegeId) === Number(c.id)) : [];
            const studentCount = students ? students.filter((s: any) => Number(s.collegeId) === Number(c.id)).length : 0;
            const adminCount = admins ? admins.filter((a: any) => Number(a.collegeId) === Number(c.id)).length : 0;
            return {
              id: c.id,
              name: c.name,
              identifier: c.identifier,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
              departmentCount: matchedDepts.length,
              studentCount,
              adminCount,
              departments: matchedDepts,
              _count: {
                departments: matchedDepts.length,
                students: studentCount,
                admins: adminCount,
              },
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getAllColleges error:', err);
      }
    }

    try {
      const colleges = await db.college.findMany({
        include: {
          departments: {
            select: {
              id: true,
              departmentName: true,
              registrationKey: true,
            },
          },
          _count: {
            select: {
              students: true,
              admins: true,
              departments: true,
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
        departmentCount: c._count.departments,
        studentCount: c._count.students,
        adminCount: c._count.admins,
        departments: c.departments,
      }));
    } catch (dbErr) {
      console.error('Prisma getAllColleges fallback failed:', dbErr);
      return [];
    }
  },

  async getCollegeById(id: number) {
    if (isSupabaseConfigured) {
      try {
        const { data: col, error } = await supabase
          .from('colleges')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error) {
          if (!col) return null;
          const { data: depts } = await supabase
            .from('college_departments')
            .select('id, collegeId, departmentName, registrationKey')
            .eq('collegeId', id);
          return { ...col, departments: depts || [] };
        }
      } catch (err) {
        console.warn('Supabase getCollegeById error:', err);
      }
    }

    try {
      return await db.college.findUnique({
        where: { id },
        include: {
          departments: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma getCollegeById failed:', dbErr);
      return null;
    }
  },

  async getCollegeByIdentifier(identifier: string) {
    const clean = identifier.trim().toUpperCase();
    if (isSupabaseConfigured) {
      try {
        const { data: col, error } = await supabase
          .from('colleges')
          .select('*')
          .ilike('identifier', clean)
          .maybeSingle();

        if (!error) {
          if (!col) return null;
          const { data: depts } = await supabase
            .from('college_departments')
            .select('id, collegeId, departmentName, registrationKey')
            .eq('collegeId', col.id);
          return { ...col, departments: depts || [] };
        }
      } catch (err) {
        console.warn('Supabase getCollegeByIdentifier error:', err);
      }
    }

    try {
      return await db.college.findUnique({
        where: { identifier: clean },
        include: {
          departments: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma getCollegeByIdentifier failed:', dbErr);
      return null;
    }
  },

  async findCollegeByName(name: string) {
    const norm = normalizeCollegeName(name);
    if (!norm) return null;

    if (isSupabaseConfigured) {
      try {
        const { data: allColleges, error } = await supabase
          .from('colleges')
          .select('*');

        if (!error && allColleges) {
          const match = allColleges.find((c: any) => isCollegeNameMatch(norm, c.name));
          if (match) {
            const { data: depts } = await supabase
              .from('college_departments')
              .select('id, collegeId, departmentName, registrationKey')
              .eq('collegeId', match.id);
            return { ...match, departments: depts || [] };
          }
          return null;
        }
      } catch (err) {
        console.warn('Supabase findCollegeByName error:', err);
      }
    }

    try {
      const allColleges = await db.college.findMany({
        include: {
          departments: true,
        },
      });
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

    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase
        .from('colleges')
        .insert({
          name: normName,
          identifier: cleanIdentifier,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase createCollege error:', error);
        throw new Error(error.message);
      }
      return created;
    }

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

    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase
        .from('colleges')
        .update({
          ...payload,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateCollege error:', error);
        throw new Error(error.message);
      }
      return updated;
    }

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
    if (isSupabaseConfigured) {
      const { data: college } = await supabase.from('colleges').select('*').eq('id', id).maybeSingle();
      if (college && (college.identifier === DUMMY_COLLEGE_IDENTIFIER || college.name === DUMMY_COLLEGE_NAME)) {
        throw new Error('System placeholder dummy college cannot be deleted.');
      }

      const { error } = await supabase.from('colleges').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteCollege error:', error);
        throw new Error(error.message);
      }
      return true;
    }

    try {
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

  /* ─── College Department & Registration Key Management ───── */
  async findDepartmentByRegistrationKey(key: string) {
    const cleanKey = normalizeRegistrationKey(key);
    if (!cleanKey) return null;

    if (isSupabaseConfigured) {
      try {
        const { data: dept, error } = await supabase
          .from('college_departments')
          .select('*')
          .ilike('registrationKey', cleanKey)
          .maybeSingle();

        if (!error) {
          if (!dept) return null;
          const { data: col } = await supabase
            .from('colleges')
            .select('*')
            .eq('id', dept.collegeId)
            .maybeSingle();
          return { ...dept, college: col || null };
        }
      } catch (err) {
        console.warn('Supabase findDepartmentByRegistrationKey error:', err);
      }
    }

    try {
      const department = await db.collegeDepartment.findUnique({
        where: { registrationKey: cleanKey },
        include: {
          college: true,
        },
      });

      if (department) return department;

      const all = await db.collegeDepartment.findMany({
        include: { college: true },
      });
      return all.find(d => d.registrationKey.trim().toLowerCase() === cleanKey.toLowerCase()) || null;
    } catch (dbErr) {
      console.error('Prisma findDepartmentByRegistrationKey failed:', dbErr);
      return null;
    }
  },

  async getDepartmentById(id: number) {
    if (isSupabaseConfigured) {
      try {
        const { data: dept, error } = await supabase
          .from('college_departments')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error) {
          if (!dept) return null;
          const { data: col } = await supabase
            .from('colleges')
            .select('*')
            .eq('id', dept.collegeId)
            .maybeSingle();
          return { ...dept, college: col || null };
        }
      } catch (err) {
        console.warn('Supabase getDepartmentById error:', err);
      }
    }

    try {
      return await db.collegeDepartment.findUnique({
        where: { id },
        include: {
          college: true,
          _count: {
            select: {
              students: true,
              admins: true,
            },
          },
        },
      });
    } catch (dbErr) {
      console.error('Prisma getDepartmentById failed:', dbErr);
      return null;
    }
  },

  async getDepartmentsByCollege(collegeId: number) {
    if (isSupabaseConfigured) {
      try {
        const { data: departments, error } = await supabase
          .from('college_departments')
          .select('*')
          .eq('collegeId', collegeId)
          .order('departmentName', { ascending: true });

        if (!error && departments) {
          const { data: col } = await supabase.from('colleges').select('*').eq('id', collegeId).maybeSingle();
          return departments.map(d => ({
            ...d,
            college: col || null,
            studentCount: 0,
            adminCount: 0,
          }));
        }
      } catch (err) {
        console.warn('Supabase getDepartmentsByCollege error:', err);
      }
    }

    try {
      const departments = await db.collegeDepartment.findMany({
        where: { collegeId },
        include: {
          college: true,
          _count: {
            select: {
              students: true,
              admins: true,
            },
          },
        },
        orderBy: { departmentName: 'asc' },
      });

      return departments.map(d => ({
        id: d.id,
        collegeId: d.collegeId,
        departmentName: d.departmentName,
        registrationKey: d.registrationKey,
        college: d.college,
        studentCount: d._count?.students || 0,
        adminCount: d._count?.admins || 0,
      }));
    } catch (dbErr) {
      console.error('Prisma getDepartmentsByCollege failed:', dbErr);
      return [];
    }
  },

  async getAllDepartments() {
    if (isSupabaseConfigured) {
      try {
        const { data: departments, error } = await supabase
          .from('college_departments')
          .select('*')
          .order('departmentName', { ascending: true });

        if (!error && departments) {
          const { data: cols } = await supabase.from('colleges').select('*');
          const { data: students } = await supabase.from('user_profiles').select('id, collegeDepartmentId');
          const { data: admins } = await supabase.from('admin_users').select('id, collegeDepartmentId');

          const colMap = new Map((cols || []).map(c => [c.id, c]));

          return departments.map(d => {
            const studentCount = students ? students.filter((s: any) => Number(s.collegeDepartmentId) === Number(d.id)).length : 0;
            const adminCount = admins ? admins.filter((a: any) => Number(a.collegeDepartmentId) === Number(d.id)).length : 0;
            return {
              id: d.id,
              collegeId: d.collegeId,
              departmentName: d.departmentName,
              registrationKey: d.registrationKey,
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
              college: colMap.get(d.collegeId) || null,
              studentCount,
              adminCount,
              _count: {
                students: studentCount,
                admins: adminCount,
              },
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getAllDepartments error:', err);
      }
    }

    try {
      const departments = await db.collegeDepartment.findMany({
        include: {
          college: true,
          _count: {
            select: {
              students: true,
              admins: true,
            },
          },
        },
        orderBy: { departmentName: 'asc' },
      });

      return departments.map(d => ({
        id: d.id,
        collegeId: d.collegeId,
        departmentName: d.departmentName,
        registrationKey: d.registrationKey,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        college: d.college,
        studentCount: d._count?.students || 0,
        adminCount: d._count?.admins || 0,
      }));
    } catch (dbErr) {
      console.error('Prisma getAllDepartments fallback failed:', dbErr);
      return [];
    }
  },

  async createDepartment(data: { collegeId: number; departmentName: string; registrationKey: string }) {
    const cleanName = data.departmentName.trim();
    const cleanKey = normalizeRegistrationKey(data.registrationKey);

    if (!cleanKey) {
      throw new Error('Registration key cannot be empty.');
    }

    const existing = await this.findDepartmentByRegistrationKey(cleanKey);
    if (existing) {
      throw new Error(`Registration key "${cleanKey}" is already in use by another department.`);
    }

    if (isSupabaseConfigured) {
      const { data: dept, error } = await supabase
        .from('college_departments')
        .insert({
          collegeId: data.collegeId,
          departmentName: cleanName,
          registrationKey: cleanKey,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase createDepartment error:', error);
        throw new Error(error.message);
      }

      const { data: col } = await supabase.from('colleges').select('*').eq('id', data.collegeId).maybeSingle();
      return { ...dept, college: col || null };
    }

    try {
      return await db.collegeDepartment.create({
        data: {
          collegeId: data.collegeId,
          departmentName: cleanName,
          registrationKey: cleanKey,
        },
        include: {
          college: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma createDepartment failed:', dbErr);
      throw dbErr;
    }
  },

  async updateDepartment(id: number, data: { departmentName?: string; registrationKey?: string }) {
    const payload: any = { updatedAt: new Date().toISOString() };
    if (data.departmentName !== undefined) payload.departmentName = data.departmentName.trim();
    if (data.registrationKey !== undefined) {
      const cleanKey = normalizeRegistrationKey(data.registrationKey);
      const existing = await this.findDepartmentByRegistrationKey(cleanKey);
      if (existing && existing.id !== id) {
        throw new Error(`Registration key "${cleanKey}" is already in use by another department.`);
      }
      payload.registrationKey = cleanKey;
    }

    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase
        .from('college_departments')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateDepartment error:', error);
        throw new Error(error.message);
      }

      const { data: col } = await supabase.from('colleges').select('*').eq('id', updated.collegeId).maybeSingle();
      return { ...updated, college: col || null };
    }

    try {
      return await db.collegeDepartment.update({
        where: { id },
        data: payload,
        include: {
          college: true,
        },
      });
    } catch (dbErr) {
      console.error('Prisma updateDepartment failed:', dbErr);
      throw dbErr;
    }
  },

  async updateRegistrationKey(departmentId: number, newRegistrationKey: string) {
    const cleanKey = normalizeRegistrationKey(newRegistrationKey);
    if (!cleanKey) {
      throw new Error('Registration key cannot be empty.');
    }

    const existing = await this.findDepartmentByRegistrationKey(cleanKey);
    if (existing && existing.id !== departmentId) {
      throw new Error(`Registration key "${cleanKey}" is already in use.`);
    }

    return this.updateDepartment(departmentId, { registrationKey: cleanKey });
  },

  async deleteDepartment(id: number) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('college_departments').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteDepartment error:', error);
        throw new Error(error.message);
      }
      return true;
    }

    try {
      await db.collegeDepartment.delete({ where: { id } });
      return true;
    } catch (dbErr) {
      console.error('Prisma deleteDepartment failed:', dbErr);
      throw dbErr;
    }
  },

  /* ─── Student Profile & Registration Key Association ─────── */
  async getUserProfile(nickname: string) {
    const cleanNick = nickname.trim();

    if (isSupabaseConfigured) {
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('nickname', cleanNick)
          .maybeSingle();

        if (!error) {
          if (!profile) return null;
          let col = null;
          let dept = null;

          if (profile.collegeId) {
            const { data: colData } = await supabase.from('colleges').select('*').eq('id', profile.collegeId).maybeSingle();
            col = colData || null;
          }

          if (profile.collegeDepartmentId) {
            const { data: deptData } = await supabase.from('college_departments').select('*').eq('id', profile.collegeDepartmentId).maybeSingle();
            if (deptData) {
              const { data: deptCol } = await supabase.from('colleges').select('*').eq('id', deptData.collegeId).maybeSingle();
              dept = { ...deptData, college: deptCol || null };
            }
          }

          return {
            ...profile,
            college: col,
            collegeDepartment: dept,
          };
        }
      } catch (err) {
        console.warn('Supabase getUserProfile error:', err);
      }
    }

    try {
      return await db.userProfile.findUnique({
        where: { nickname: cleanNick },
        include: {
          college: true,
          collegeDepartment: {
            include: {
              college: true,
            },
          },
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
    registrationKey?: string;
    collegeId?: number;
    passwordHash?: string;
  }) {
    const cleanNick = profileData.nickname.trim();
    const existing = await this.getUserProfile(cleanNick);

    let resolvedDepartmentId: number | null = existing?.collegeDepartmentId || null;
    let resolvedCollegeId: number | null = existing?.collegeId || null;

    // Authoritative lookup: If registrationKey provided, resolve college_department
    if (profileData.registrationKey && profileData.registrationKey.trim().length > 0) {
      const dept = await this.findDepartmentByRegistrationKey(profileData.registrationKey);
      if (!dept) {
        throw new Error('Invalid registration key. Please enter a valid key provided by your administrator.');
      }
      resolvedDepartmentId = dept.id;
      resolvedCollegeId = dept.collegeId;
    }

    if (isSupabaseConfigured) {
      const payload: any = {
        fullName: profileData.fullName.trim(),
        nickname: cleanNick,
        isNicknameSame: profileData.isNicknameSame,
        email: profileData.email.trim().toLowerCase(),
        emailType: profileData.emailType,
        collegeId: resolvedCollegeId,
        collegeDepartmentId: resolvedDepartmentId,
        updatedAt: new Date().toISOString(),
      };

      if (profileData.passwordHash) {
        payload.passwordHash = profileData.passwordHash;
      }

      if (existing) {
        const { error } = await supabase
          .from('user_profiles')
          .update(payload)
          .eq('id', existing.id);

        if (error) {
          console.error('Supabase update user profile error:', error);
          throw new Error(error.message);
        }
        return this.getUserProfile(cleanNick);
      } else {
        payload.createdAt = new Date().toISOString();
        const { error } = await supabase
          .from('user_profiles')
          .insert(payload);

        if (error) {
          console.error('Supabase insert user profile error:', error);
          throw new Error(error.message);
        }
        return this.getUserProfile(cleanNick);
      }
    }

    const updateData: any = {
      fullName: profileData.fullName.trim(),
      isNicknameSame: profileData.isNicknameSame,
      email: profileData.email.trim().toLowerCase(),
      emailType: profileData.emailType,
      updatedAt: new Date(),
    };

    if (resolvedDepartmentId !== null) {
      updateData.collegeDepartmentId = resolvedDepartmentId;
    }
    if (resolvedCollegeId !== null) {
      updateData.collegeId = resolvedCollegeId;
    }
    if (profileData.passwordHash) {
      updateData.passwordHash = profileData.passwordHash;
    }

    const createData: any = {
      fullName: profileData.fullName.trim(),
      nickname: cleanNick,
      isNicknameSame: profileData.isNicknameSame,
      email: profileData.email.trim().toLowerCase(),
      emailType: profileData.emailType,
      collegeId: resolvedCollegeId,
      collegeDepartmentId: resolvedDepartmentId,
      passwordHash: profileData.passwordHash || null,
    };

    try {
      return await db.userProfile.upsert({
        where: { nickname: cleanNick },
        update: updateData,
        create: createData,
        include: {
          college: true,
          collegeDepartment: {
            include: {
              college: true,
            },
          },
        },
      });
    } catch (dbErr) {
      console.error('Prisma upsertUserProfile failed:', dbErr);
      throw dbErr;
    }
  },

  async resetStudentPassword(nickname: string, passwordHash: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          passwordHash,
          updatedAt: new Date().toISOString(),
        })
        .ilike('nickname', nickname.trim())
        .select()
        .single();

      if (error) {
        console.error('Supabase resetStudentPassword error:', error);
        throw new Error(error.message);
      }
      return data;
    }

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

  /* ─── Scoped Queries for Admins & Reports ────────────────── */
  async getStudentsByScope(scope?: { collegeId?: number | null; collegeDepartmentId?: number | null }) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('user_profiles').select('*');
        if (scope?.collegeDepartmentId) {
          query = query.eq('collegeDepartmentId', scope.collegeDepartmentId);
        } else if (scope?.collegeId) {
          const { data: colDepts } = await supabase
            .from('college_departments')
            .select('id')
            .eq('collegeId', scope.collegeId);
          const deptIds = (colDepts || []).map((d: any) => d.id);
          if (deptIds.length > 0) {
            query = query.or(`collegeId.eq.${scope.collegeId},collegeDepartmentId.in.(${deptIds.join(',')})`);
          } else {
            query = query.eq('collegeId', scope.collegeId);
          }
        }

        const { data: students, error } = await query.order('createdAt', { ascending: false });
        if (!error && students) {
          const { data: cols } = await supabase.from('colleges').select('id, name, identifier');
          const { data: depts } = await supabase.from('college_departments').select('id, departmentName, registrationKey, collegeId');
          const colMap = new Map((cols || []).map(c => [c.id, c]));
          const deptMap = new Map((depts || []).map(d => [d.id, { ...d, college: colMap.get(d.collegeId) || null }]));

          return students.map((s: any) => ({
            ...s,
            college: s.collegeId ? colMap.get(s.collegeId) || null : null,
            collegeDepartment: s.collegeDepartmentId ? deptMap.get(s.collegeDepartmentId) || null : null,
          }));
        }
      } catch (err) {
        console.warn('Supabase getStudentsByScope error:', err);
      }
    }

    try {
      const whereClause: any = {};
      if (scope?.collegeDepartmentId) {
        whereClause.collegeDepartmentId = scope.collegeDepartmentId;
      } else if (scope?.collegeId) {
        whereClause.OR = [
          { collegeId: scope.collegeId },
          { collegeDepartment: { collegeId: scope.collegeId } },
        ];
      }

      return await db.userProfile.findMany({
        where: whereClause,
        include: {
          college: {
            select: { id: true, name: true, identifier: true },
          },
          collegeDepartment: {
            select: {
              id: true,
              departmentName: true,
              registrationKey: true,
              college: { select: { id: true, name: true, identifier: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.error('Prisma getStudentsByScope failed:', dbErr);
      return [];
    }
  },

  async getAttemptsByScope(scope?: { collegeId?: number | null; collegeDepartmentId?: number | null }) {
    if (isSupabaseConfigured) {
      try {
        if (!scope?.collegeId && !scope?.collegeDepartmentId) {
          const { data: attempts, error } = await supabase
            .from('user_attempts')
            .select('*')
            .order('createdAt', { ascending: false });
          if (!error && attempts) return attempts;
        } else {
          const students = await this.getStudentsByScope(scope);
          const nicknames = students.map((s: any) => s.nickname.toLowerCase());
          if (nicknames.length === 0) return [];

          const { data: attempts, error } = await supabase
            .from('user_attempts')
            .select('*')
            .order('createdAt', { ascending: false });

          if (!error && attempts) {
            return attempts.filter((a: any) => nicknames.includes(a.userName.trim().toLowerCase()));
          }
        }
      } catch (err) {
        console.warn('Supabase getAttemptsByScope error:', err);
      }
    }

    try {
      if (!scope?.collegeId && !scope?.collegeDepartmentId) {
        return await db.userAttempt.findMany({
          orderBy: { createdAt: 'desc' },
        });
      }

      const students = await this.getStudentsByScope(scope);
      const nicknames = students.map(s => s.nickname.toLowerCase());
      if (nicknames.length === 0) return [];

      const allAttempts = await db.userAttempt.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return allAttempts.filter(a => nicknames.includes(a.userName.trim().toLowerCase()));
    } catch (dbErr) {
      console.error('Prisma getAttemptsByScope failed:', dbErr);
      return [];
    }
  },

  async getStatsByScope(scope?: { collegeId?: number | null; collegeDepartmentId?: number | null }) {
    try {
      const questions = await this.getAllQuestions();
      const totalQuestions = questions.length;
      const activeQuestions = questions.filter((q: any) => q.active).length;

      const attempts = await this.getAttemptsByScope(scope);
      const totalAttempts = attempts.length;

      const students = await this.getStudentsByScope(scope);
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
      console.error('Prisma getStatsByScope failed:', dbErr);
      throw dbErr;
    }
  },

  async getLeaderboardByScope(
    scope?: { collegeId?: number | null; collegeDepartmentId?: number | null },
    period = 'daily'
  ) {
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
      const attempts = await this.getAttemptsByScope(scope);
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
      console.error('getLeaderboardByScope failed:', dbErr);
      return [];
    }
  },

  // Backward compatibility aliases
  async getStudentsByCollege(collegeId?: number | null) {
    return this.getStudentsByScope({ collegeId });
  },

  async getAttemptsByCollege(collegeId?: number | null) {
    return this.getAttemptsByScope({ collegeId });
  },

  async getStatsByCollege(collegeId?: number | null) {
    return this.getStatsByScope({ collegeId });
  },

  async getLeaderboardByCollege(collegeId?: number | null, period = 'daily') {
    return this.getLeaderboardByScope({ collegeId }, period);
  },

  /* ─── Admin Users Management (Super Admin & Admin Auth) ─── */
  async getAdminByEmail(email: string) {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      try {
        const { data: admin, error } = await supabase
          .from('admin_users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!error) {
          if (!admin) return null;
          let col = null;
          let dept = null;

          if (admin.collegeId) {
            const { data: colData } = await supabase.from('colleges').select('*').eq('id', admin.collegeId).maybeSingle();
            col = colData || null;
          }

          if (admin.collegeDepartmentId) {
            const { data: deptData } = await supabase.from('college_departments').select('*').eq('id', admin.collegeDepartmentId).maybeSingle();
            if (deptData) {
              const { data: deptCol } = await supabase.from('colleges').select('*').eq('id', deptData.collegeId).maybeSingle();
              dept = { ...deptData, college: deptCol || null };
            }
          }

          return {
            ...admin,
            college: col,
            collegeDepartment: dept,
          };
        }
      } catch (err) {
        console.warn('Supabase getAdminByEmail error:', err);
      }
    }

    try {
      return await db.adminUser.findFirst({
        where: { email: { equals: cleanEmail } },
        include: {
          college: true,
          collegeDepartment: {
            include: {
              college: true,
            },
          },
        },
      });
    } catch (dbErr) {
      console.error('Prisma getAdminByEmail fallback failed:', dbErr);
      return null;
    }
  },

  async getAdminById(id: number) {
    if (isSupabaseConfigured) {
      try {
        const { data: admin, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error) {
          if (!admin) return null;
          let col = null;
          let dept = null;

          if (admin.collegeId) {
            const { data: colData } = await supabase.from('colleges').select('*').eq('id', admin.collegeId).maybeSingle();
            col = colData || null;
          }

          if (admin.collegeDepartmentId) {
            const { data: deptData } = await supabase.from('college_departments').select('*').eq('id', admin.collegeDepartmentId).maybeSingle();
            if (deptData) {
              const { data: deptCol } = await supabase.from('colleges').select('*').eq('id', deptData.collegeId).maybeSingle();
              dept = { ...deptData, college: deptCol || null };
            }
          }

          return {
            ...admin,
            college: col,
            collegeDepartment: dept,
          };
        }
      } catch (err) {
        console.warn('Supabase getAdminById error:', err);
      }
    }

    try {
      return await db.adminUser.findUnique({
        where: { id },
        include: {
          college: true,
          collegeDepartment: {
            include: {
              college: true,
            },
          },
        },
      });
    } catch (dbErr) {
      console.error('Prisma getAdminById fallback failed:', dbErr);
      return null;
    }
  },

  async getAllAdmins() {
    if (isSupabaseConfigured) {
      try {
        const { data: adminList, error } = await supabase
          .from('admin_users')
          .select('*')
          .order('createdAt', { ascending: false });

        if (!error && adminList) {
          const { data: cols } = await supabase.from('colleges').select('id, name, identifier');
          const { data: depts } = await supabase.from('college_departments').select('id, departmentName, registrationKey, collegeId');
          const colMap = new Map((cols || []).map(c => [c.id, c]));
          const deptMap = new Map((depts || []).map(d => [d.id, { ...d, college: colMap.get(d.collegeId) || null }]));

          return adminList.map((a: any) => ({
            id: a.id,
            email: a.email,
            name: a.name,
            active: a.active,
            collegeId: a.collegeId,
            collegeDepartmentId: a.collegeDepartmentId,
            college: a.collegeId ? colMap.get(a.collegeId) || null : null,
            collegeDepartment: a.collegeDepartmentId ? deptMap.get(a.collegeDepartmentId) || null : null,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          }));
        }
      } catch (err) {
        console.warn('Supabase getAllAdmins error:', err);
      }
    }

    try {
      return await db.adminUser.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          collegeId: true,
          collegeDepartmentId: true,
          college: {
            select: {
              id: true,
              name: true,
              identifier: true,
            },
          },
          collegeDepartment: {
            select: {
              id: true,
              departmentName: true,
              registrationKey: true,
              college: {
                select: {
                  id: true,
                  name: true,
                  identifier: true,
                },
              },
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

  async createAdmin(data: {
    email: string;
    passwordHash: string;
    name?: string;
    active?: boolean;
    collegeId?: number;
    collegeDepartmentId?: number;
  }) {
    let resolvedCollegeId = data.collegeId || null;
    if (data.collegeDepartmentId && !resolvedCollegeId) {
      const dept = await this.getDepartmentById(data.collegeDepartmentId);
      if (dept) resolvedCollegeId = dept.collegeId;
    }

    const payload: any = {
      email: data.email.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name?.trim() || null,
      active: data.active ?? true,
      collegeId: resolvedCollegeId,
      collegeDepartmentId: data.collegeDepartmentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase
        .from('admin_users')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Supabase createAdmin error:', error);
        throw new Error(error.message);
      }

      return this.getAdminById(created.id);
    }

    try {
      return await db.adminUser.create({
        data: payload,
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          collegeId: true,
          collegeDepartmentId: true,
          college: {
            select: { id: true, name: true, identifier: true },
          },
          collegeDepartment: {
            select: {
              id: true,
              departmentName: true,
              registrationKey: true,
              college: { select: { id: true, name: true, identifier: true } },
            },
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

  async updateAdmin(
    id: number,
    data: {
      name?: string;
      active?: boolean;
      passwordHash?: string;
      collegeId?: number | null;
      collegeDepartmentId?: number | null;
    }
  ) {
    const payload: any = {
      updatedAt: new Date().toISOString(),
    };
    if (data.name !== undefined) payload.name = data.name ? data.name.trim() : null;
    if (data.active !== undefined) payload.active = data.active;
    if (data.passwordHash !== undefined) payload.passwordHash = data.passwordHash;
    if (data.collegeId !== undefined) payload.collegeId = data.collegeId;
    if (data.collegeDepartmentId !== undefined) {
      payload.collegeDepartmentId = data.collegeDepartmentId;
      if (data.collegeDepartmentId && !data.collegeId) {
        const dept = await this.getDepartmentById(data.collegeDepartmentId);
        if (dept) payload.collegeId = dept.collegeId;
      }
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('admin_users')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('Supabase updateAdmin error:', error);
        throw new Error(error.message);
      }

      return this.getAdminById(id);
    }

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
          collegeDepartmentId: true,
          college: {
            select: { id: true, name: true, identifier: true },
          },
          collegeDepartment: {
            select: {
              id: true,
              departmentName: true,
              registrationKey: true,
              college: { select: { id: true, name: true, identifier: true } },
            },
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
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteAdmin error:', error);
        throw new Error(error.message);
      }
      return true;
    }

    try {
      await db.adminUser.delete({ where: { id } });
      return true;
    } catch (dbErr) {
      console.error('Prisma deleteAdmin fallback failed:', dbErr);
      return false;
    }
  }
};
