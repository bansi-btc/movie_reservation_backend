export type Role = "ADMIN" | "USER";

export type UserType = {
  id: string;
  email: string;
  password: string;
  role: Role;
  createdAt: Date;
  isVerifed: boolean;
  reservations: Reservation[];
};

export type Reservation = {};
