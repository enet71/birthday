import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
} from '@angular/forms';

export type FormValue<T> = FormObjectValue<FormValueType<T>>;

type FormObjectValue<T> = {
  [K in keyof T]?: FormValueType<T[K]>;
};

type FormValueType<T> =
  T extends FormGroup<infer TValue>
    ? FormValue<TValue>
    : T extends FormArray<infer TValue>
      ? FormValue<TValue[]>
      : T extends FormControl<infer TValue>
        ? TValue
        : T extends AbstractControl<infer TValue>
          ? TValue
          : T;

export type FormRawValue<T> = FormRawObjectValue<FormRawValueType<T>>;

type FormRawObjectValue<T> = {
  [K in keyof T]: FormRawValueType<T[K]>;
};

type FormRawValueType<T> =
  T extends FormGroup<infer TValue>
    ? FormRawValue<TValue>
    : T extends FormArray<infer TValue>
      ? FormRawValue<TValue[]>
      : T extends FormControl<infer TValue>
        ? TValue
        : T extends AbstractControl<unknown, infer TValue>
          ? TValue
          : T;
