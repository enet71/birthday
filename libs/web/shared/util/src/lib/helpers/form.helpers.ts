import { AbstractControl } from '@angular/forms';
import { effect, EffectRef, Signal, WritableSignal } from '@angular/core';
import { map, startWith, Subscription } from 'rxjs';
import { FormRawValue } from '../types';

export type SignalFormValueChangeKey<TValue extends object> = keyof TValue;

export interface SignalFormValueChange<
  TValue extends object,
  TKey extends
    SignalFormValueChangeKey<TValue> = SignalFormValueChangeKey<TValue>,
> {
  key: TKey;
  previousValue: TValue[TKey];
  currentValue: TValue[TKey];
}

export function createFormValueEffect<T>(
  formSignal: Signal<AbstractControl<T> | null>,
  valueSignal: WritableSignal<FormRawValue<T> | null>,
): EffectRef {
  let formValuesChangesSub: Subscription;

  return effect(() => {
    formValuesChangesSub?.unsubscribe();

    const form: AbstractControl<T> | null = formSignal();

    if (!form) {
      return;
    }

    formValuesChangesSub = form.valueChanges
      .pipe(
        map(() => form.getRawValue()),
        startWith(form.getRawValue()),
      )
      .subscribe((value: FormRawValue<T>) => {
        valueSignal.set(value);
      });
  });
}

export function createSignalFormValueChangeEffect<TValue extends object>(
  formValue: Signal<TValue>,
  callback: (change: SignalFormValueChange<TValue>) => void,
): EffectRef {
  let previousValue: TValue = formValue();

  return effect(() => {
    const currentValue: TValue = formValue();
    const changes: SignalFormValueChange<TValue>[] = getSignalFormValueChanges(
      previousValue,
      currentValue,
    );
    previousValue = currentValue;
    changes.forEach((change: SignalFormValueChange<TValue>) =>
      callback(change),
    );
  });
}

function getSignalFormValueChanges<TValue extends object>(
  previousValue: TValue,
  currentValue: TValue,
): SignalFormValueChange<TValue>[] {
  return (
    Object.keys(currentValue) as SignalFormValueChangeKey<TValue>[]
  ).reduce(
    (
      changes: SignalFormValueChange<TValue>[],
      key: SignalFormValueChangeKey<TValue>,
    ) => {
      if (previousValue[key] === currentValue[key]) {
        return changes;
      }

      changes.push({
        key,
        previousValue: previousValue[key],
        currentValue: currentValue[key],
      });

      return changes;
    },
    [],
  );
}
