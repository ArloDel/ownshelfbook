import { focusDuration } from '../../src/ui/scene/CameraFocus';

test('camera flies normally and jumps when the user asks for less motion', () => {
  expect(focusDuration(false)).toBeCloseTo(0.7);
  expect(focusDuration(true)).toBe(0);
});
