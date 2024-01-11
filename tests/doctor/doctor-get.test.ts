import request from "supertest";
import { app } from "../../app";
import { Bucket } from "../../src/api/config/bucket";
import jwt from "jsonwebtoken";
import protect from "../../src/api/middleware/auth";

jest.mock('jsonwebtoken', () => ({
    ...jest.requireActual('jsonwebtoken'), // import and retain the original functionalities
    verify: jest.fn().mockReturnValue({ uid: '00000' }), // overwrite verify
}));

jest.mock("../../src/api/config/db");
jest.mock("../../src/api/config/bucket");

const verify = jwt.verify as unknown as jest.MockedFunction<typeof protect>

describe('GET - Patient treatment', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if no token provided', async () => {
        //@ts-ignore
        verify.mockReturnValue({ non_uid: '' });
         await request(app)
            .get('/api/v1/doctor/treatment/patient/some_id')
            .expect(401)
            .expect("Not authorized to access this route");
    });

    it('returns file text', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });

        Bucket.getItem = jest.fn().mockImplementation(() => Promise.resolve({ContentType: 'application/octet-stream', ContentLength: 13, Body: 'treatment content'}));
        const $response = (await Bucket.getItem('some_id-005555').then(data => data));
        await request(app)
            .get('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .set({
                'Cache-Control': 'no-cache',
                'Content-Type': $response.ContentType,
                'Content-Length': $response.ContentLength,
                'Content-Disposition': 'attachment; filename=' + `some_id-005555.txt`,
                'mime-type': 'text/plain'
            })
            .expect(200)
            .expect(Buffer.from('treatment content'));
    });

    it('returns 404 if no file found', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        Bucket.getItem = jest.fn().mockImplementation(() => Promise.reject({ code: "NoSuchKey", message: "some_message" }));

        await request(app)
            .get('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(400)
            .expect({message: `No document found with id some_id`});
    });

    it('returns 500 if any error', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });
        //@ts-ignore
        Bucket.getItem = jest.fn().mockImplementation(() => Promise.reject({}));

        await request(app)
            .get('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(500)
            .expect({message: "Internal Server Error"});
    });
});
