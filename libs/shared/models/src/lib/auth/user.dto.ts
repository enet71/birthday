// The signed-in user, as `GET /api/me` returns it.
export interface UserDto {
  id: string;
  email: string;
  name: string | null;
}
