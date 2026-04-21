export interface CreateUserRequest {
  nama: string;
  username: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  nama: string;
  username: string;
  newPassword?: string;
  confirmPassword?: string;
  role: string;
}

export interface User {
  userId: string;      
  nama: string;
  username: string;
  role: string;
  status: string;
  createdDate: string; 
  updatedAt?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CurrentUser { 
  nama: string;
  username: string;
  role: string;
}