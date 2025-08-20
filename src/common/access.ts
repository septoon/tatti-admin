const adminId: string | undefined = process.env.REACT_APP_ADMIN_ID;
const moderatorId: string | undefined = process.env.REACT_APP_MODERATOR_ID;

if (!adminId || !moderatorId) {
  console.error('Admin ID или Moderator ID не определены в переменных окружения.');
}

const adminIdNumber = adminId ? Number(adminId) : NaN;
const moderatorIdNumber = moderatorId ? Number(moderatorId) : NaN;

export const chatIds: number[] = [adminIdNumber, moderatorIdNumber].filter(id => !isNaN(id));
