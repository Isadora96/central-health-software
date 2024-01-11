export class Session {
    name: string;
    secret: string;
    maxAge: number;
    httpOnly: boolean;
    domain: string;
    secure: boolean;
    resave: boolean;
    saveUninitialized: boolean;
  
    constructor() {
      this.name = 'CIO_SESSION';
      this.secret = process.env.SESSION_SECRET!;
      this.maxAge = 43200000;
      this.httpOnly = true;
      this.domain = process.env.CIO_domain || '';
      this.secure = false;
      this.resave = true;
      this.saveUninitialized = true;
    }
  }
