import request from "supertest";
import { app } from "../../app";
import { CloudantClient } from "../../src/api/config/db";
import { Bucket } from "../../src/api/config/bucket";
import jwt from "jsonwebtoken";
import protect from "../../src/api/middleware/auth";

jest.mock('jsonwebtoken', () => ({
    ...jest.requireActual('jsonwebtoken'),
    verify: jest.fn().mockReturnValue({ uid: '00000' })
}));

jest.mock("../../src/api/config/db");
jest.mock("../../src/api/config/bucket");

const verify = jwt.verify as unknown as jest.MockedFunction<typeof protect>

describe('POST - Patient treatment', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if no token provided', async () => {
        //@ts-ignore
        verify.mockReturnValue({ non_uid: '' });
         await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .expect(401)
            .expect("Not authorized to access this route");
    });

    it('returns 400 if content-type not multipart/form-data', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
        
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(400)
            .expect('Content-Type must be multipart/form-data!');
    });

    it('returns 400 if file mimetype not text/plain', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('name', buffer, 'file.pdf')
            .expect(400)
            .expect('File must be text/plain!');
    });

    it('returns 404 if no file or cid in body', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });

        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('name', buffer, 'file.txt')
            .expect(400)
            .expect({ success: false, missing_data: "file or cid" });
    });

    it('returns 400 if there is already a treatment for given patient', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [ { patient: { doctor_uid: "0000" } }] } })
            }
        });
        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(400)
            .expect({ message: 'You already created a treatment for patient some_id, please update.' });
    });

    it('returns 403 if currentUser uid does not match patient doctor_uid', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [ { patient: { doctor_uid: "0001" } }] } })
            }
        });
        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(403)
            .expect({ success: false, message: 'Unauthorized. Patient does not correspond with doctor 0000' });
    });

    it('returns 404 not found', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockRejectedValue({ status: 404, result: { error: "not_found", reason: "not_found" } } )
            }
        });
        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(404)
            .expect({ success: false, message: 'not_found' });
    });

    it('returns 500 if any error', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockRejectedValue({})
            }
        });
        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(500)
            .expect({ message: 'Internal Server Error' });
    });

    it('returns patient treatment file created', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } }),
                get: jest.fn().mockReturnValue({ status: 200 , result: { doctor_uid: "0000" } })
            }
        });

        const buffer = Buffer.from('some data');
        Bucket.createTextFile = jest.fn().mockImplementation(() => Promise.resolve(buffer.toString()));
        let doc = new CloudantClient('doctors');
        doc.insert = jest.fn().mockImplementation(() => Promise.resolve({ status: 201, 
            result: { 
                "ok": true,
                "id": "some-id",
                "rev": "some-rev"
        }}))

        await Promise.all([
            (await Bucket.createTextFile('0000-some-id', buffer.toString())), 
            (await doc.insert({})
            ).result
        ]).then(values => {
            expect(values[0]).toBeTruthy();
            expect(values[1]).toBeTruthy();
        });
    });

    it('returns 403 if currentUser uid does not match patient doctor_uid second trycatch block', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '0001' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } }),
                get: jest.fn().mockReturnValue({ status: 200 , result: { doctor_uid: "0000" } } )
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(403)
            .expect({ success: false, message: 'Unauthorized. Patient does not correspond with doctor 0001' });
    });

    it('returns 500 if any error second trycatch block', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '0001' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } }),
                get: jest.fn().mockRejectedValue({ } )
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(500)
            .expect({ message: 'Internal Server Error' });
    });

    it('returns 404 not found second trycatch block', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0001' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } }),
                get: jest.fn().mockRejectedValue({ status: 404, result: { error: "not_found", reason: "not_found" } } )
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(404)
            .expect({ success: false, reason: 'not_found' });
    });

    it('returns 500 if any error final second trycatch block', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0001' });

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } }),
                get: jest.fn().mockRejectedValue({ })
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .post('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cid', '10')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(500)
            .expect({ message: "Internal Server Error" });
    });
});
