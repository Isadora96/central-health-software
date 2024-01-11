const OpenIDConnectStrategy = require("passport-openidconnect");

import * as _ from 'lodash';
import * as jwt from 'jsonwebtoken';

import { CloudantClient } from '../../../src/api/config/db';
import { User } from '../models/user';
import * as makeLooger from "../../../src/api/logger/logger";

const logger = makeLooger.default;

const CACertPathList = [`/auth/certs/w3id/DigiCertGlobalRootCA.crt`, `/auth/certs/w3id/DigiCertTLSRSASHA256.crt`];

const Strategy = new OpenIDConnectStrategy({  
      discoveryURL: process.env.DISCOVERY_URL!,
      authorizationURL: process.env.AUTHORIZATION_URL!,  
      tokenURL: process.env.TOKEN_URL!,  
      clientID: process.env.CLIENT_ID!,  
      scope: 'openid',  
      response_type: 'code',  
      clientSecret: process.env.CLIENT_SECRET!,  
      callbackURL: process.env.CALLBACK_URL! + '/auth/sso/callback',  
      skipUserProfile: true,  
      issuer: process.env.ISSUER_ID!,
      passReqToCallback: true,
      addCACert: true,
      CACertPathList: CACertPathList
    },  
  async function(req: any, iss: string, sub: string, profile: any, accessToken: string, refreshToken: string, params: any, done: any)  {  
    if(!accessToken) {
      return done(null, false);
    }
    const token = await transformAccessToken(accessToken);
    done(null, token); 
});

const transformAccessToken = async (accessToken: string) => {
  const decoded = jwt.decode(accessToken);
  const user = {
    uid: _.get(decoded, 'uid')!,
    displayName: _.get(decoded, 'displayName')!,
    preferred_username: _.get(decoded, 'preferred_username')!,
    iat: _.get(decoded,'iat'),
    iss: process.env.JWT_ISSUER_NAME
  }
  let userCloudant = new CloudantClient('users');
  const { result } = await userCloudant.query({"uid": user.uid}, ["uid"], 1);
  if(!result.docs.length) {
    const newUser = new User(user.uid, user.displayName, user.preferred_username);
    const response = await userCloudant.insert(newUser);
    if(response.status === 201) {
      logger.info({
        type: 'LOG_TYPE_1',
        message: `New user ${user.displayName}`
      })
    }
  }
  return user;
}

export { Strategy };

