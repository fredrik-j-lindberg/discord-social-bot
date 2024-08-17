export type UserData = {
  guildId: string;
  userId: string;
  username: string;
  nickname?: string;
  firstName?: string;
  birthday?: string;
  birthdayMonth?: string; // Formatted birthday column as "MM-DD"
  nextBirthday?: string; // Formula based next birthday
  phoneNumber?: string;
  email?: string;
  height?: number;
};

export type UserDataPost = {
  guildId: string;
  userId: string;
  username: string;
  nickname?: string | null;
  firstName?: string | null;
  birthday?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  height?: number | null;
};
