import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import _ from 'lodash';

declare global {
    namespace Express {
        interface Request {
            currentUser?: string;
        }
    }
}

const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if(!token) {
        return res.status(401).send('Not authorized to access this route');
    }

    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET!);
        req.currentUser = _.get(decode, 'uid');
        next();
    } catch (error) {
        return res.status(401).send('Not authorized to access this route')
    }
};

export default protect;
