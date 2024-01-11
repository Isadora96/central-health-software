import express from "express";
import helmet from "helmet";
import passport from 'passport';
import cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

import { Strategy } from './auth/src/controllers/strategyController';
import jwtRoutes from './auth/src/routes/jwt';
import ssoRoutes from './auth/src/routes/sso';
import routes from "./src/index";
import { Session } from "./auth/src/utils/session";
import cookieSession from "cookie-session";

const app = express();
app.set('port', process.env.PORT || 8080);

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET));
let sess: Session = new Session();

app.use(cookieSession(sess));

app.use(function (req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'Authorization,Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
  });

passport.use(Strategy);
app.use(passport.initialize());
app.use(passport.session());

app.use(ssoRoutes);
app.use(jwtRoutes);

app.use(routes);

export { app };