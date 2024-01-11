export class File {
    name: string;
    mime_type: string;
    extension: string;
    size: number;
    constructor(obj: { name: string; size: number }) {
      obj = obj || {};
      this.name = obj.name;
      this.size = obj.size;
      this.mime_type = 'text/plain';
      this.extension = '.txt';
    }
}
