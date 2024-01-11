import request from "supertest";
import { app } from "../../app";
import { CloudantClient } from "../../src/api/config/db";
import { Bucket } from "../../src/api/config/bucket";

jest.mock('@ibm-cloud/cloudant', () => ({
    ...jest.requireActual('@ibm-cloud/cloudant'),
    IamAuthenticator: jest.fn().mockReturnValue({ foo: 'bar' }),
    CloudantV1: jest.fn().mockReturnValue({ foo: 'bar' }),
}));

jest.mock("../../src/api/config/db");
jest.mock("../../src/api/config/bucket");

describe('GET - Treatment', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns data for bucket and db', async () => {

        let mockQueryResult = {
            result: { 
                docs: [
                    {
                        cid: "some-cid", 
                        cured: "cured", 
                        patient: { 
                            birth: "00/00/0000", 
                            gender: "gender", 
                            symptoms: "symptoms",
                            _id: "some-id"
                        }
                    }
                ]
            } 
        };

        let mockFinalResponse = {
            "cid": "some-cid",
            "cured": "cured",
            "patient": {
                "birth": "00/00/0000",
                "gender": "gender",
                "symptoms": "symptoms"
            },
            "treatment": "treatment"
        }

        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.resolve({Contents: [{Key: "some-id"}]}));
        Bucket.getItem = jest.fn().mockImplementation(() => Promise.resolve("treatment"));
        let doc = new CloudantClient('doctors');
        doc.query = jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))

        try {
            const values = await Promise.all([
                (await Bucket.getObjects()).Contents, 
                (await doc.query(
                        {"cid": '10', "cured": 'cured'}, 
                        ["cid", "cured","patient._id","patient.birth","patient.gender", "patient.symptoms"],
                        1
                    )
                ).result
            ])
            expect(values[1].docs).toBe(mockQueryResult.result.docs);
            expect(values[0]).toHaveLength(1);
            const filesContent = [{ id: 'some-id', content: (await Bucket.getItem('some-id')) }];
            const file = await Promise.all(filesContent)
            values[1].docs[0].treatment = file[0].content
            delete values[1].docs[0].patient._id
            expect(values[1].docs[0]).toStrictEqual(mockFinalResponse)
        } catch(e) {
            console.log(e)
        }
    });

    it('returns 404 not found', async () => {
            //@ts-ignore
        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.reject(
            { status: 404, result: { error: "not_found", reason: "not_found"}}
        ));
        await request(app)
            .get('/api/v1/treatment')
            .expect(404)
            .expect({ success: false, message: "not_found" });
    });

    it('returns 500 if any error', async () => {
            //@ts-ignore
        Bucket.getObjects = jest.fn().mockImplementation(() => Promise.reject({ status: 500}));
        await request(app)
            .get('/api/v1/treatment')
            .expect(500)
            .expect({message: "Internal Server Error" });
    });
});
