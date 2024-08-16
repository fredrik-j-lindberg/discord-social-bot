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
