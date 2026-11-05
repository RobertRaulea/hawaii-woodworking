import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { OptionSelect } from '../../src/components/OptionSelect';
import { AdminDialog } from '../../src/components/AdminDialog/AdminDialog';
import { FieldError } from '../../src/components/ui/field';
import { pickOption } from './optionSelect.helpers';

const OPTIONS = [
 { value: '', label: 'Toate' },
 { value: 'a', label: 'Varianta A' },
 { value: 'b', label: 'Varianta B' },
];

it('OptionSelect afișează placeholder-ul când valoarea nu are opțiune', async () => {
 render(
 <OptionSelect
 value=""
 onValueChange={() => {}}
 placeholder="Selectează…"
 options={OPTIONS.slice(1)}
 />,
 );
 const trigger = screen.getByRole('combobox');
 assert.equal(trigger.textContent, 'Selectează…');
});

it('OptionSelect emite valoarea vidă pentru opțiunea cu value=""', async () => {
 const onValueChange = mock.fn<(value: string) => void>(() => {});
 const user = userEvent.setup();
 render(
 <OptionSelect
 value="a"
 onValueChange={onValueChange}
 options={OPTIONS}
 />,
 );
 await pickOption(user, screen.getByRole('combobox'), 'Toate');
 assert.equal(onValueChange.mock.calls.at(-1)?.arguments[0], '');
});

it('OptionSelect selectează o opțiune și o afișează', async () => {
 const Controlled = () => {
 const [value, setValue] = useState('');
 return (
 <OptionSelect
 value={value}
 onValueChange={setValue}
 options={OPTIONS}
 />
 );
 };
 const user = userEvent.setup();
 render(<Controlled />);
 await pickOption(user, screen.getByRole('combobox'), 'Varianta B');
 assert.equal(screen.getByRole('combobox').textContent, 'Varianta B');
});

it('OptionSelect dezactivat nu deschide lista', async () => {
 const user = userEvent.setup();
 render(
 <OptionSelect
 value="a"
 onValueChange={() => {}}
 disabled
 options={OPTIONS}
 />,
 );
 const trigger = screen.getByRole('combobox');
 assert.equal(trigger.getAttribute('data-disabled'), '');
 await user.click(trigger);
 assert.equal(screen.queryByRole('listbox'), null);
});

it('OptionSelect funcționează cu react-hook-form Controller și regula required', async () => {
 type Fields = { kind: string };
 const Harness = () => {
 const { control, handleSubmit, formState: { errors } } = useForm<Fields>({
 defaultValues: { kind: '' },
 });
 return (
 <form
 onSubmit={handleSubmit(() => {})}
 aria-label="formular"
 >
 <Controller
 name="kind"
 control={control}
 rules={{ required: 'Selectează un tip.' }}
 render={({ field }) => (
 <OptionSelect
 id="kind"
 value={field.value}
 onValueChange={field.onChange}
 options={OPTIONS.slice(1)}
 placeholder="Selectează…"
 />
 )}
 />
 {errors.kind ? (
 <FieldError>{errors.kind.message}</FieldError>
 ) : null}
 <button type="submit">Salvează</button>
 </form>
 );
 };
 const user = userEvent.setup();
 render(<Harness />);
 await user.click(screen.getByRole('button', { name: 'Salvează' }));
 await screen.findByText('Selectează un tip.');
 await pickOption(user, screen.getByRole('combobox'), 'Varianta A');
 await user.click(screen.getByRole('button', { name: 'Salvează' }));
 await waitFor(() =>
 assert.equal(screen.queryByText('Selectează un tip.'), null),
 );
});

it('OptionSelect se deschide și selectează în interiorul AdminDialog', async () => {
 const onValueChange = mock.fn<(value: string) => void>(() => {});
 const user = userEvent.setup();
 render(
 <AdminDialog title="Dialog" onClose={() => {}}>
 <OptionSelect
 value="a"
 onValueChange={onValueChange}
 options={OPTIONS.slice(1)}
 />
 </AdminDialog>,
 );
 const dialog = await screen.findByRole('dialog');
 assert.ok(dialog);
 await user.click(screen.getByRole('combobox'));
 const option = await screen.findByRole('option', { name: 'Varianta B' });
 await user.click(option);
 assert.equal(onValueChange.mock.calls.at(-1)?.arguments[0], 'b');
});
