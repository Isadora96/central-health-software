import { Request, Response, NextFunction, Router } from 'express';
import * as jwt from 'jsonwebtoken';
import * as _ from 'lodash';

const router: Router = Router();

const verifyJwt = (req: Request, res: Response) => {
    try{
        const verifiedToken = jwt.verify(_.split(req.header('Authorization'), ' ')[1], process.env.JWT_SECRET!);
        res.status(200).json(verifiedToken);
    } catch (err: any) {
        console.error(`JWT verification error: ${err.message}`);
        res.status(401).json({error: err.message});
    }
}

router.get('/jwt/verify', verifyJwt);

export default router;
