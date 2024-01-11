### Project developed for the program WTech Upskilling, in Ladies in Tech IBM Community. 
`
* WTech Upskilling was another training provided by the Ladies in Tech community, and aimed to accelerate the development of regular professionals with up to two years of experience in technical areas, indicated by their managers.

* The entire project was developed with market technologies (Node.js, typescript, passport) and also those used at IBM, such as LogAnalysis and CloudantDB. This repository is the finalized software delivered as a requirement for completing the training.

* In order to improve the software and my knowledge, this project will undergo some modifications during 2024.

  1. Divide functionalities into microservices.
  2. Build the front-end.
  3. Enable anyone to interact with the software (currently only IBM employees can)
  4. Make the application go live.
     
`

# CENTRAL HEALTH SOFTWARE

`CHST is a system made for hospitals in the state of São Paulo for patient registration. Its main objective is to collect data on cases of diseases that have been successfully treated in order to make treatment available to all hospitals in the state.`

## Resources 
 - [CIO Cloud Services Login Service](https://github.ibm.com/CIOCloud/login)
 - [Passport](https://www.passportjs.org/packages/passport-openidconnect/)
 - [IBM Object Store](https://cloud.ibm.com/apidocs/cos/cos-compatibility?code=node)
 - [IBM Cloudant DB](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-client-libraries#client-libraries)
 - LogDNA
    - [Repository](https://github.com/LcsK/melhorando-logs-do-nodejs-com-typescript-pinojs-logdna-2021-09-13/tree/final)
    - [Installation](https://www.npmjs.com/package/pino-logdna)
 - [Swagger](https://swagger-autogen.github.io/docs/getting-started/quick-start)

### Technologies
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)


## Getting Started

### Prerequisites

`Node.js 18`


### On root folder

- Copy file `.env-example` into a `.env` file
- Fill the env variables in `.env`
- Copy `key.pem` and `cert.pem`
- Set ENV to local
- Run `export $(cat .env | xargs)` in order to export the environment variables
- Run `npm install --include=dev` to install all dependencies
- Run `npm start` to start the server.

### Application will be running under `https://localhost:8080/`.

## Authenticate route
### Navigate to the following URL at your browser:

`https://localhost:8080`

### Then you should be redirect to:

`https://localhost:8080/auth/sso/callback`

### Sign in with your w3id credentials, you will see the token on the page

```
{
    "authenticated":true,"token":"some_jwt_token"
}
```

## API Reference Example

- ​Up to date documentation in details is available at Swagger.
- Provide ` Authorization - Bearer ` token in header

```http
  GET /api/v1/patient/${id}
```

| Parameter   | Type       | Description                                   |
| :---------- | :--------- | :------------------------------------------ |
| `id`      | `string` | Get a specific patient id |

### Running Tests

To run tests, run the following command

![Coverage_lines_ 75 56%](https://media.github.ibm.com/user/431521/files/d9870053-46d7-43b5-a397-7786cc69ac49)

```bash
    export $(cat .env | xargs)
    npm run test or npm run test:coverage
```
