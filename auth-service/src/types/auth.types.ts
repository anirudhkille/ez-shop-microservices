export interface IUser {
  id?: string;
  name?: string;
  email: string;
  phone?: string;
  password: string | null;
  googleId?: string;
  avatar?: string;
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  role: string;
  matchPassword(password: string): Promise<boolean>;
}