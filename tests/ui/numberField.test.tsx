import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { NumberField } from '../../src/ui/common/NumberField';

function Clamped() {
  const [v, setV] = useState(69);
  return <NumberField label="Lebar" value={v} onChange={(n) => setV(Math.min(n, 69))} />;
}

test('shows the value the parent kept when it clamps further', async () => {
  const user = userEvent.setup();
  render(<Clamped />);
  const field = screen.getByLabelText('Lebar');
  await user.clear(field);
  await user.type(field, '100{Enter}');
  expect(field).toHaveValue('69');
});
