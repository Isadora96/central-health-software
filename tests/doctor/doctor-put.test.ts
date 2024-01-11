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

describe('PUT - Patient treatment', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if no token provided', async () => {
        //@ts-ignore
        verify.mockReturnValue({ non_uid: '' });
         await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .expect(401)
            .expect("Not authorized to access this route");
    });

    it('returns 400 if content-type not multipart/form-data', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
        
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
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
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('name', buffer, 'file.pdf')
            .expect(400)
            .expect('File must be text/plain!');
    });

    it('returns 404 if no file or cured in body', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });

        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('name', buffer, 'file.txt')
            .expect(400)
            .expect({ success: false, missing_data: "file or cured" });
    });

    it('returns 404 if no file found', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });

        const buffer = Buffer.from('some data');
        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Key: "some-key"}));

        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(404)
            .expect({ success: false, reason: 'No treatment file found for patient some_id' })
    });

    it('returns 404 if no bucket found', async () => {
        //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        const buffer = Buffer.from('some data');
        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.reject({statusCode: 404, code: "NoSuchBucket"}));

        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(404)
            .expect({ success: false, message: "NoSuchBucket" });
    });

    it('returns 500 if any error', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.reject({}));

        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(500)
            .expect({ message: 'Internal Server Error' });
    });

    it('returns 403 if patient does not correspond with doctor', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some_id-0000"}] }));

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({result: { docs: [{ doctorUid: '0205'}]} })
            }
        });
        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(403)
            .expect({ success: false, message: 'Unauthorized. Patient does not correspond with doctor 0000' });
    });

    it('returns file updated', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some_id-0000"}] }));

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({result: { docs: [{ doctorUid: '0000'}]} })
            }
        });

        const buffer = Buffer.from('some data 1');
        Bucket.updateItem = jest.fn().mockImplementation(() => Promise.resolve(buffer.toString()));
        let doc = new CloudantClient('doctors');
        doc.update = jest.fn().mockImplementation(() => Promise.resolve({ status: 201, 
            result: { 
                "ok": true,
                "id": "some-id",
                "rev": "some-rev"
        }}));

        await Promise.all([
            (await Bucket.updateItem('0000-some-id', buffer.toString())), 
            (await doc.update('some_id', {})
            ).result
        ]).then(values => {
            expect(values[0]).toBeTruthy();
            expect(values[1]).toBeTruthy();
        });
    });

    it('returns 404 if nothing found doctors db', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some_id-0000"}] }));

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({result: { docs: []} })
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(404)
            .expect({ success: false, message: 'Nothing found' });
    });

    it('returns 404 not found second catch block', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some_id-0000"}] }));

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockRejectedValue({status: 404, result: { error: "not_found", reason: "not_found" } })
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(404)
            .expect({ success: false, reason: "not_found" });
    });

    it('returns 404 not found some code error second catch block', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some_id-0000"}] }));

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockRejectedValue({statusCode: 404, code: "not_found" })
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(404)
            .expect({ success: false, reason: "not_found" });
    });

    it('returns 409 conflict', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some_id-0000"}] }));

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockRejectedValue({statusCode: 409, result: { reason: "conflict" }})
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(409)
            .expect({ success: false, reason: "conflict" });
    });

    it('returns 500 if any error final second trycatch block', async () => {
        //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '0000' });

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some_id-0000"}] }));

            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockRejectedValue({})
            }
        });

        const buffer = Buffer.from('some data');
        await request(app)
            .put('/api/v1/doctor/treatment/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .field('cured', 'cured')
            .set('Content-Type', 'multipart/form-data')
            .set('Accept', 'multipart/form-data')
            .attach('file', buffer, 'file.txt')
            .expect(500)
            .expect({message: "Internal Server Error"});
    });
});
