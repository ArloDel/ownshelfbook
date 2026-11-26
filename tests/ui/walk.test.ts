import { createShelf, shelfSize } from '../../src/domain/shelves';
import { eyeHeightCm, isBlocked, look, moveWithCollision, startPoint, stepToward } from '../../src/ui/scene/walk';

const room = { widthCm: 500, depthCm: 400, heightCm: 260 };

test('eyes at 160 cm, lower in a low room', () => {
  expect(eyeHeightCm(room)).toBe(160);
  expect(eyeHeightCm({ ...room, heightCm: 150 })).toBe(130);
});

describe('isBlocked', () => {
  const kubus = createShelf('kubus', 'K');
  const { width, depth } = shelfSize(kubus);

  test('walls keep a 25 cm body inside the room', () => {
    expect(isBlocked({ x: 0, z: 0 }, room, [])).toBe(false);
    expect(isBlocked({ x: 240, z: 0 }, room, [])).toBe(true);
    expect(isBlocked({ x: 220, z: 0 }, room, [])).toBe(false);
  });

  test('a shelf blocks its footprint plus the body radius', () => {
    expect(isBlocked({ x: 0, z: 0 }, room, [kubus])).toBe(true);
    expect(isBlocked({ x: 0, z: depth / 2 + 20 }, room, [kubus])).toBe(true);
    expect(isBlocked({ x: 0, z: depth / 2 + 30 }, room, [kubus])).toBe(false);
  });

  test('a turned shelf blocks its real footprint, not the box around it', () => {
    const turned = { ...kubus, rotationY: 45 };
    // Along the shelf's own length: blocked.
    const along = width / 2 - 5;
    const c = Math.cos(Math.PI / 4);
    expect(isBlocked({ x: along * c, z: -along * c }, room, [turned])).toBe(true);
    // Same distance along world x is off the turned footprint, though inside its bounding box.
    expect(isBlocked({ x: along, z: 0 }, room, [turned])).toBe(false);
  });
});

test('walking into a shelf slides along its side', () => {
  const kubus = createShelf('kubus', 'K');
  const p = moveWithCollision({ x: 0, z: 60 }, 10, -30, room, [kubus]);
  expect(p).toEqual({ x: 10, z: 60 });
});

describe('startPoint', () => {
  test('150 cm in front of the shelf nearest the middle, facing it', () => {
    const k = createShelf('kubus', 'K', { x: 0, z: -150 });
    const s = startPoint(room, [k]);
    expect(s.x).toBeCloseTo(0);
    expect(s.z).toBeCloseTo(0);
    expect(s.yaw).toBeCloseTo(0);
  });

  test('an empty room starts in the middle facing the back wall', () => {
    expect(startPoint(room, [])).toEqual({ x: 0, z: 0, yaw: 0 });
  });

  test('when the spot in front is blocked, the nearest free spot is used', () => {
    const small = { widthCm: 300, depthCm: 300, heightCm: 260 };
    const s = startPoint(small, [createShelf('kubus', 'K')]);
    expect(isBlocked(s, small, [createShelf('kubus', 'K')])).toBe(false);
  });

  test('a room with no free spot falls back to its middle', () => {
    const tiny = { widthCm: 60, depthCm: 60, heightCm: 260 };
    const s = startPoint(tiny, [createShelf('kubus', 'K')]);
    expect([s.x, s.z]).toEqual([0, 0]);
  });
});

test('looking up and down stops at 60 degrees', () => {
  const down = look(0, 0, 0, 10_000);
  expect(down.pitch).toBeCloseTo(-Math.PI / 3);
  const right = look(0, 0, 4, 0);
  expect(right.yaw).toBeCloseTo((-4 * 0.25 * Math.PI) / 180);
});

describe('stepToward', () => {
  test('takes at most one step', () => {
    expect(stepToward({ x: 0, z: 0 }, { x: 100, z: 0 }, 20)).toEqual({ pos: { x: 20, z: 0 }, done: false });
  });
  test('stops 30 cm before the spot', () => {
    expect(stepToward({ x: 60, z: 0 }, { x: 100, z: 0 }, 50)).toEqual({ pos: { x: 70, z: 0 }, done: true });
    expect(stepToward({ x: 75, z: 0 }, { x: 100, z: 0 }, 50)).toEqual({ pos: { x: 75, z: 0 }, done: true });
  });
});

import { isTypingTarget } from '../../src/ui/scene/walk';

test('keys typed into a text field do not walk; keys on a button do', () => {
  expect(isTypingTarget(document.createElement('input'))).toBe(true);
  expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
  const editable = document.createElement('div');
  editable.contentEditable = 'true';
  document.body.append(editable);
  expect(isTypingTarget(editable)).toBe(true);
  expect(isTypingTarget(document.createElement('button'))).toBe(false);
  expect(isTypingTarget(null)).toBe(false);
});
