import request from "supertest";
import { app } from "../../app";
import { CloudantClient } from "../../src/api/config/db";
import jwt from "jsonwebtoken";
import protect from "../../src/api/middleware/auth";

jest.mock('jsonwebtoken', () => ({
    ...jest.requireActual('jsonwebtoken'), // import and retain the original functionalities
    verify: jest.fn().mockReturnValue({ uid: '00000' }), // overwrite verify
}));

jest.mock('@ibm-cloud/cloudant', () => ({
    ...jest.requireActual('@ibm-cloud/cloudant'),
    IamAuthenticator: jest.fn().mockReturnValue({ foo: 'bar' }),
    CloudantV1: jest.fn().mockReturnValue({ foo: 'bar' }),
}));

jest.mock("../../src/api/config/db");

const verify = jwt.verify as unknown as jest.MockedFunction<typeof protect>


describe('GET - Patients', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if no token provided', async () => {
            //@ts-ignore
        verify.mockReturnValue({ non_uid: '' });

         await request(app)
            .get('/api/v1/patient')
            .expect(401)
            .expect("Not authorized to access this route");
    });

    it('returns 403 if currentUser uid does not match patient doctor_uid', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [{ doctor_uid: '000000' }] } })
            }
        });

         await request(app)
            .get('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(403)
            .expect({ 
                success: false, 
                message: 'Unauthorized. Patients does not correspond with doctor 005555' 
        });

    });

    it('returns 200 ok if currentUser uid match patient doctor_uid', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue(
                    { result: 
                        { 
                            docs: [
                                { 
                                    _id: "some_id", 
                                    _rev: "some_rev", 
                                    name: "Test test", 
                                    identity: "000-00", 
                                    birth: "00/00/0000",
                                    gender: "feminine",
                                    symptoms: "headache",
                                    doctor_uid: '005555', 
                                    created_at: "Sat, 28 Oct 2023 20:35:35 GMT" 
                                }
                            ] 
                        } 
                    }
                )
            }
        });

        await request(app)
            .get('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(200)
            .expect({ 
                success: true, 
                data: [
                    {
                      _id: 'some_id',
                      _rev: 'some_rev',
                      name: 'Test test',
                      identity: '000-00',
                      birth: '00/00/0000',
                      gender: 'feminine',
                      symptoms: 'headache',
                      doctor_uid: '005555',
                      created_at: 'Sat, 28 Oct 2023 20:35:35 GMT'
                    }
                  ]
            });
    });

    it('returns 200 ok if result is empty', async () => {
        //@ts-ignore
        verify.mockReturnValue({ uid: '0000' });
        //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                query: jest.fn().mockReturnValue({ result: { docs: [] } })
            }
        });
         await request(app)
            .get('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(200)
            .expect({
                "success": true,
                "data": []
            });
    });

    it('returns 500 if any error', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                    query: jest.fn().mockRejectedValue({})
            }
        });
        await request(app)
            .get('/api/v1/patient')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(500)
            .expect({message: "Internal Server Error"});
    });
});

describe('GET - Patient id', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if no token provided', async () => {
        //@ts-ignore
        verify.mockReturnValue({ non_uid: '' });
        await request(app)
            .get('/api/v1/patient/some_id')
            .expect(401)
            .expect("Not authorized to access this route");
    });

    it('returns 403 if currentUser uid does not match patient doctor_uid', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                get: jest.fn().mockReturnValue({
                    status: 200,
                    result: {
                        doctor_uid: 'some_uid'
                  }
                })
            }
        });

         await request(app)
            .get('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(403)
            .expect({ 
                success: false, 
                message: 'You are not authorized to access this patient' 
        });

    });

    it('returns 200 ok if currentUser uid match patient doctor_uid', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                get: jest.fn().mockReturnValue({
                        status: 200,
                        result: {
                            _id: 'some_id',
                            _rev: 'some_rev',
                            name: 'Name LastName',
                            identity: '000000-00',
                            birth: '00/00/00000',
                            gender: 'feminine',
                            symptoms: 'headache',
                            doctor_uid: '005555'
                        }
                    }
                )
            }
        });

        await request(app)
            .get('/api/v1/patient/some_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(200)
            .expect({ 
                success: true, 
                data: {
                        _id: 'some_id',
                        _rev: 'some_rev',
                        name: 'Name LastName',
                        identity: '000000-00',
                        birth: '00/00/00000',
                        gender: 'feminine',
                        symptoms: 'headache',
                        doctor_uid: '005555'
                    }
            });
    });

    it('returns 500 if any error', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                    query: jest.fn().mockRejectedValue({})
            }
        });
        await request(app)
            .get('/api/v1/patient/:id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(500)
            .expect({message: "Internal Server Error"});
    });

    it('returns 404 if patient not found', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                    get: jest.fn().mockRejectedValue({
                        status: 404,
                        result: {
                            error: "not_found"
                        }
                    })
            }
        });
        await request(app)
            .get('/api/v1/patient/some_invalid_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(404)
            .expect({ success: false, response: `Patient not found with id of some_invalid_id` });
    });

    it('returns 500 if any error catch block', async () => {
            //@ts-ignore
        verify.mockReturnValue({ uid: '005555' });
            //@ts-ignore
        jest.mocked(CloudantClient).mockImplementation(() => {
            return {
                    get: jest.fn().mockRejectedValue({
                        result: {
                            error: "some_error"
                        }
                    })
            }
        });
        await request(app)
            .get('/api/v1/patient/some_invalid_id')
            .set('Authorization', `Bearer: fakeToken`)
            .expect(500)
            .expect({ message: 'Internal Server Error' });
    });
});
