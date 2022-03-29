
export class TestDataType {
  name: string = 'Test'
  eval (): number {
    return undefined;
  }
}

export default function create() {
  return new TestDataType();
}

export function create2() {
  return new TestDataType();
}
