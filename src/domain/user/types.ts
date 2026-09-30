export type UserId = string;

export interface UserProfile {
  id: UserId;
  email: string;
  displayName?: string;
  countryCode?: string;
  createdAt: string;
  updatedAt: string;
}
