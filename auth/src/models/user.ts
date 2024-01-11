export class User {
  uid: string;
  displayName: string;
  preferred_username: string;
  iat?: number;
  exp?: string;
  iss?: string

  constructor(
    uid: string,
    displayName: string,
    preferred_username: string
  ) {
    this.uid = uid;
    this.preferred_username = preferred_username;
    this.displayName = displayName;
  }
}