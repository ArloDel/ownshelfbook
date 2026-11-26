import { isClick } from '../../src/ui/scene/clicks';

test('a pointer that barely moved is a click; a drag is not', () => {
  expect(isClick({ delta: 0 })).toBe(true);
  expect(isClick({ delta: 2 })).toBe(true);
  expect(isClick({ delta: 3 })).toBe(false);
});

import { hitFirst } from '../../src/ui/scene/clicks';

test('an object counts as clicked only when it is the nearest thing under the pointer', () => {
  const floor = {};
  const shelf = {};
  expect(hitFirst({ object: floor, intersections: [{ object: floor }] })).toBe(true);
  expect(hitFirst({ object: floor, intersections: [{ object: shelf }, { object: floor }] })).toBe(false);
});
