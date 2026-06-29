export interface AuthUser {
  id: string;
  restaurantId: string;
  roleId: string;
  roleName: string;
  fullName: string;
  email: string;
  username: string;
  permissions: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: { permission: { id: string; name: string } }[];
  _count?: { users: number };
}

export interface Permission {
  id: string;
  name: string;
  description?: string | null;
}

export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

export interface Staff {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phoneNumber?: string | null;
  status: StaffStatus;
  joiningDate?: string | null;
  profileImage?: string | null;
  roleId: string;
  role: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
