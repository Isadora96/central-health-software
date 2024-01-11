declare module 'passport-idaas-openidconnect' {
    import { Request } from 'express';
    import {Strategy } from 'passport';

    type params = {
      expires_in: number
    }
  
    type verify = (
      req: Request,
      iss: string,
      sub: string,
      profile: object,
      accessToken: string,
      refreshToken: string,
      params: params,
      done: any
    ) => void;
    type options = {
      discoveryURL: string;
      authorizationURL: string;
      tokenURL: string;
      clientID: string;
      scope: string;
      response_type: string;
      clientSecret: string;
      callbackURL: string;
      issuer: string;
      CACertPathList: string[];
      addCACert: boolean;
      skipUserProfile: boolean;
      passReqToCallback: boolean;
    };
  
    declare class IDaaSOIDCStrategy extends Strategy {
      constructor(options: options, verify: verify);
    }

}
