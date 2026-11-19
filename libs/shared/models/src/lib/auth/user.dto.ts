// The signed-in user, as `GET /api/me` returns it.
export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  // The address of the Google profile picture.
  picture: string | null;
}
