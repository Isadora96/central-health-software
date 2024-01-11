import { app } from "./app";
import fs from "fs";
import https from "https";

const startLog = () => {
    console.log(
      `Login server is running ${(process.env.ENV == 'local') ? 
      `at https://localhost:${process.env.PORT}` : ''} ` +
      `in ${app.get('env')} mode`,
    );
    console.log('Press CTRL-C to stop\n');

  };

const server = (process.env.ENV == 'local') ?
  https.createServer({
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
    requestCert: false,
    rejectUnauthorized: false,
  }, app).listen(app.get("port"), startLog) :
  app.listen(app.get("port"), startLog);

export default server;