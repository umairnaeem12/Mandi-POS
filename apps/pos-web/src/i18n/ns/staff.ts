import type { Namespace } from '../entry';

export const staff = {
  title: { en: 'Staff', ar: 'الموظفون' },
  subtitle: { en: 'Manage team members and their access.', ar: 'إدارة أعضاء الفريق وصلاحيات وصولهم.' },
  addStaff: { en: 'Add Staff', ar: 'إضافة موظف' },
  addStaffMember: { en: 'Add Staff Member', ar: 'إضافة موظف جديد' },
  adding: { en: 'Adding…', ar: 'جارٍ الإضافة…' },
  emptyTitle: { en: 'No staff yet', ar: 'لا يوجد موظفون بعد' },
  emptyDesc: {
    en: 'Add your team members to give them access.',
    ar: 'أضف أعضاء فريقك لمنحهم صلاحية الوصول.',
  },
  fullName: { en: 'Full name', ar: 'الاسم الكامل' },
  username: { en: 'Username', ar: 'اسم المستخدم' },
  you: { en: '(you)', ar: '(أنت)' },
  selectRole: { en: 'Select role…', ar: 'اختر الدور…' },
  deleteStaff: { en: 'Delete staff member', ar: 'حذف الموظف' },
  added: { en: 'Staff member added', ar: 'تمت إضافة الموظف' },
  removed: { en: 'Staff member removed', ar: 'تم حذف الموظف' },
  editStaff: { en: 'Edit staff member', ar: 'تعديل الموظف' },
  editTitle: { en: 'Edit {name}', ar: 'تعديل {name}' },
  updated: { en: 'Staff member updated', ar: 'تم تحديث بيانات الموظف' },
  passwordReset: {
    en: 'Staff member updated. Their new password is active and other sessions were signed out.',
    ar: 'تم تحديث بيانات الموظف. كلمة المرور الجديدة مفعّلة وتم تسجيل خروجه من الأجهزة الأخرى.',
  },
  newPassword: { en: 'New password', ar: 'كلمة المرور الجديدة' },
  newPasswordHint: {
    en: 'Leave blank to keep the current password.',
    ar: 'اتركه فارغاً للإبقاء على كلمة المرور الحالية.',
  },
  passwordMin: {
    en: 'Password must be at least 6 characters.',
    ar: 'يجب ألا تقل كلمة المرور عن 6 أحرف.',
  },
  usernameMin: {
    en: 'Username must be at least 3 characters.',
    ar: 'يجب ألا يقل اسم المستخدم عن 3 أحرف.',
  },
  ownRoleLocked: {
    en: "You can't change your own role.",
    ar: 'لا يمكنك تغيير دورك بنفسك.',
  },
  deleteTitle: { en: 'Delete {name}?', ar: 'حذف {name}؟' },
  deleteDesc: {
    en: 'This staff member will be removed and their sessions revoked.',
    ar: 'سيتم حذف هذا الموظف وإنهاء جميع جلساته.',
  },
} satisfies Namespace;
