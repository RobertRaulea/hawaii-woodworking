import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '../../src/components/ui/empty.tsx';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '../../src/components/ui/field.tsx';
import { Input } from '../../src/components/ui/input.tsx';
import { Spinner } from '../../src/components/ui/spinner.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../src/components/ui/tabs.tsx';

it('Spinner exposes a status role and spins', () => {
  render(<Spinner />);
  const spinner = screen.getByRole('status', { name: 'Loading' });
  assert.ok(spinner.getAttribute('class')?.includes('animate-spin'));
});

it('Tabs switch the visible panel when a trigger is clicked', async () => {
  render(
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">Prima</TabsTrigger>
        <TabsTrigger value="b">A doua</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panou A</TabsContent>
      <TabsContent value="b">Panou B</TabsContent>
    </Tabs>,
  );
  assert.equal(
    screen.getByRole('tab', { name: 'Prima' }).getAttribute('aria-selected'),
    'true',
  );
  assert.ok(screen.getByText('Panou A'));
  assert.equal(screen.queryByText('Panou B'), null);
  await userEvent.setup().click(screen.getByRole('tab', { name: 'A doua' }));
  assert.ok(screen.getByRole('tabpanel').textContent?.includes('Panou B'));
  assert.equal(screen.queryByText('Panou A'), null);
});

it('Field associates its label and shows an invalid error', () => {
  render(
    <Field data-invalid="true">
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" aria-invalid="true" />
      <FieldDescription>Folosit pentru confirmare.</FieldDescription>
      <FieldError errors={[{ message: 'Email invalid' }]} />
    </Field>,
  );
  const input = screen.getByRole('textbox', { name: 'Email' });
  assert.equal(input.getAttribute('id'), 'email');
  assert.equal(screen.getByRole('group').getAttribute('data-invalid'), 'true');
  assert.equal(screen.getByRole('alert').textContent, 'Email invalid');
  assert.ok(screen.getByText('Folosit pentru confirmare.'));
});

it('FieldError renders nothing without errors', () => {
  render(<FieldError errors={[]} />);
  assert.equal(screen.queryByRole('alert'), null);
});

it('Empty renders its title and description', () => {
  render(
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Niciun produs</EmptyTitle>
        <EmptyDescription>Adaugă primul produs.</EmptyDescription>
      </EmptyHeader>
    </Empty>,
  );
  assert.ok(screen.getByText('Niciun produs'));
  assert.ok(screen.getByText('Adaugă primul produs.'));
});
