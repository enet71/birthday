import { AbstractControl, ValidationErrors } from '@angular/forms';

export class UiValidators {
  public static testUrl(value: string) {
    return /^((http|https):\/\/.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/g.test(
      value,
    );
  }

  public static url(
    errorMessage: string = 'Invalid url',
  ): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      return this.testUrl(control.value) ? null : { url: errorMessage };
    };
  }
}
