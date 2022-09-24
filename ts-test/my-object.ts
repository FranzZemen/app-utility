export class MyObject {
  constructor() {
  }
  name: string;
}

export function myObjectFactory(name: string): Promise<MyObject> {
  const myInstance: MyObject = new MyObject();
  myInstance.name = name;
  return Promise.resolve(myInstance);
}
