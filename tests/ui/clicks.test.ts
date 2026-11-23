import { isClick } from '../../src/ui/scene/clicks';

test('a pointer that barely moved is a click; a drag is not', () => {
  expect(isClick({ delta: 0 })).toBe(true);
  expect(isClick({ delta: 2 })).toBe(true);
  expect(isClick({ delta: 3 })).toBe(false);
});
