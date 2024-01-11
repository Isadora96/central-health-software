import IBM from "ibm-cos-sdk";
import * as makeLooger from "../logger/logger";

const logger = makeLooger.default;

const config = {
    endpoint: process.env.BUCKET_ENDPOINT,
    apiKeyId: process.env.IBM_API_KEY_ID,
    serviceInstanceId: process.env.IBM_SERVICE_INSTANCE_ID,
    signatureVersion: 'iam',
    ibmAuthEnpoint: process.env.IBM_AUTH_ENDPOINT,
};

const cos = new IBM.S3(config);

export class Bucket {

    static createTextFile(itemName: string, fileText: any) {
        logger.info({
            type: 'LOG_TYPE_BUCKET',
            message: `File ${itemName} created!` 
        });
        return cos.putObject({
            Bucket: process.env.BUCKET_NAME!,
            Key: itemName,
            Body: fileText
        }).promise();
    }

    static getObjects() {
        return cos.listObjects({
            Bucket: process.env.BUCKET_NAME!
        })
        .promise();
    }

    static getItem(itemName: string) {
        logger.info({
            type: 'LOG_TYPE_BUCKET',
            message: `Retrieving item from bucket. Key: ${itemName}` 
        });
        return cos.getObject({
            Bucket: process.env.BUCKET_NAME!,
            Key: itemName
        }).promise();
    }

    static updateItem(itemName: string, fileText: any) {
        logger.info({
            type: 'LOG_TYPE_BUCKET',
            message: `Updating item from bucket. Key: ${itemName}` 
        });
        return cos.putObject({
            Bucket: process.env.BUCKET_NAME!,
            Key: itemName,
            Body: fileText
        }).promise();
    }

    async deleteItem(bucketName: string, itemName: string) {
        await cos.deleteObject({
            Bucket: bucketName,
            Key: itemName
        }).promise();
    }
}
