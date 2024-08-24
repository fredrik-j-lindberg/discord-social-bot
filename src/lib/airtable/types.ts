export type UserData = {
  guildId: string;
  userId: string;
  username: string;
  displayName?: string;
  firstName?: string;
  birthday?: string;
  nextBirthday?: string; // Formula based on birthday
  age?: string; // Formula based on birthday
  phoneNumber?: string;
  email?: string;
  height?: number;
};

export type UserDataPost = {
  guildId: string;
  userId: string;
  username: string;
  displayName?: string | null;
  firstName?: string | null;
  birthday?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  height?: number | null;
};
