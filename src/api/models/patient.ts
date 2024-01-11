import { File } from "./file";

export class Patient {
    _id?: string;
    _rev?: string;
    name: string;
    identity: string;
    birth: string;
    gender: string;
    symptoms: string;
    created_at: string;
    doctor_uid: string;
  
    constructor(
      name: string,
      identity: string,
      birth: string,
      gender: string,
      symptoms: string,
      doctor_uid: string
    ) {
      this.name = name;
      this.identity = identity;
      this.birth = birth;
      this.gender = gender;
      this.symptoms = symptoms;
      this.doctor_uid = doctor_uid;
      this.created_at = new Date().toUTCString();
    }
}

export class PatientTreatment {
  doctorUid: string;
  file_treatment: File;
  patient: Object;
  cid: string;
  cured?: string;
  created_at: string;

  constructor(
    doctorUid: string,
    patient: Object,
    cid: string,
    obj: { name: string; size: number; },
    cured?: string
  ) {
    this.doctorUid = doctorUid;
    this.patient = patient;
    this.cid = cid;
    this.cured = cured;
    this.file_treatment = new File(obj);
    this.created_at = new Date().toUTCString();
  }
}

