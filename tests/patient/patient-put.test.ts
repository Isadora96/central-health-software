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

describe('PUT - Patient', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if no token provided', async () => {
        //@ts-ignore
        verify.mockReturnValue({ non_uid: '' });
        await request(app)
            .put('/api/v1/patient/some_id')
            .expect(401)
            .expect("Not authorized to access this route");
    });

    it('returns 200 ok when updating patient', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });
        //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [{ doctor_uid: '0000' }] } }),
                update: jest.fn().mockReturnValue({ status: 201, result: { 
                    "ok": true,
                    "id": "some-id",
                    "rev": "some-rev"
                }})
            }
        });

         await request(app)
            .put('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(200)
            .expect({
                success: true,
                data: {
                    "ok": true,
                    "id": "some-id",
                    "rev": "some-rev"
                }
            });
    });

    it('returns 403 if currentUser uid does not match patient doctor_uid', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [{ doctor_uid: '0000' }] } })
            }
        });
        await request(app)
            .put('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(403)
            .expect({ success: false, message: 'You are not authorized to update this patient'});
    });

    it('returns 500 if any error trying update', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [{ doctor_uid: '005555' }] } }),
                update: jest.fn().mockRejectedValue({
                    status: 500
                })
            }
        });
        await request(app)
            .put('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(500)
            .expect({message: "Internal Server Error"});
    });

    it('returns 404 if patient not found', async () => {
            //@ts-ignore
        jwt.verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } })
            }
        });

        await request(app)
            .put('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(404)
            .expect({ success: false, message: `Patient id some_id not found`});
    });

    it('returns 500 if any error trying query', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                    query: jest.fn().mockRejectedValue({}),
            }
        });
        await request(app)
            .put('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(500)
            .expect({message: "Internal Server Error"});
    });

    it('returns 409 conflict', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });
        //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [{ doctor_uid: '0000' }] } }),
                update: jest.fn().mockRejectedValue({ status: 409, 
                    result: {
                        reason: "conflict"
                    }
                })
            }
        });

         await request(app)
            .put('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(409)
            .expect({
                success: false,
                message: "conflict"
            });
    });
});