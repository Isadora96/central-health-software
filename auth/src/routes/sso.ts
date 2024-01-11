import { Request, Response, NextFunction, Router } from 'express';
import passport from 'passport';
import * as jwt from 'jsonwebtoken';

const router: Router = Router();

const ssoFailure = (req: Request, res: Response) => {
  res.status(500).send('Authentication has failed, please try again later.');
}

const ssoCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('openidconnect', { session: true },
    (err: any, user: any) => {
      if (err) {
        console.log(err);
        return res.redirect(process.env.CALLBACK_URL + '/sso/failure');
      }
      const token = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRE});
      res.status(200).json({
        authenticated: true, 
        token: token
      });
    })(req, res, next);
}
  
const saveRedirect = (req: Request, res: Response, next: NextFunction) => {
  res.cookie('redirect_uri', req.query.redirect_uri || process.env.CALLBACK_URL, { maxAge: 30000});
  next();  
};


router.get('/sso/failure', ssoFailure);
router.get('/auth/sso/callback', ssoCallback);

router.get('/', [saveRedirect], passport.authenticate('openidconnect'));

export default router;