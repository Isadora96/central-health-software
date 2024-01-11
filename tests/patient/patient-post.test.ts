import request from "supertest";
import { app } from "../../app";
import { CloudantClient } from "../../src/api/config/db";
import jwt from "jsonwebtoken";
import protect from "../../src/api/middleware/auth";

jest.mock('jsonwebtoken', () => ({
    ...jest.requireActual('jsonwebtoken'), // import and retain the original functionalities
    verify: jest.fn().mockReturnValue({ uid: '00000' }), // overwrite verify
}));

jest.mock("../../src/api/config/db");

const verify = jwt.verify as unknown as jest.MockedFunction<typeof protect>

const payload = { name: 'some_name', gender: "some_gender", symptoms: "symptoms", identity: "0000", birth: "00/00/0000"};

describe('POST - Patient', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if no token provided', async () => {
        //@ts-ignore
        verify.mockReturnValue({ non_uid: '' });
        await request(app)
            .post('/api/v1/patient')
            .expect(401)
            .expect("Not authorized to access this route");
    });

    it('returns 400 if any body data missing ', async () => {
        //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '005555' });
        const payload = { name: 'some_name', gender: "some_gender", symptoms: "symptoms", identity: "0000"};

         await request(app)
            .post('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .send(payload)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(400)
            .expect({ success: false, missing_data: 'name, gender, symptoms, identity or birth'});

    });

    it('returns 400 if patient already exist in db', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue(
                    { result: 
                        { 
                            docs: [
                                { 
                                    identity: "000-00", 
                                    _id: "some-id"
                                }
                            ] 
                        } 
                    }
                )
            }
        });

        await request(app)
            .post('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .send(payload)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(400)
            .expect({ success: false, message: `Patient already exists! ID: some-id`  });
    });

    it('returns 500 if any error after query', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                    query: jest.fn().mockRejectedValue({})
            }
        });
        await request(app)
            .post('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .send(payload)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(500)
            .expect({message: "Internal Server Error"});
    });

    it('returns 201 created when creating new patient', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });
        //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } }),
                insert: jest.fn().mockReturnValue({ status: 201, 
                    result: { 
                        "ok": true,
                        "id": "some-id",
                        "rev": "some-rev"
                }})
            }
        });

         await request(app)
            .post('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .send(payload)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(201)
            .expect({
                success: true,
                data: {
                    "ok": true,
                    "id": "some-id",
                    "rev": "some-rev"
                }
            });
    });

    it('returns 500 if any error after insert', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                    query: jest.fn().mockRejectedValue({}),
                    insert: jest.fn().mockRejectedValue({})
            }
        });

        await request(app)
            .post('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .send(payload)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(500)
            .expect({message: "Internal Server Error"});
    });

    it('returns 404 not found', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });
        //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } }),
                insert: jest.fn().mockRejectedValue({ status: 404, 
                    result: {
                        error: "not_found",
                        reason: "not_found"
                    }
                })
            }
        });

         await request(app)
            .post('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .send(payload)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(404)
            .expect({
                success: false,
                message: "not_found"
            });
    });

    it('returns 500 if any error after insert catch block', async () => {
        //@ts-ignore
    verify.mockReturnValue({ uid: '005555' });
        //@ts-ignore
    jest.mocked(CloudantClient).mockImplementation(() => {
        return {
                query: jest.fn().mockRejectedValue({}),
                insert: jest.fn().mockRejectedValue({})
        }
    });

    await request(app)
        .post('/api/v1/patient')
        .set('Authorization', `Bearer: fakeToken`)
        .send(payload)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .expect(500)
        .expect({message: "Internal Server Error"});
    });
});