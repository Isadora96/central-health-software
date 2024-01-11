import { CloudantV1, IamAuthenticator } from "@ibm-cloud/cloudant";
import * as makeLooger from "../logger/logger";

const logger = makeLooger.default;

export class CloudantClient {
    private client!: CloudantV1;
    private readonly _dbName: string;

    constructor(dbName: string) {
      this._dbName = dbName
      try {
        const authenticator = new IamAuthenticator({
            apikey: process.env.API_KEY_CLOUNDANT!
        });

        this.client = new CloudantV1({authenticator});

        this.client.setServiceUrl(process.env.CLOUDANT_URL!);

      } catch (error) {
        logger.error({
          type: 'LOG_TYPE_DB',
          message: `Error conecting db, ${error}`
        });
      }
    }

  
    public async get(docId: string) {
      const getDocParams: CloudantV1.GetDocumentParams = {
        db: this._dbName,
        docId: docId,
      };
  
      return await this.client.getDocument(getDocParams);
    }

    public async insert(document: CloudantV1.Document) {
      return await this.client.postDocument({
        db: this._dbName,
        document: document,
      });
    }

    public async query(
      selector: CloudantV1.JsonObject,
      fields: string[],
      limit: number
    ) {
      return this.client.postFind({
        db: this._dbName,
        selector,
        fields,
        limit,
      });
    }

    public async update(id: string, document: CloudantV1.Document) {
      return await this.client.putDocument({
        db: this._dbName,
        docId: id,
        document: document,
      });
    }

    public async delete(id: string, rev: string) {
      return await this.client.deleteDocument({
        db: this._dbName,
        docId: id,
        rev: rev,
      });
    }

    public async dbInfo() {
      return await this.client.getDatabaseInformation({
        db: this._dbName,
      });
    }
}
