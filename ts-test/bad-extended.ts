
class BadDataType {
  name: number;
  bar (): number {
    return 1;
  }
}

export default function create() {
  return new BadDataType();
}
